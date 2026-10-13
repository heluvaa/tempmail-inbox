/**
 * Registry penyedia tempmail.
 *
 * mail.tm dan mail.gw dipakai karena permukaan API-nya identik
 * (keduanya API Platform / Hydra): /domains, /accounts, /token, /messages.
 * Browser tidak boleh memanggil keduanya langsung (tanpa header CORS),
 * jadi semua trafik lewat proxy server (`app/api/mail/[...path]/route.ts`).
 *
 * Kenapa perlu lebih dari satu: mail.tm kadang menolak IP datacenter
 * (Vercel serverless) dengan 500 kosong, sementara request yang sama dari
 * jaringan rumah lolos. Fallback provider menyelamatkan fungsi inti.
 *
 * "tmi" (tempmail.ing) sengaja paling akhir dan TIDAK ikut fallback:
 * bentuknya beda total — alamat dibuat server, berumur, tanpa password/token,
 * dan kuotanya hanya 2 generate/menit per IP. Adapternya di lib/tempmailing.ts,
 * jalur pemilihannya di lib/dispatch.ts.
 */

export type ProviderId = "mailtm" | "mailgw" | "tmi";

/** Provider dengan bentuk API mail.tm (akun + token + halaman pesan). */
export type HydraProviderId = "mailtm" | "mailgw";

export type ProviderMeta = {
  id: ProviderId;
  label: string;
  base: string;
  /** Rate limit upstream: request per window (dipakai untuk throttle bulk). */
  rpm: number;
  /** Nama alamat ditentukan user? tmi tidak: server yang acak. */
  customName: boolean;
  /** Alamat punya masa berlaku? tmi: ya, 5-60 menit. */
  ephemeral: boolean;
  /** Domain baru diketahui setelah alamat dibuat (tmi merotasi domain). */
  domainKnownUpfront: boolean;
};

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  mailtm: { id: "mailtm", label: "mail.tm", base: "https://api.mail.tm", rpm: 30, customName: true, ephemeral: false, domainKnownUpfront: true },
  mailgw: { id: "mailgw", label: "mail.gw", base: "https://api.mail.gw", rpm: 30, customName: true, ephemeral: false, domainKnownUpfront: true },
  tmi: { id: "tmi", label: "tempmail.ing", base: "https://api.tempmail.ing", rpm: 2, customName: false, ephemeral: true, domainKnownUpfront: false },
};

/** Urutan tampil & coba. Provider pertama = default. */
export const PROVIDER_ORDER: ProviderId[] = ["mailtm", "mailgw", "tmi"];

/** Hanya yang boleh saling menutupi kegagalan (bentuk API sama). */
export const FALLBACK_ORDER: HydraProviderId[] = ["mailtm", "mailgw"];

export function isHydraProvider(value: unknown): value is HydraProviderId {
  return value === "mailtm" || value === "mailgw";
}

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDERS;
}

export function resolveProvider(value: unknown): ProviderId {
  return isProviderId(value) ? value : PROVIDER_ORDER[0];
}

/**
 * Jarak antar pembuatan akun supaya tidak menabrak rate limit upstream.
 * Dengan domain yang di-cache, 1 akun = 2 request (accounts + token), jadi
 * 30 request/menit ≈ 15 akun/menit. Faktor 1,35 memberi ruang untuk retry
 * dan request lain milik pengguna.
 */
export function bulkSpacingMs(rpm = 30): number {
  return Math.max(5_000, Math.round((60_000 / rpm) * 2 * 1.35));
}
