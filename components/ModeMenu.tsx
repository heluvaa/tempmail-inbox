"use client";

import { IconBulk, IconInbox, IconSparkles } from "./icons";
import type { Mode } from "@/lib/types";

type Card = {
  mode: Mode;
  badge: string;
  title: string;
  body: string;
  chips: string[];
  icon: React.ReactNode;
};

const CARDS: Card[] = [
  {
    mode: "gen",
    badge: "CEPAT",
    title: "Generator",
    body: "Buat satu alamat email sementara. Sekali tekan, langsung aktif dan siap dipakai verifikasi.",
    chips: ["1 ALAMAT", "SALIN CEPAT", "TANPA DAFTAR"],
    icon: <IconSparkles size={26} />,
  },
  {
    mode: "bulk",
    badge: "MAX 20",
    title: "Bulk Generator",
    body: "Buat banyak alamat sekaligus dengan log progres langsung. Hasil bisa disalin atau diunduh JSON.",
    chips: ["HINGGA 20 ALAMAT", "LOG LANGSUNG", "UNDUH JSON"],
    icon: <IconBulk size={26} />,
  },
  {
    mode: "inbox",
    badge: "10 DETIK",
    title: "Tempmail Inbox",
    body: "Buka kotak masuk alamat mana pun dari riwayat. Pesan, link, dan kode OTP muncul otomatis.",
    chips: ["PEMBACA INBOX", "REFRESH OTOMATIS", "AMBIL LINK"],
    icon: <IconInbox size={26} />,
  },
];

export default function ModeMenu({
  onPick,
  accountCount,
}: {
  onPick: (mode: Mode) => void;
  accountCount: number;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-blob)] bg-white p-6 ring-1 ring-[var(--color-line)]">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[color-mix(in_srgb,var(--color-primary)_75%,black)]">
          <span className="ring-live inline-block h-2 w-2 rounded-full bg-[var(--color-primary)]" aria-hidden />
          {accountCount > 0 ? `${accountCount} alamat tersimpan` : "siap dipakai"}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
          Tempmail Suite
        </h1>
        <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
          Pilih mode. Buat satu alamat, buat banyak sekaligus, atau baca kotak masuk. Semua
          tersimpan hanya di browser kamu.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {CARDS.map((c) => (
          <button
            key={c.mode}
            type="button"
            onClick={() => onPick(c.mode)}
            className="rise group flex cursor-pointer flex-col rounded-[var(--radius-blob)] bg-white p-5 text-left ring-1 ring-[var(--color-line)] transition hover:-translate-y-0.5 hover:ring-[var(--color-primary)] active:scale-[0.99]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white">
              {c.icon}
            </span>
            <span className="mt-3 inline-flex items-center gap-2">
              <span className="font-display text-xl font-semibold">{c.title}</span>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--color-sun)_30%,white)] px-2 py-0.5 text-[10px] font-bold text-[color-mix(in_srgb,var(--color-ink)_80%,black)]">
                {c.badge}
              </span>
            </span>
            <span className="mt-1 block text-sm text-[var(--color-muted)]">{c.body}</span>
            <span className="mt-3 flex flex-wrap gap-1.5">
              {c.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-[var(--color-surface2)] px-2 py-1 text-[10px] font-bold tracking-wide text-[var(--color-muted)] ring-1 ring-[var(--color-line)]"
                >
                  {chip}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
