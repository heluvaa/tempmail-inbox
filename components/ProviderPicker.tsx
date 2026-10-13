"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";
import { PROVIDER_ORDER, PROVIDERS, isProviderId, type ProviderId } from "@/lib/providers";
import { IconAlert, IconCheck, IconRefresh } from "./icons";

type Health = Awaited<ReturnType<typeof fetchHealth>> | null;

const HINT: Partial<Record<ProviderId, string>> = {
  tmi: "tempmail.ing: alamat dari server (nama tidak bisa dipilih), kedaluwarsa 5–60 menit",
};

export default function ProviderPicker({
  value,
  onChange,
  compact = false,
  disabled = false,
  only,
}: {
  value: ProviderId;
  onChange: (p: ProviderId) => void;
  compact?: boolean;
  /** Kunci pilihan (mis. bulk sedang jalan atau mode hanya-membaca). */
  disabled?: boolean;
  /** Batasi daftar (mis. bulk hanya hydra — kuota tmi 2/menit tidak masuk akal untuk antrean). */
  only?: ProviderId[];
}) {
  const [health, setHealth] = useState<Health>(null);
  const [probing, setProbing] = useState(false);
  const [failed, setFailed] = useState(false);

  const list = only?.length ? PROVIDER_ORDER.filter((x) => only.includes(x)) : PROVIDER_ORDER;
  /**
   * `only` biasanya literal inline (referensi baru tiap render). Dijadikan
   * string dulu supaya probe tidak ulang terus dan onChange tidak di-reset.
   */
  const onlyKey = only?.join(",") ?? "";

  const probe = useCallback(async () => {
    setProbing(true);
    setFailed(false);
    try {
      const h = await fetchHealth();
      setHealth(h);
      // Kalau provider terpilih ternyata tidak bisa dipakai, lompat ke yang
      // hidup — tetapi hanya di antara provider yang boleh dipilih di sini.
      const allowList = onlyKey ? onlyKey.split(",") : null;
      const allowed = allowList ? h.usable.filter((x) => allowList.includes(x)) : h.usable;
      if (allowed.length && !allowed.includes(value)) onChange(allowed[0] as ProviderId);
    } catch {
      setFailed(true);
    } finally {
      setProbing(false);
    }
  }, [onChange, onlyKey, value]);

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
        {list.map((id) => {
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
              disabled={disabled}
              onClick={() => onChange(id)}
              title={row ? `${meta.base} · HTTP ${row.status}` : meta.base}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${
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

      {HINT[value] && !disabled && (
        <p className="w-full text-[11px] leading-snug text-[var(--color-muted)]">{HINT[value]}</p>
      )}

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
