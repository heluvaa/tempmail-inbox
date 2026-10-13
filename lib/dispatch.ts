/**
 * Router penyedia: satu titik masuk untuk UI.
 *
 * Alasan file ini ada: bentuk kredensial dan cara baca inbox tiap penyedia
 * berbeda total (mail.tm = akun + password + JWT; tempmail.ing = alamat saja,
 * berumur). Kalau perbedaan itu dibiarkan bocor ke komponen, setiap tombol
 * harus punya dua cabang. Di sini cabangnya; komponen cukup memanggil akun.
 */

import {
  getMessage as tmGetMessage,
  listMessages as tmListMessages,
  provisionHydraWithFallback as tmProvision,
} from "./api";
import { MailError } from "./errors";
import { FALLBACK_ORDER, isHydraProvider, type HydraProviderId, PROVIDER_ORDER, type ProviderId } from "./providers";
import {
  TMI_DEFAULT_DURATION,
  deleteMessage as tmiDelete,
  fetchInbox as tmiFetchInbox,
  generateAddress as tmiGenerate,
  getMessageFromCache as tmiGetFromCache,
} from "./tempmailing";
import type { Account, MessageDetail, MessageSummary } from "./types";

export type ProvisionResult = {
  address: string;
  password: string;
  token: string;
  provider: ProviderId;
  /** epoch ms, hanya untuk penyedia dengan alamat berumur (tmi) */
  expiresAt?: number;
};

export type ProvisionOptions = {
  /** hanya untuk mail.tm/mail.gw — diabaikan oleh tempmail.ing (server acak) */
  local?: string;
  unique?: boolean;
  /** hanya untuk tempmail.ing (menit) */
  duration?: number;
};

export async function provision(
  preferred: ProviderId,
  opts: ProvisionOptions = {},
): Promise<ProvisionResult> {
  if (preferred === "tmi") {
    const a = await tmiGenerate(opts.duration ?? TMI_DEFAULT_DURATION);
    return {
      address: a.address,
      password: "",
      token: "",
      provider: "tmi",
      expiresAt: a.expiresAt,
    };
  }
  if (!isHydraProvider(preferred)) {
    throw new MailError("Provider tidak dikenal.", 400, String(preferred));
  }
  const r = await tmProvision(preferred, opts.local, opts.unique);
  return { address: r.address, password: r.password, token: r.token, provider: r.provider };
}

/**
 * Buat alamat dengan fallback lintas provider (dipakai tombol "buat alamat").
 *
 * tempmail.ing tidak boleh menjadi jembatan fallback: alamatnya berumur dan
 * kuotanya 2/menit, jadi "pindah ke tmi" bukan penyelamatan melainkan jebakan.
 * Fallback hanya jalan di antara dua penyedia yang bentuknya sama (mail.tm /
 * mail.gw). Kalau pengguna memang memilih tmi, ya tmi — gagal berarti gagal.
 */
export async function provisionWithFallback(
  preferred: ProviderId = PROVIDER_ORDER[0],
  opts: ProvisionOptions = {},
): Promise<ProvisionResult> {
  if (preferred === "tmi") return provision("tmi", opts);

  const order = FALLBACK_ORDER;
  const start = (order as ProviderId[]).includes(preferred) ? (preferred as HydraProviderId) : order[0];
  const rest = order.filter((p) => p !== start);

  let first: MailError | null = null;
  for (const p of [start, ...rest]) {
    try {
      return await provision(p, opts);
    } catch (err) {
      const me =
        err instanceof MailError
          ? err
          : new MailError(err instanceof Error ? err.message : "Gagal menghubungi provider.", 0, p);
      if (!first) first = me;
    }
  }
  throw first ?? new MailError("Semua provider gagal.", 502);
}

/** Baca inbox satu akun (sudah tahu provider & kredensialnya sendiri). */
export async function listMessagesFor(account: Account): Promise<MessageSummary[]> {
  if (account.provider === "tmi") {
    const { messages } = await tmiFetchInbox(account.address);
    return messages;
  }
  return tmListMessages(account.provider, account.token);
}

/**
 * Polling hemat: tmi menjawab 304 lewat ETag kalau tidak ada pesan baru, dan
 * pemanggil boleh mempertahankan state lama (lihat `unchanged`).
 */
export async function listMessagesForConditional(
  account: Account,
): Promise<{ messages: MessageSummary[]; unchanged: boolean }> {
  if (account.provider === "tmi") {
    const { messages, unchanged } = await tmiFetchInbox(account.address);
    return { messages, unchanged };
  }
  return { messages: await tmListMessages(account.provider, account.token), unchanged: false };
}

/**
 * Isi lengkap satu pesan.
 *
 * tempmail.ing tidak punya endpoint per-pesan (GET /api/emails/{id} dianggap
 * alamat dan dibalas inbox kosong — terverifikasi), jadi isinya diambil dari
 * respons poll terakhir yang sudah membawa `content`/`text`.
 */
export async function getMessageFor(account: Account, id: string): Promise<MessageDetail> {
  if (account.provider === "tmi") {
    const hit = tmiGetFromCache(account.address, id);
    if (hit) return hit;
    // Cache kosong (mis. habis reload halaman): refresh dulu sekali.
    await tmiFetchInbox(account.address);
    const retry = tmiGetFromCache(account.address, id);
    if (retry) return retry;
    throw new MailError("Pesan tidak ditemukan — mungkin sudah kedaluwarsa.", 404, "tmi");
  }
  return tmGetMessage(account.provider, account.token, id);
}

/** Hanya tmi yang mendukung hapus satu pesan dari sisi klien. */
export function canDeleteMessages(account: Account | null | undefined): boolean {
  return account?.provider === "tmi";
}

export async function deleteMessageFor(account: Account, id: string): Promise<boolean> {
  if (account.provider !== "tmi") return false;
  return tmiDelete(id, account.address);
}

/**
 * Alamat tmi mati sendiri setelah `durationMinutes`. Setelah lewat, polling
 * tidak ada gunanya dan alamat tidak bisa dipakai lagi.
 */
export function isExpired(account: Account | null | undefined, now = Date.now()): boolean {
  if (!account) return false;
  if (account.provider !== "tmi") return false;
  return typeof account.expiresAt === "number" && account.expiresAt <= now;
}

/** Sisa umur dalam detik (untuk hitung mundur di kartu alamat aktif). */
export function secondsLeft(account: Account | null | undefined, now = Date.now()): number | null {
  if (!account || typeof account.expiresAt !== "number") return null;
  return Math.max(0, Math.round((account.expiresAt - now) / 1000));
}
