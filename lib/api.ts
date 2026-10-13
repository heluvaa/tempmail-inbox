import { MailError } from "./errors";
import { isProviderId, type HydraProviderId, type ProviderId } from "./providers";
import { FALLBACK_ORDER, PROVIDERS, PROVIDER_ORDER } from "./providers";
import { randomLocal, sanitizeLocal, withSuffix } from "./names";
import type { Account, MessageDetail, MessageSummary } from "./types";

export { MailError } from "./errors";

/**
 * Klien untuk proxy kita sendiri (/api/mail/<provider>/*). Semua panggilan
 * same-origin, jadi tidak ada masalah CORS. Token hanya lewat header
 * Authorization dan tidak pernah ditulis ke console.
 */
type Members<T> = { "hydra:member"?: T[]; "hydra:totalItems"?: number };

function asMembers<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const m = (data as Members<T>)["hydra:member"];
    if (Array.isArray(m)) return m;
  }
  return []
}

async function call<T>(
  provider: HydraProviderId,
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const res = await fetch(`/api/mail/${provider}/${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const raw = await res.text();
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
    const msg =
      (typeof obj["hydra:description"] === "string" && obj["hydra:description"]) ||
      (typeof obj.message === "string" && obj.message) ||
      (typeof obj.detail === "string" && obj.detail) ||
      `Gagal (${res.status})`;
    throw new MailError(
      msg,
      res.status,
      typeof obj.provider === "string" ? obj.provider : provider,
      obj.switchable === true,
    );
  }
  return data as T;
}

/** Domain per provider di-cache: tiap akun hemat 1 request dari kuota 30/menit. */
const domainCache = new Map<ProviderId, string>();

export async function getDomain(provider: HydraProviderId, force = false): Promise<string> {
  const cached = !force ? domainCache.get(provider) : undefined;
  if (cached) return cached;
  const data = await call<unknown>(provider, "domains");
  const domains = asMembers<{ domain: string; isActive: boolean }>(data);
  const active = domains.find((d) => d.isActive) ?? domains[0];
  if (!active?.domain) throw new MailError("Tidak ada domain aktif dari penyedia.", 503, provider);
  domainCache.set(provider, active.domain);
  return active.domain;
}

export async function createAccount(provider: HydraProviderId, address: string, password: string) {
  return call<{ id: string; address: string }>(provider, "accounts", {
    method: "POST",
    body: { address, password },
  });
}

export async function getToken(provider: HydraProviderId, address: string, password: string): Promise<string> {
  const data = await call<{ token?: string }>(provider, "token", {
    method: "POST",
    body: { address, password },
  });
  if (!data?.token) throw new MailError("Token tidak diterima.", 502, provider);
  return data.token;
}

export async function listMessages(
  provider: HydraProviderId,
  token: string,
  page = 1,
): Promise<MessageSummary[]> {
  const data = await call<unknown>(provider, `messages?page=${page}`, { token });
  return asMembers<MessageSummary>(data);
}

export async function getMessage(
  provider: HydraProviderId,
  token: string,
  id: string,
): Promise<MessageDetail> {
  return call<MessageDetail>(provider, `messages/${encodeURIComponent(id)}`, { token });
}

/** Buat alamat baru di satu provider. Password dibuat di sisi klien. */
export async function provisionAt(
  provider: HydraProviderId,
  local?: string,
  unique = false,
): Promise<{ address: string; password: string; token: string; provider: HydraProviderId }> {
  const domain = await getDomain(provider);
  const base = sanitizeLocal(local ?? "");
  let name: string;
  if (!base) name = randomLocal();
  else if (unique) name = withSuffix(base.slice(0, 26));
  else name = base.slice(0, 30);
  if (name.length < 4) throw new MailError("Nama alamat minimal 4 huruf/angka.", 400, provider);
  const address = `${name}@${domain}`;
  const password = `${randToken(8)}${randToken(6)}A1!`;
  let created;
  try {
    created = await createAccount(provider, address, password);
  } catch (err) {
    if (err instanceof MailError && err.status === 422) {
      throw new MailError(`Nama "${name}" tidak diterima provider (mungkin sudah dipakai).`, 422, provider);
    }
    throw err;
  }
  // Pakai alamat yang diklaim balik oleh provider (sebagian menormalkan
  // karakter tertentu), supaya token selalu cocok dengan akun tersimpan.
  const finalAddress = created?.address || address;
  const token = await getToken(provider, finalAddress, password);
  return { address: finalAddress, password, token, provider };
}

/**
 * Buat alamat dengan urutan fallback: coba provider utama, lalu provider lain.
 *
 * Pesan error yang dikembalikan adalah error dari provider UTAMA — supaya log
 * tidak menyalahkan provider cadangan atas kegagalan provider utama. Provider
 * cadangan hanya dicoba kalau kegagalan utama bersifat infrastrukturnya
 * (blokir IP / 5xx / 429 / jaringan), bukan kalau ditolak karena data
 * (mis. alamat sudah dipakai).
 */
export async function provisionHydraWithFallback(
  preferred: HydraProviderId = PROVIDER_ORDER[0] as HydraProviderId,
  local?: string,
  unique = false,
): Promise<{ address: string; password: string; token: string; provider: HydraProviderId }> {
  const order = [preferred, ...FALLBACK_ORDER.filter((p) => p !== preferred)];
  const errors = new Map<HydraProviderId, MailError>();
  let primary: MailError | null = null;

  for (const p of order) {
    try {
      return await provisionAt(p, local, unique);
    } catch (err) {
      const me =
        err instanceof MailError
          ? err
          : new MailError(err instanceof Error ? err.message : "Gagal menghubungi provider.", 0, p);
      errors.set(p, me);
      if (p === preferred) primary = me;
    }
  }

  const first = primary ?? Array.from(errors.values())[0];
  if (!first) throw new MailError("Semua provider gagal.", 502);
  if (order.length > 1) {
    const others = order
      .filter((p) => p !== preferred && errors.has(p))
      .map((p) => `${PROVIDERS[p].label}: ${errors.get(p)!.message}`);
    if (others.length) first.message = `${first.message} (${others.join(" · ")})`;
  }
  throw first;
}

/**
 * Re-export nama lama. Komponen yang dulu memakai `provisionWithFallback`
 * dari "@/lib/api" sekarang lewat router pusat ("@/lib/dispatch") supaya
 * tmi juga bisa dipilih tanpa ada dua tempat yang punya logika sendiri.
 */
export { provisionWithFallback } from "./dispatch";

export type HealthResult = {
  checkedAt: string;
  usable: ProviderId[];
  results: { provider: string; base: string; ok: boolean; status: number; domains: number; detail: string }[];
};

export async function fetchHealth(): Promise<HealthResult> {
  const res = await fetch(`/api/mail/health`, { cache: "no-store" });
  if (!res.ok) throw new MailError("Probe gagal.", res.status);
  return (await res.json()) as HealthResult;
}

/**
 * Bentuk minimum akun yang sah. Provider mail.tm butuh token; tmi tidak
 * punya kredensial sama sekali (inbox dibuka dengan alamat saja), jadi token
 * cukup ada sebagai string — kosong pun valid.
 */
export function isAccount(a: Account | undefined | null): a is Account {
  return !!a && typeof a.address === "string" && typeof a.token === "string" && isProviderId(a.provider);
}

function randToken(len: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
