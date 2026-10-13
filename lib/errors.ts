/**
 * Kelas error bersama untuk semua penyedia tempmail.
 *
 * Dipisah dari lib/api.ts supaya adapter penyedia lain (lib/tempmailing.ts)
 * bisa mengimpornya tanpa membuat lingkaran impor. lib/api.ts tetap
 * mengekspor ulang MailError agar impor lama tidak berubah.
 */

/** Info kuota yang dibaca dari header x-ratelimit-*, saat respons gagal. */
export type RateInfo = {
  limit?: number;
  remaining?: number;
  /** Epoch detik kapan kuota pulih (x-ratelimit-reset). */
  resetUnix?: number;
  /** Lebar jendela dalam detik (x-ratelimit-window). */
  windowSec?: number;
  /** Label kebijakan dari server, mis. "suspicious". */
  policy?: string;
};

export class MailError extends Error {
  status: number;
  provider?: string;
  /** infrastruktur penyedia bermasalah (blokir IP / 5xx) — pindah provider, jangan retry */
  switchable: boolean;
  /** kuota habis: ganti provider pun percuma, tunggu hitung mundur */
  exhausted?: boolean;
  /** detik tunggu yang dinyatakan server (Retry-After / retryAfterSeconds) */
  retryAfterSec?: number;
  /** snapshot header kuota dari respons terakhir */
  rate?: RateInfo;

  constructor(
    message: string,
    status: number,
    provider?: string,
    switchable = false,
    exhausted = false,
  ) {
    super(message);
    this.name = "MailError";
    this.status = status;
    this.provider = provider;
    this.switchable = switchable;
    this.exhausted = exhausted;
  }
}

/** Baca header kuota (case-insensitive, tahan nilai kosong). */
export function parseRate(headers: Headers): RateInfo {
  const num = (k: string): number | undefined => {
    const v = headers.get(k);
    if (!v) return undefined;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    limit: num("x-ratelimit-limit"),
    remaining: num("x-ratelimit-remaining"),
    resetUnix: num("x-ratelimit-reset"),
    windowSec: num("x-ratelimit-window"),
    policy: headers.get("x-ratelimit-policy") ?? undefined,
  };
}
