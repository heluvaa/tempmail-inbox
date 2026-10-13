"use client";

import type { Account } from "@/lib/types";
import { IconAlert, IconCheck, IconClock, IconCopy, IconKey, IconMail, IconSparkles } from "./icons";

/** "12:07:45" / "45 dtk" — sisa umur alamat. */
function humanize(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : m > 0 ? `${m}:${pad(sec)}` : `${sec} dtk`;
}

export default function ActiveCard({
  account,
  count,
  generating,
  secondsLeft = null,
  expired = false,
  onCopy,
  onGenerate,
}: {
  account: Account;
  count: number;
  generating: boolean;
  /** Sisa umur dalam detik; null = alamat tidak punya masa berlaku (mail.tm). */
  secondsLeft?: number | null;
  expired?: boolean;
  onCopy: (text: string, label: string) => void;
  onGenerate: () => void;
}) {
  const hasPassword = !!account.password;
  return (
    <section className="rounded-[var(--radius-blob)] bg-white p-5 ring-1 ring-[var(--color-line)]">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
            expired
              ? "bg-[color-mix(in_srgb,var(--color-danger)_14%,white)] text-[color-mix(in_srgb,var(--color-danger)_70%,black)]"
              : "bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] text-[color-mix(in_srgb,var(--color-primary)_75%,black)]"
          }`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${expired ? "bg-[var(--color-danger)]" : "ring-live bg-[var(--color-primary)]"}`}
            aria-hidden
          />
          {expired ? "Alamat kedaluwarsa" : "Alamat aktif"}
        </span>
        {secondsLeft !== null && !expired && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface2)] px-2.5 py-1 text-xs font-bold text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
            <IconClock size={12} />
            {humanize(secondsLeft)}
          </span>
        )}
        <span className="ml-auto text-xs font-semibold text-[var(--color-muted)]">
          {count} pesan
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[var(--color-surface2)] p-3 ring-1 ring-[var(--color-line)]">
        <IconMail size={20} className="shrink-0 text-[var(--color-primary)]" />
        <p className="min-w-0 flex-1 truncate font-mono text-[15px] font-bold" title={account.address}>
          {account.address}
        </p>
        <button
          type="button"
          onClick={() => onCopy(account.address, "Alamat")}
          aria-label="Salin alamat email"
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-primary2)]"
        >
          <IconCopy size={15} />
          Salin
        </button>
      </div>

      {expired && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-[color-mix(in_srgb,var(--color-danger)_8%,white)] p-3 text-xs text-[var(--color-muted)] ring-1 ring-[color-mix(in_srgb,var(--color-danger)_30%,white)]">
          <IconAlert size={14} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
          Alamat ini sudah mati dan kotak masuknya tidak bisa dibuka lagi. Buat alamat baru
          untuk melanjutkan.
        </p>
      )}

      {hasPassword && (
      <details className="mt-2">
        <summary className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--color-muted)]">
          <IconKey size={13} /> Lihat password alamat ini
        </summary>
        <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs">
          {account.password}
          <button
            type="button"
            onClick={() => onCopy(account.password, "Password")}
            aria-label="Salin password"
            className="cursor-pointer text-[var(--color-primary)]"
          >
            <IconCopy size={14} />
          </button>
        </p>
      </details>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3.5 font-display text-base font-semibold text-white transition hover:bg-[var(--color-primary2)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generating ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
            Membuat alamat…
          </>
        ) : (
          <>
            <IconSparkles size={18} />
            Buat alamat baru
          </>
        )}
      </button>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)]">
        <IconCheck size={13} className="text-[var(--color-good)]" />
        Riwayat & password hanya disimpan di browser kamu.
      </p>
    </section>
  );
}