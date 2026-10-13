"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";
import { PROVIDER_ORDER, PROVIDERS, isProviderId, type ProviderId } from "@/lib/providers";
import { IconAlert, IconCheck, IconRefresh } from "./icons";

type Health = Awaited<ReturnType<typeof fetchHealth>> | null;

export default function ProviderPicker({
  value,
  onChange,
  compact = false,
}: {
  value: ProviderId;
  onChange: (p: ProviderId) => void;
  compact?: boolean;
}) {
  const [health, setHealth] = useState<Health>(null);
  const [probing, setProbing] = useState(false);
  const [failed, setFailed] = useState(false);

  const probe = useCallback(async () => {
    setProbing(true);
    setFailed(false);
    try {
      const h = await fetchHealth();
      setHealth(h);
      // Kalau provider terpilih ternyata tidak bisa dipakai, lompat ke yang hidup.
      if (h.usable.length && !h.usable.includes(value)) onChange(h.usable[0] as ProviderId);
    } catch {
      setFailed(true);
    } finally {
      setProbing(false);
    }
  }, [onChange, value]);

  useEffect(() => {
    void probe();
    // Hanya sekali saat mount — probe ulang manual lewat tombol.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
        Provider
      </span>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Pilih penyedia email">
        {PROVIDER_ORDER.map((id) => {
          const meta = PROVIDERS[id];
          const row = health?.results.find((r) => r.provider === id);
          const dead = health ? row && !row.ok : false;
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(id)}
              title={row ? `${meta.base} · HTTP ${row.status}` : meta.base}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${
                selected
                  ? "bg-[var(--color-primary)] text-white ring-[var(--color-primary)]"
                  : "bg-white text-[var(--color-muted)] ring-[var(--color-line)] hover:bg-[var(--color-surface2)]"
              }`}
            >
              {dead ? (
                <IconAlert size={13} className={selected ? "text-[#fcd34d]" : "text-[var(--color-danger)]"} />
              ) : (
                <IconCheck size={13} className={selected ? "text-white" : "text-[var(--color-good)]"} />
              )}
              {meta.label}
            </button>
          );
        })}
      </div>

      {!compact && (
        <button
          type="button"
          onClick={() => void probe()}
          disabled={probing}
          className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-muted)] ring-1 ring-[var(--color-line)] transition hover:bg-[var(--color-surface2)] disabled:opacity-60"
        >
          <IconRefresh size={13} className={probing ? "animate-spin" : ""} />
          Cek status
        </button>
      )}

      {health && !health.usable.length && (
        <p className="w-full text-xs font-semibold text-[var(--color-danger)]">
          Semua provider sedang menolak server ini (kemungkinan pembatasan IP atau sedang down).
          Coba lagi sebentar, atau buka lewat koneksi lain.
        </p>
      )}
      {failed && (
        <p className="w-full text-xs text-[var(--color-muted)]">
          Status provider tidak bisa diperiksa. Pembuatan alamat tetap dicoba dengan fallback.
        </p>
      )}
    </div>
  );
}

export function providerLabel(id: unknown): string {
  return isProviderId(id) ? PROVIDERS[id].label : String(id ?? "-");
}
