/**
 * Adapter penyedia "tmi" (tempmail.ing / Cloudflare Worker `api.tempmail.ing`).
 *
 * Kontras dengan mail.tm:
 *   - Alamat dibuat PIHAK SERVER, bentuk `mv<base32>@<domainacak>` — tidak ada
 *     nama custom, tidak ada password, tidak ada token.
 *   - Alamat MATI setelah `durationMinutes` (default server 10 menit).
 *   - Domain dirotasi oleh server (texttoimage.net, wanaivideogenerator.com,
 *     animateany.com, aniimate.net, ve0ai.com, animatimg.com, ...), jadi domain
 *     hanya bisa diketahui setelah alamat dibuat.
 *   - Inbox dibaca lewat `GET /api/emails/{alamat}` tanpa autentikasi.
 *     Siapa pun yang tahu alamat bisa membacanya — sama seperti layanan
 *     tempmail publik biasa.
 *   - `access-control-allow-origin: *` + `access-control-expose-headers: ETag`
 *     (terverifikasi), jadi browser boleh memanggil langsung. SENGAJA tidak
 *     lewat proxy Vercel: kuota generate hanya 2/menit per IP, dan lewat proxy
 *     akan semua pengguna berbagi kuota IP yang sama.
 *
 * Rate limit nyata (terverifikasi 2026-10-13):
 *   POST /api/generate  -> x-ratelimit-limit: 2, window 60s, policy "suspicious"
 *   GET  /api/emails/*  -> 12x cepat berturut-turut: tidak ada pembatasan, dan
 *                            If-None-Match dibalas 304 (hemat bandwidth).
 *   429 body: {"success":false,"error":"...","retryAfterSeconds":15}
 *
 * Semua panggilan dinaungi satu mutex + jendela kuota lokal: satu tab hanya
 * mengirim 1 generate per 32 detik, jadi tidak mungkin menyentuh batas 2/menit
 * kecuali pengguna membuka banyak tab.
 */

import { MailError, parseRate, type RateInfo } from "./errors";
import type { MessageDetail, MessageSummary } from "./types";

const BASE = "https://api.tempmail.ing";
const UA = "tempmail-inbox/2.0 (tempmail.ing)";

/** Daftar menit yang diterima server (terverifikasi: 5/10/15/20/30/60 lolos, 1440 dinormalkan ke 10). */
export const TMI_DURATIONS = [5, 10, 15, 20, 30, 60] as const;
export const TMI_DEFAULT_DURATION = 10;

/** Jarak minimum antar generate dari satu browser. Server 2/60s → 32s aman + ruang retry. */
const MIN_SPACING_MS = 32_000;
/** Beri ruang untuk tab lain / permintaan manual sebelum UI boleh menekan lagi. */
const QUOTA_MARGIN = 1;

export type TmiAddress = {
  address: string;
  /** Epoch ms. */
  expiresAt: number;
  createdAt: number;
  durationMinutes: number;
};

type RawEmail = {
  id: number | string;
  from_address?: string;
  from_name?: string;
  subject?: string;
  /** HTML kalau email punya bagian HTML; kalau tidak, isi teks polos. */
  content?: string;
  text?: string;
  received_at?: string;
  is_read?: number | boolean;
};

const isLikelyHtml = (s: string) => /<[a-z!/][^>]*>/i.test(s);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Petakan bentuk tempmail.ing ke bentuk yang dipakai UI (sama seperti mail.tm). */
function toSummary(raw: RawEmail): MessageSummary {
  const content = str(raw.content);
  const text = str(raw.text);
  // Server menaruh HTML di `content`. Kalau `text` kosong dan `content`
  // ber-HTML, HTML-nya ada di `content`; kalau tidak, pakai `text`.
  const html = isLikelyHtml(content) ? content : "";
  const plain = text || content || html;
  const previewSource = plain || html;
  return {
    id: String(raw.id ?? ""),
    from: { address: str(raw.from_address), name: str(raw.from_name) || undefined },
    to: [],
    subject: str(raw.subject),
    intro: previewSource.replace(/\s+/g, " ").trim().slice(0, 140),
    seen: raw.is_read === 1 || raw.is_read === true,
    hasAttachments: false,
    createdAt: str(raw.received_at) || new Date().toISOString(),
    /** isi lengkap sudah ikut di daftar inbox — lihat detailFrom */
    ...(html ? { html: [html] } : {}),
    ...(plain ? { text: plain } : {}),
  } as MessageSummary & Partial<MessageDetail>;
}

/**
 * Cache respons inbox terakhir. tempmail.ing tidak punya endpoint "satu
 * pesan" (GET /api/emails/{id} dianggap alamat dan dibalas inbox kosong),
 * jadi halaman detail dibaca dari hasil poll terakhir.
 */
const lastInbox = new Map<string, Map<string, MessageSummary & Partial<MessageDetail>>>();
const etags = new Map<string, string>();

let quota = { remaining: 2 as number | undefined, resetUnix: undefined as number | undefined };
let lastGenerateAt = 0;
let inFlight: Promise<TmiAddress> | null = null;

function rateHeaders(headers: Headers): RateInfo {
  const r = parseRate(headers);
  if (r.remaining !== undefined) quota.remaining = r.remaining;
  if (r.resetUnix !== undefined) quota.resetUnix = r.resetUnix;
  return r;
}

/** Berapa detik lagi tombol generate aman ditekan. 0 = siap. */
export function tmiWaitSeconds(now = Date.now()): number {
  const spacing = Math.max(0, MIN_SPACING_MS - (now - lastGenerateAt));
  const window = quota.resetUnix ? Math.max(0, quota.resetUnix * 1000 - now) : 0;
  const blockedByQuota = (quota.remaining ?? 2) <= QUOTA_MARGIN ? window : 0;
  return Math.ceil(Math.max(spacing, blockedByQuota) / 1000);
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ data: T; headers: Headers; status: number }> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
        ...init.headers,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new MailError("Tidak bisa menghubungi tempmail.ing.", 0, "tmi", true);
  }

  const rate = rateHeaders(res.headers);
  const raw = await res.text();

  // 304 Not Modified: bukan error — body kosong, pemanggil pakai cache lokal.
  if (res.status === 304) {
    return { data: null as T, headers: res.headers, status: 304 };
  }

  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const obj = (data ?? {}) as Record<string, unknown>;
    const retryAfterSec =
      (typeof obj.retryAfterSeconds === "number" && obj.retryAfterSeconds) ||
      (Number.parseInt(res.headers.get("retry-after") ?? "", 10) || undefined);
    const msg =
      (typeof obj.error === "string" && obj.error) ||
      (typeof obj.message === "string" && obj.message) ||
      (res.status === 429 ? "Terlalu sering membuat alamat. Tunggu sebentar." : `Gagal (${res.status})`);
    const err = new MailError(msg, res.status, "tmi", res.status >= 500, res.status === 429);
    err.retryAfterSec = retryAfterSec;
    err.rate = rate;
    if (retryAfterSec) quota.remaining = 0;
    throw err;
  }

  return { data: data as T, headers: res.headers, status: res.status };
}

/**
 * Buat satu alamat. Panggilan yang tumpang tindih digabung (mutex): dua klik
 * cepat = satu request sungguhan, dan jarak antar generate dijaga
 * MIN_SPACING_MS lewat jendela kuota lokal.
 */
export async function generateAddress(durationMinutes = TMI_DEFAULT_DURATION): Promise<TmiAddress> {
  if (inFlight) return inFlight;

  const wait = tmiWaitSeconds();
  if (wait > 0) {
    const err = new MailError(`Kuota tempmail.ing 2 alamat/menit. Tunggu ${wait} detik.`, 429, "tmi", false, true);
    err.retryAfterSec = wait;
    throw err;
  }

  const run = (async () => {
    lastGenerateAt = Date.now();
    const { data } = await call<{ success?: boolean; email?: RawEmail & Record<string, unknown> }>(
      "/api/generate",
      { method: "POST", body: { duration: durationMinutes } },
    );
    const e = data?.email;
    if (!e || typeof e.address !== "string") {
      throw new MailError("tempmail.ing tidak mengembalikan alamat.", 502, "tmi", true);
    }
    const created = Date.parse(str((e as Record<string, unknown>).createdAt)) || Date.now();
    const expires = Date.parse(str((e as Record<string, unknown>).expiresAt));
    const addr: TmiAddress = {
      address: e.address,
      expiresAt: Number.isFinite(expires) ? expires : created + durationMinutes * 60_000,
      createdAt: created,
      durationMinutes:
        typeof (e as Record<string, unknown>).durationMinutes === "number"
          ? ((e as Record<string, unknown>).durationMinutes as number)
          : durationMinutes,
    };
    quota.remaining = Math.max(0, (quota.remaining ?? 2) - 1);
    return addr;
  })().finally(() => {
    inFlight = null;
  });

  inFlight = run;
  return run;
}

export type TmiInbox = {
  messages: (MessageSummary & Partial<MessageDetail>)[];
  /** true = tidak ada perubahan sejak poll terakhir (HTTP 304). */
  unchanged: boolean;
};

/**
 * Baca inbox satu alamat. Kalau hasilnya identik (If-None-Match → 304),
 * `unchanged` true dan pemanggil boleh mempertahankan state lama.
 */
export async function fetchInbox(address: string): Promise<TmiInbox> {
  const etag = etags.get(address);
  const { data, headers, status } = await call<{ success?: boolean; emails?: RawEmail[] }>(
    `/api/emails/${encodeURIComponent(address)}`,
    { headers: etag ? { "If-None-Match": etag } : undefined },
  );

  // Tidak ada perubahan sejak poll terakhir → pakai cache, jangan reset state UI.
  if (status === 304) {
    const cached = lastInbox.get(address);
    return { messages: cached ? Array.from(cached.values()) : [], unchanged: true };
  }

  const nextEtag = headers.get("ETag");
  if (nextEtag) etags.set(address, nextEtag);

  if (!data?.success) {
    throw new MailError(
      typeof (data as Record<string, unknown>)?.error === "string"
        ? String((data as Record<string, unknown>).error)
        : "tempmail.ing menolak permintaan inbox.",
      502,
      "tmi",
      true,
    );
  }

  const messages = (Array.isArray(data.emails) ? data.emails : []).map(toSummary);
  const map = new Map<string, MessageSummary & Partial<MessageDetail>>();
  for (const m of messages) if (m.id) map.set(m.id, m);
  lastInbox.set(address, map);
  return { messages, unchanged: false };
}

/** Ambil isi lengkap satu pesan dari hasil poll terakhir (tidak ada endpoint detail). */
export function getMessageFromCache(address: string, id: string): MessageDetail | null {
  const hit = lastInbox.get(address)?.get(id);
  if (!hit) return null;
  return {
    ...hit,
    text: hit.text ?? "",
    html: hit.html ?? [],
  } as MessageDetail;
}

/**
 * Buang satu pesan dari kotak masuk. `id` = id numerik pesan, dan alamatnya
 * wajib ikut dikirim (server menolak kalau id bukan milik mailbox itu).
 */
export async function deleteMessage(id: string, address: string): Promise<boolean> {
  const { data } = await call<{ success?: boolean }>(`/api/emails/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: { emailAddress: address },
  });
  if (data?.success) {
    lastInbox.get(address)?.delete(id);
    etags.delete(address);
  }
  return !!data?.success;
}

/** Probe ringan sisi server: health check + baca inbox alamat umpan tanpa memakai kuota generate. */
export async function probe(): Promise<{ ok: boolean; status: number; detail: string }> {
  try {
    const res = await fetch(`${BASE}/health`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
      signal: AbortSignal.timeout(9_000),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, detail: res.ok ? "" : text.slice(0, 160) };
  } catch (err) {
    return { ok: false, status: 0, detail: err instanceof Error ? err.message : String(err) };
  }
}

export const TMI_BASE = BASE;
