"use client";

import { useState } from "react";
import { IconChevron } from "./icons";

const ITEMS: { q: string; a: string }[] = [
  {
    q: "Apa itu email sementara?",
    a: "Alamat email sekali pakai untuk menerima pesan tanpa mengungkap email pribadimu. Cocok untuk verifikasi pendaftaran, unduhan, atau uji coba layanan.",
  },
  {
    q: "Apakah perlu daftar akun?",
    a: "Tidak. Tekan satu tombol dan alamat langsung aktif. Tidak ada email pribadi, tidak ada sandi yang perlu diingat.",
  },
  {
    q: "Berapa lama alamatnya bertahan?",
    a: "Selama penyedia (mail.tm) masih menyimpannya. Alamat sementara bisa hilang kapan saja tanpa pemberitahuan, jadi jangan dipakai untuk hal penting.",
  },
  {
    q: "Di mana data saya disimpan?",
    a: "Daftar alamat, sandi, dan token disimpan hanya di penyimpanan lokal browser kamu (localStorage). Tidak pernah dikirim ke server kami sendiri.",
  },
  {
    q: "Kenapa email belum masuk?",
    a: "Tunggu beberapa detik, lalu tekan Muat ulang. Pengirim besar kadang butuh 1-2 menit. Cek juga folder tidak relevan pada pengirim — ini email baru, jadi selalu masuk ke kotak utama.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section aria-labelledby="faq-heading" className="space-y-2">
      <h2 id="faq-heading" className="font-display text-lg font-semibold">
        Pertanyaan umum
      </h2>
      <ul className="space-y-2">
        {ITEMS.map((it, i) => {
          const isOpen = open === i;
          return (
            <li key={it.q} className="overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--color-line)]">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center gap-2 p-4 text-left font-semibold"
              >
                {it.q}
                <IconChevron
                  size={18}
                  className={`ml-auto shrink-0 text-[var(--color-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <p className="pop px-4 pb-4 text-sm text-[var(--color-muted)]">{it.a}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}