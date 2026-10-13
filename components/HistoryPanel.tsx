"use client";

import type { Account } from "@/lib/types";
import { fullDate, relativeTime } from "@/lib/format";
import { IconCheck, IconCopy, IconKey, IconTrash } from "./icons";

export default function HistoryPanel({
  accounts,
  activeId,
  onSelect,
  onDelete,
  onClearAll,
  onCopy,
}: {
  accounts: Account[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <section className="space-y-3" aria-labelledby="history-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="history-heading" className="text-lg font-semibold">
          Riwayat alamat
        </h2>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] px-2.5 py-1 text-xs font-bold text-[color-mix(in_srgb,var(--color-primary)_75%,black)]">
          {accounts.length} tersimpan
        </span>
        {accounts.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-bold text-[var(--color-danger)] ring-1 ring-[color-mix(in_srgb,var(--color-danger)_30%,white)] transition hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,white)]"
          >
            <IconTrash size={15} />
            Hapus semua
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
          Belum ada alamat tersimpan. Setiap alamat yang kamu buat akan tercatat di sini
          (beserta password, tersimpan lokal di browser).
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => {
            const isActive = a.id === activeId;
            return (
              <li
                key={a.id}
                className={`rounded-2xl p-4 ring-1 transition ${
                  isActive
                    ? "bg-[color-mix(in_srgb,var(--color-primary)_8%,white)] ring-[var(--color-primary)]"
                    : "bg-white ring-[var(--color-line)]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-bold">{a.address}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                      dibuat {fullDate(new Date(a.createdAt).toISOString())} ·{" "}
                      {relativeTime(new Date(a.createdAt).toISOString())}
                    </p>
                  </div>
                  {isActive && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-primary)] px-2 py-1 text-[10px] font-bold text-white">
                      <IconCheck size={12} /> AKTIF
                    </span>
                  )}
                </div>

                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface2)] px-2 py-1 font-mono text-xs text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
                  <IconKey size={13} /> sandi: {a.password}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onCopy(a.address, "Alamat")}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-[var(--color-line)] transition hover:bg-[var(--color-surface2)]"
                  >
                    <IconCopy size={14} /> Salin
                  </button>
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => onSelect(a.id)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[var(--color-primary2)]"
                    >
                      Jadikan aktif
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(a.id)}
                    className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-danger)] ring-1 ring-[color-mix(in_srgb,var(--color-danger)_25%,white)] transition hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,white)]"
                  >
                    <IconTrash size={14} /> Hapus
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}