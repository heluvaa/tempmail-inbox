"use client";

import type { ProviderId } from "@/lib/providers";
import { sanitizeLocal } from "@/lib/names";
import type { Account } from "@/lib/types";
import ProviderPicker from "./ProviderPicker";
import { IconCheck, IconCopy, IconInbox, IconMail, IconShield, IconSparkles } from "./icons";

export default function GenPanel({
  account,
  generating,
  provider,
  domain,
  wanted,
  onWanted,
  onProvider,
  onGenerate,
  onCopy,
  onOpenInbox,
}: {
  account: Account | null;
  generating: boolean;
  provider: ProviderId;
  domain: string;
  wanted: string;
  onWanted: (v: string) => void;
  onProvider: (p: ProviderId) => void;
  onGenerate: (p: ProviderId, name?: string) => Promise<void>;
  onCopy: (text: string, label: string) => void;
  onOpenInbox: () => void;
}) {
  const clean = sanitizeLocal(wanted);
  const tooShort = clean.length > 0 && clean.length < 4;
  const preview = clean ? `${clean}@${domain}` : `alamat acak@${domain}`;

  return (
    <div className="space-y-4">
      <section className="rounded-[var(--radius-blob)] bg-white p-5 ring-1 ring-[var(--color-line)]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white">
            <IconSparkles size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold">Generator alamat</h2>
            <p className="text-sm text-[var(--color-muted)]">
              Satu tekan = satu alamat email sementara baru. Alamat lama tetap tersimpan di riwayat.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="wanted-name"
            className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]"
          >
            Nama alamat (opsional)
          </label>
          <div className="mt-2 flex items-center overflow-hidden rounded-2xl bg-[var(--color-surface2)] ring-1 ring-[var(--color-line)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
            <input
              id="wanted-name"
              type="text"
              value={wanted}
              maxLength={30}
              spellCheck={false}
              autoComplete="off"
              placeholder="misal lokeranku"
              onChange={(e) => onWanted(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-[15px] font-bold outline-none"
            />
            <span className="shrink-0 whitespace-nowrap bg-white px-3 py-3 font-mono text-[13px] font-bold text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
              @{domain || "…"}
            </span>
          </div>
          <p
            className={`mt-2 text-xs ${
              tooShort ? "font-bold text-[var(--color-danger)]" : "text-[var(--color-muted)]"
            }`}
          >
            {tooShort
              ? "Minimal 4 huruf/angka."
              : `Jadi: ${preview} — huruf kecil, angka, tanda hubung atau garis bawah. Kosong = nama acak.`}
          </p>
        </div>

        <div className="mt-4 border-t border-[var(--color-line)] pt-3">
          <ProviderPicker value={provider} onChange={onProvider} />
        </div>

        {account ? (
          <div className="mt-4 rounded-2xl bg-[var(--color-surface2)] p-4 ring-1 ring-[var(--color-line)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] px-2.5 py-1 text-xs font-bold text-[color-mix(in_srgb,var(--color-primary)_75%,black)]">
                <span className="ring-live inline-block h-2 w-2 rounded-full bg-[var(--color-primary)]" aria-hidden />
                Alamat aktif
              </span>
              <span className="ml-auto text-xs font-semibold text-[var(--color-muted)]">
                {account.provider}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-[var(--color-line)]">
              <IconMail size={18} className="shrink-0 text-[var(--color-primary)]" />
              <p className="min-w-0 flex-1 truncate font-mono text-[15px] font-bold" title={account.address}>
                {account.address}
              </p>
              <button
                type="button"
                onClick={() => onCopy(account.address, "Alamat")}
                aria-label="Salin alamat email"
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-primary2)]"
              >
                <IconCopy size={15} /> Salin
              </button>
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-muted)]">
              sandi: {account.password}
              <button
                type="button"
                onClick={() => onCopy(account.password, "Password")}
                aria-label="Salin password"
                className="cursor-pointer text-[var(--color-primary)]"
              >
                <IconCopy size={14} />
              </button>
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-[var(--color-surface2)] p-4 text-sm text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
            Belum ada alamat. Tekan <b>Buat alamat</b> untuk mulai.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onGenerate(provider)}
            disabled={generating}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3.5 font-display text-base font-semibold text-white transition hover:bg-[var(--color-primary2)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                Membuat alamat…
              </>
            ) : (
              <>
                <IconSparkles size={18} /> Buat alamat
              </>
            )}
          </button>
          {account && (
            <button
              type="button"
              onClick={onOpenInbox}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold ring-1 ring-[var(--color-line)] transition hover:bg-[var(--color-surface2)]"
            >
              <IconInbox size={18} /> Buka kotak masuk
            </button>
          )}
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)]">
          <IconCheck size={13} className="text-[var(--color-good)]" />
          Riwayat &amp; sandi hanya disimpan di browser kamu.
        </p>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <Feature icon={<IconSparkles size={22} />} title="1 tekan" body="Alamat langsung jadi" />
        <Feature icon={<IconInbox size={22} />} title="otomatis" body="Inbox dicek 10 detik" />
        <Feature icon={<IconShield size={22} />} title="lokal" body="Sandi di browser kamu" />
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-[var(--color-line)]">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] text-[var(--color-primary)]">
        {icon}
      </span>
      <p className="mt-2 font-display text-sm font-semibold">{title}</p>
      <p className="text-[11px] leading-tight text-[var(--color-muted)]">{body}</p>
    </div>
  );
}
