"use client";

import type { MessageSummary } from "@/lib/types";
import { clockTime, relativeTime } from "@/lib/format";
import { IconClock, IconMail, IconRefresh, IconSparkles } from "./icons";

function initials(msg: MessageSummary): string {
  const name = msg.from?.name?.trim() || msg.from?.address || "?";
  return name.slice(0, 1).toUpperCase();
}

export default function InboxList({
  messages,
  state,
  active,
  refreshing,
  lastSync,
  address,
  onOpen,
  onRefresh,
  onGenerate,
}: {
  messages: MessageSummary[];
  state: "idle" | "loading" | "ready" | "error";
  active: boolean;
  refreshing: boolean;
  lastSync: number | null;
  address: string | null;
  onOpen: (id: string) => void;
  onRefresh: () => void;
  onGenerate: () => void;
}) {
  const unread = messages.filter((m) => !m.seen).length;

  return (
    <section className="space-y-3" aria-labelledby="inbox-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="inbox-heading" className="text-lg font-semibold">
          Kotak masuk
        </h2>
        {active && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-good)_14%,white)] px-2.5 py-1 text-xs font-bold text-[color-mix(in_srgb,var(--color-good)_70%,black)]">
            <span className="ring-live inline-block h-2 w-2 rounded-full bg-[var(--color-good)]" aria-hidden />
            Cek otomatis 10 detik
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={!active || refreshing}
          className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-bold ring-1 ring-[var(--color-line)] transition hover:bg-[var(--color-surface2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconRefresh size={16} className={refreshing ? "animate-spin" : ""} />
          Muat ulang
        </button>
      </div>

      {!active && (
        <div className="rounded-[var(--radius-blob)] bg-white p-6 text-center ring-1 ring-[var(--color-line)]">
          <IconMail size={34} className="mx-auto text-[var(--color-primary)]" />
          <p className="mt-3 font-bold">Belum ada alamat aktif</p>
          <p className="text-sm text-[var(--color-muted)]">
            Buat satu alamat dulu, atau pilih salah satu dari riwayat di bawah.
          </p>
          <button
            type="button"
            onClick={onGenerate}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary2)]"
          >
            <IconSparkles size={16} /> Buat tempmail
          </button>
        </div>
      )}

      {address && (
        <p className="truncate rounded-xl bg-[var(--color-surface2)] px-3 py-2 text-center font-mono text-xs font-bold text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
          kotak masuk: {address}
        </p>
      )}

      {active && state === "loading" && messages.length === 0 && (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="rounded-2xl bg-white p-4 ring-1 ring-[var(--color-line)]">
              <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--color-line)]" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-[var(--color-line)]" />
            </li>
          ))}
        </ul>
      )}

      {active && state === "error" && (
        <div className="rounded-[var(--radius-blob)] bg-white p-4 text-sm ring-1 ring-[var(--color-line)]">
          Gagal memuat inbox. Periksa koneksi internet lalu tekan <b>Muat ulang</b>.
        </div>
      )}

      {active && state !== "loading" && state !== "error" && messages.length === 0 && (
        <div className="rounded-[var(--radius-blob)] bg-white p-8 text-center ring-1 ring-[var(--color-line)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)]">
            <IconMail size={30} className="text-[var(--color-primary)]" />
          </div>
          <p className="mt-3 font-bold">Masih kosong nih</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-[var(--color-muted)]">
            Email yang masuk akan muncul otomatis di sini. Coba pakai alamat di atas untuk
            pendaftaran atau verifikasi.
          </p>
        </div>
      )}

      {messages.length > 0 && (
        <ul className="space-y-2">
          {messages.map((m) => {
            const who = m.from?.name?.trim() || m.from?.address || "Tidak dikenal";
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onOpen(m.id)}
                  className="group flex w-full cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-[var(--color-line)] transition hover:ring-[var(--color-primary)] active:scale-[0.99]"
                >
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-peach)_22%,white)] font-display text-lg font-semibold text-[var(--color-ink)]"
                    aria-hidden
                  >
                    {initials(m)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold">{who}</span>
                      {!m.seen && (
                        <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          BARU
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-xs text-[var(--color-muted)]">
                        {clockTime(m.createdAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate font-semibold">
                      {m.subject || "(Tanpa subjek)"}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-[var(--color-muted)]">
                      {m.intro || "(tidak ada pratinjau)"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {active && lastSync && messages.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)]">
          <IconClock size={14} />
          {unread > 0 ? `${unread} belum dibaca · ` : ""}disinkron {relativeTime(new Date(lastSync).toISOString())}
        </p>
      )}
    </section>
  );
}