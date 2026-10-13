"use client";

import type { Account } from "@/lib/types";
import { IconCheck, IconCopy, IconKey, IconMail, IconSparkles } from "./icons";

export default function ActiveCard({
  account,
  count,
  generating,
  onCopy,
  onGenerate,
}: {
  account: Account;
  count: number;
  generating: boolean;
  onCopy: (text: string, label: string) => void;
  onGenerate: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-blob)] bg-white p-5 ring-1 ring-[var(--color-line)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] px-2.5 py-1 text-xs font-bold text-[color-mix(in_srgb,var(--color-primary)_75%,black)]">
          <span className="ring-live inline-block h-2 w-2 rounded-full bg-[var(--color-primary)]" aria-hidden />
          Alamat aktif
        </span>
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