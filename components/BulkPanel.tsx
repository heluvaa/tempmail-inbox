"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MailError, provisionWithFallback } from "@/lib/api";
import { PROVIDER_ORDER, bulkSpacingMs, type ProviderId } from "@/lib/providers";
import { randomLocal, sanitizeLocal, withSuffix } from "@/lib/names";
import { fullDate } from "@/lib/format";
import type { Account, BulkResult, LogLine } from "@/lib/types";
import { newId } from "@/lib/storage";
import ProviderPicker from "./ProviderPicker";
import LogPanel from "./LogPanel";
import { IconAlert, IconBulk, IconCheck, IconCopy, IconDownload, IconStop } from "./icons";

const MAX_ACCOUNTS = 20;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const clampCount = (n: number) => Math.max(1, Math.min(MAX_ACCOUNTS, Math.round(n || 1)));

export default function BulkPanel({
  domain,
  onSaved,
  onCopied,
}: {
  domain: string;
  onSaved: (accounts: Account[]) => void;
  onCopied: (text: string, label: string) => void;
}) {
  const [count, setCount] = useState(5);
  const [prefix, setPrefix] = useState("");
  const cleanPrefix = sanitizeLocal(prefix);
  const [provider, setProvider] = useState<ProviderId>(PROVIDER_ORDER[0]);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const stopRef = useRef(false);

  const log = useCallback((msg: string, level: LogLine["level"] = "info") => {
    setLines((prev) => [...prev.slice(-199), { t: Date.now(), msg, level }]);
  }, []);

  const started = useMemo(() => running || done, [running, done]);

  const plan = useMemo(() => {
    const spacing = bulkSpacingMs();
    const minutes = (clampCount(count) * spacing) / 60_000;
    return { spacing, eta: minutes < 1 ? "<1 menit" : `${Math.ceil(minutes)} menit` };
  }, [count]);

  const run = useCallback(async () => {
    if (running) return;
    const total = clampCount(count);
    stopRef.current = false;
    setRunning(true);
    setDone(false);
    setResults([]);
    setLines([{ t: Date.now(), msg: `Mulai ${total} alamat · provider utama ${provider}`, level: "info" }]);

    const created: Account[] = [];
    let activeProvider = provider;
    let failedProvider = "";
    let streak = 0;

    for (let i = 0; i < total; i++) {
      if (stopRef.current) {
        log("Dihentikan. Sebagian alamat tetap tersimpan.", "warn");
        break;
      }
      const tag = `[${i + 1}/${total}]`;
      log(`${tag} Membuat tempmail…`);
      try {
        const r = await provisionWithFallback(
          activeProvider,
          cleanPrefix ? withSuffix(cleanPrefix.slice(0, 26)) : randomLocal(),
          false,
        );
        if (r.provider !== activeProvider) {
          log(`${tag} ${failedProvider} ditolak server, pindah ke ${r.provider}.`, "warn");
          activeProvider = r.provider;
        } else if (failedProvider) {
          failedProvider = "";
        }
        const account: Account = {
          id: newId(),
          address: r.address,
          password: r.password,
          token: r.token,
          provider: r.provider,
          createdAt: Date.now(),
        };
        created.push(account);
        streak = 0;
        setResults((prev) => [
          ...prev,
          {
            index: i + 1,
            address: r.address,
            password: r.password,
            provider: r.provider,
            createdAt: account.createdAt,
            inboxReady: true,
          },
        ]);
        log(`${tag} ${r.address}`, "ok");
      } catch (err) {
        const msg =
          err instanceof MailError ? err.message : err instanceof Error ? err.message : "Gagal";
        if (err instanceof MailError && err.switchable && err.provider) {
          failedProvider = err.provider;
          activeProvider = PROVIDER_ORDER.find((p) => p !== (err as MailError).provider) ?? activeProvider;
        }
        streak += 1;
        setResults((prev) => [
          ...prev,
          {
            index: i + 1,
            address: "—",
            password: "—",
            provider: activeProvider,
            createdAt: Date.now(),
            inboxReady: false,
            error: msg,
          },
        ]);
        log(`${tag} Gagal: ${msg}`, "err");
        if (streak >= 3) {
          log(`${tag} 3 kegagalan beruntun — antrean dihentikan. Provider sedang dibatasi; coba lagi 1-2 menit lagi.`, "err");
          break;
        }
      }

      if (i < total - 1 && !stopRef.current) await sleep(plan.spacing);
    }

    if (created.length) onSaved(created);
    log(
      `Selesai: ${created.length}/${total} alamat jadi${created.length ? ", disimpan ke riwayat." : "."}`,
      created.length ? "ok" : "err",
    );
    setRunning(false);
    setDone(true);
  }, [cleanPrefix, count, onSaved, plan.spacing, provider, running]);

  const stop = useCallback(() => {
    stopRef.current = true;
    log("Menghentikan setelah langkah ini…", "warn");
  }, [log]);

  const ok = results.filter((r) => r.inboxReady);
  const failed = results.filter((r) => !r.inboxReady);

  const textList = useMemo(
    () => ok.map((r) => `${r.address}:${r.password}`).join("\n"),
    [ok],
  );

  const download = useCallback(() => {
    const payload = {
      generatedAt: new Date().toISOString(),
      provider,
      requested: clampCount(count),
      created: ok.length,
      failed: failed.length,
      accounts: ok.map((r) => ({
        address: r.address,
        password: r.password,
        provider: r.provider,
        createdAt: r.createdAt,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tempmail-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [count, failed.length, ok, provider]);

  return (
    <div className="space-y-4">
      <section className="rounded-[var(--radius-blob)] bg-white p-5 ring-1 ring-[var(--color-line)]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white">
            <IconBulk size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold">Bulk generator</h2>
            <p className="text-sm text-[var(--color-muted)]">
              Buat hingga {MAX_ACCOUNTS} alamat email sementara sekaligus, dengan log langsung dan
              hasil yang bisa diunduh JSON.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="bulk-count" className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Jumlah alamat (maks {MAX_ACCOUNTS})
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="bulk-count"
              type="number"
              min={1}
              max={MAX_ACCOUNTS}
              value={count}
              disabled={running}
              onChange={(e) => setCount(clampCount(Number(e.target.value)))}
              className="w-24 rounded-xl bg-[var(--color-surface2)] px-3 py-2 text-center font-display text-lg font-bold ring-1 ring-[var(--color-line)] focus:ring-[var(--color-primary)] disabled:opacity-60"
            />
            <input
              type="range"
              min={1}
              max={MAX_ACCOUNTS}
              value={clampCount(count)}
              disabled={running}
              onChange={(e) => setCount(clampCount(Number(e.target.value)))}
              aria-label="Geser jumlah alamat"
              className="min-w-0 flex-1 accent-[var(--color-primary)]"
            />
          </div>
          <p className="mt-2 inline-flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1">
              <IconCheck size={13} className="text-[var(--color-good)]" /> tiap alamat otomatis disimpan ke riwayat
            </span>
            <span>estimasi: {plan.eta}</span>
            <span>jarak antar alamat: {(plan.spacing / 1000).toFixed(0)} detik</span>
          </p>
        </div>

        <div className="mt-4">
          <label
            htmlFor="bulk-prefix"
            className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]"
          >
            Awalan nama (opsional)
          </label>
          <div className="mt-2 flex items-center overflow-hidden rounded-2xl bg-[var(--color-surface2)] ring-1 ring-[var(--color-line)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
            <input
              id="bulk-prefix"
              type="text"
              value={prefix}
              maxLength={26}
              spellCheck={false}
              autoComplete="off"
              disabled={running}
              placeholder="misal loker"
              onChange={(e) => setPrefix(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-[15px] font-bold outline-none disabled:opacity-60"
            />
            <span className="shrink-0 whitespace-nowrap bg-white px-3 py-3 font-mono text-[13px] font-bold text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
              +kode@{domain || "…"}
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {cleanPrefix
              ? `Contoh hasil: ${withSuffix(cleanPrefix.slice(0, 26))}@${domain || "…"} — tiap alamat dapat kode unik biar tidak bentrok.`
              : "Kosong = nama acak."}
          </p>
        </div>

        <div className="mt-4 border-t border-[var(--color-line)] pt-3">
          <ProviderPicker value={provider} onChange={setProvider} compact={running} />
        </div>

        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-[color-mix(in_srgb,var(--color-sun)_22%,white)] p-3 text-xs text-[color-mix(in_srgb,var(--color-ink)_85%,black)]">
          <IconAlert size={14} className="mt-0.5 shrink-0" />
          Provider membatasi ±30 request per menit per IP, jadi antrean diberi jarak otomatis.
          Ini alat email sementara biasa — tidak mengaktifkan langganan aplikasi apa pun.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {!running ? (
            <button
              type="button"
              onClick={() => void run()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3 font-display text-base font-semibold text-white transition hover:bg-[var(--color-primary2)] active:scale-[0.99]"
            >
              <IconBulk size={18} />
              Mulai generate
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--color-danger)] px-5 py-3 font-display text-base font-semibold text-white transition hover:opacity-90"
            >
              <IconStop size={18} />
              Hentikan
            </button>
          )}
          {started && (
            <>
              <button
                type="button"
                onClick={() => textList && onCopied(textList, "Daftar alamat")}
                disabled={!ok.length}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold ring-1 ring-[var(--color-line)] transition hover:bg-[var(--color-surface2)] disabled:opacity-50"
              >
                <IconCopy size={16} /> Salin ({ok.length})
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!ok.length}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold ring-1 ring-[var(--color-line)] transition hover:bg-[var(--color-surface2)] disabled:opacity-50"
              >
                <IconDownload size={16} /> Unduh JSON
              </button>
            </>
          )}
        </div>
      </section>

      <LogPanel lines={lines} running={running} emptyHint="Tekan Mulai generate untuk melihat progres di sini." />

      {results.length > 0 && (
        <section className="space-y-2" aria-labelledby="bulk-results">
          <h3 id="bulk-results" className="text-lg font-semibold">
            Hasil{" "}
            <span className="text-sm font-bold text-[var(--color-muted)]">
              {ok.length} berhasil{failed.length ? ` · ${failed.length} gagal` : ""}
            </span>
          </h3>
          <ul className="space-y-2">
            {results.map((r) => (
              <li
                key={r.index}
                className={`rounded-2xl p-3 ring-1 ${
                  r.inboxReady ? "bg-white ring-[var(--color-line)]" : "bg-[color-mix(in_srgb,var(--color-danger)_6%,white)] ring-[color-mix(in_srgb,var(--color-danger)_25%,white)]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 rounded-full bg-[var(--color-surface2)] px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
                    #{r.index}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-bold">{r.address}</p>
                    {r.inboxReady ? (
                      <p className="mt-0.5 font-mono text-xs text-[var(--color-muted)]">
                        sandi: {r.password} · {fullDate(new Date(r.createdAt).toISOString())}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs font-semibold text-[var(--color-danger)]">
                        {r.error ?? "Gagal"}
                      </p>
                    )}
                  </div>
                  {r.inboxReady && (
                    <button
                      type="button"
                      onClick={() => onCopied(`${r.address}:${r.password}`, "Alamat")}
                      aria-label={`Salin ${r.address}`}
                      className="shrink-0 cursor-pointer rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[var(--color-primary2)]"
                    >
                      <IconCopy size={13} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--color-muted)]">
            Token akses sengaja tidak disertakan di salinan dan file JSON — cukup alamat + sandi
            untuk login ulang lewat provider.
          </p>
        </section>
      )}
    </div>
  );
}
