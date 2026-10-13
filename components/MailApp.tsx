"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Account, MessageSummary, Mode, Toast, ToastKind } from "@/lib/types";
import { listMessages, provisionWithFallback, getDomain } from "@/lib/api";
import { PROVIDER_ORDER, type ProviderId } from "@/lib/providers";
import {
  loadAccounts,
  loadActiveId,
  loadMode,
  loadPreferredProvider,
  newId,
  saveAccounts,
  saveActiveId,
  saveMode,
  savePreferredProvider,
} from "@/lib/storage";
import ModeMenu from "./ModeMenu";
import GenPanel from "./GenPanel";
import BulkPanel from "./BulkPanel";
import ActiveCard from "./ActiveCard";
import InboxList from "./InboxList";
import HistoryPanel from "./HistoryPanel";
import MessageView from "./MessageView";
import Toaster from "./Toaster";
import { IconBack, IconMail, IconTrash } from "./icons";
import Faq from "./Faq";

const POLL_MS = 10_000;
const MAX_HISTORY = 40;

const NAV: { mode: Mode; label: string }[] = [
  { mode: "gen", label: "Generator" },
  { mode: "bulk", label: "Bulk" },
  { mode: "inbox", label: "Inbox" },
];

const MODES: Mode[] = ["menu", "gen", "bulk", "inbox"];

/** Mode bisa datang dari hash (#/bulk) supaya bisa ditaut langsung. */
function modeFromHash(): Mode | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#\/?/, "");
  return (MODES as string[]).includes(raw) ? (raw as Mode) : null;
}

export default function MailApp() {
  const [mode, setMode] = useState<Mode>("menu");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderId>(PROVIDER_ORDER[0]);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [inboxState, setInboxState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [wanted, setWanted] = useState("");
  const [domain, setDomain] = useState("");

  const active = accounts.find((a) => a.id === activeId) ?? null;
  const fetching = useRef(false);
  const toastSeq = useRef(0);

  const pushToast = useCallback((kind: ToastKind, text: string) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-2), { id, kind, text }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Muat state dari localStorage saat mount.
  useEffect(() => {
    const saved = loadAccounts();
    const savedActive = loadActiveId();
    const savedProvider = loadPreferredProvider();
    const hash = modeFromHash();
    const savedMode = loadMode();
    setAccounts(saved);
    setActiveId(savedActive && saved.some((a) => a.id === savedActive) ? savedActive : saved[0]?.id ?? null);
    if (savedProvider) setProvider(savedProvider);
    setMode((hash ?? (savedMode as Mode)) ?? "menu");
    setHydrated(true);
  }, []);

  // Hash ikut berubah supaya tombol browser & link langsung tetap masuk akal.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const want = `#/${mode}`;
    if (window.location.hash !== want) window.history.replaceState(null, "", want);
  }, [mode]);

  // Navigasi manual (back/forward atau edit alamat) langsung mempengaruhi mode.
  useEffect(() => {
    const onHash = () => {
      const m = modeFromHash();
      if (m) setMode(m);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (hydrated) saveAccounts(accounts);
  }, [accounts, hydrated]);

  useEffect(() => {
    if (hydrated) saveActiveId(activeId);
  }, [activeId, hydrated]);

  useEffect(() => {
    if (hydrated) saveMode(mode);
  }, [mode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    savePreferredProvider(provider);
  }, [provider, hydrated]);

  // Domain aktif diambil sekali per provider untuk pratinjau nama alamat.
  useEffect(() => {
    let alive = true;
    getDomain(provider)
      .then((d) => alive && setDomain(d))
      .catch(() => alive && setDomain(""));
    return () => {
      alive = false;
    };
  }, [provider, hydrated]);

  const fetchInbox = useCallback(
    async (account: Account, spinner: boolean) => {
      if (fetching.current) return;
      fetching.current = true;
      if (spinner) setRefreshing(true);
      try {
        const list = await listMessages(account.provider, account.token);
        setMessages(list);
        setInboxState("ready");
        setLastSync(Date.now());
      } catch {
        setInboxState((prev) => (prev === "ready" ? "ready" : "error"));
      } finally {
        fetching.current = false;
        if (spinner) setRefreshing(false);
      }
    },
    [],
  );

  // Polling inbox alamat aktif setiap 10 detik (hanya saat mode inbox).
  useEffect(() => {
    if (!active || mode !== "inbox") {
      setMessages([]);
      setInboxState("idle");
      return;
    }
    let alive = true;
    setInboxState("loading");
    setMessages([]);
    void fetchInbox(active, false);
    const timer = window.setInterval(() => {
      if (alive) void fetchInbox(active, false);
    }, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [active, mode, fetchInbox]);

  const addAccounts = useCallback((incoming: Account[]) => {
    if (!incoming.length) return;
    setAccounts((prev) => {
      const seen = new Set(prev.map((a) => a.address));
      const fresh = incoming.filter((a) => !seen.has(a.address));
      return [...fresh, ...prev].slice(0, MAX_HISTORY);
    });
  }, []);

  const handleGenerate = useCallback(
    async (p: ProviderId, name?: string) => {
      if (generating) return;
      const wantedName = (name ?? "").trim();
      setGenerating(true);
      try {
        const r = await provisionWithFallback(p, wantedName || undefined, false);
        if (r.provider !== p) pushToast("info", `${p} menolak server, pindah ke ${r.provider}`);
        setProvider(r.provider);
        const account: Account = {
          id: newId(),
          address: r.address,
          password: r.password,
          token: r.token,
          provider: r.provider,
          createdAt: Date.now(),
        };
        addAccounts([account]);
        setActiveId(account.id);
        setOpenId(null);
        pushToast("ok", "Alamat baru siap dipakai");
        if (wantedName) setWanted("");
      } catch (err) {
        const msg =
          err instanceof Error && err.message && err.message.length < 120
            ? err.message
            : "Gagal membuat alamat. Coba provider lain.";
        pushToast("err", msg);
      } finally {
        setGenerating(false);
      }
    },
    [addAccounts, generating, pushToast],
  );

  const copyText = useCallback(
    async (text: string, label: string) => {
      if (!text) return;
      const legacy = () => {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand gagal");
      };
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
        else legacy();
        pushToast("ok", `${label} disalin`);
      } catch {
        try {
          legacy();
          pushToast("ok", `${label} disalin`);
        } catch {
          pushToast("err", "Browser menolak menyalin otomatis. Salin manual ya.");
        }
      }
    },
    [pushToast],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const next = accounts.filter((a) => a.id !== id);
      setAccounts(next);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      setOpenId(null);
      pushToast("info", "Alamat dihapus dari riwayat");
    },
    [accounts, activeId, pushToast],
  );

  const handleClearAll = useCallback(() => {
    if (accounts.length === 0) return;
    const ok = window.confirm(
      "Hapus semua alamat dari riwayat? Email di alamat lama tidak bisa dibuka lagi dari sini.",
    );
    if (!ok) return;
    setAccounts([]);
    setActiveId(null);
    setOpenId(null);
    pushToast("info", "Semua riwayat dihapus");
  }, [accounts.length, pushToast]);

  const useAccount = useCallback(
    (id: string) => {
      const a = accounts.find((x) => x.id === id);
      if (!a) return;
      setActiveId(id);
      setProvider(a.provider);
      setOpenId(null);
      setMode("inbox");
    },
    [accounts],
  );

  return (
    <>
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMode("menu")}
          aria-label="Kembali ke pilihan mode"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white transition hover:bg-[var(--color-primary2)]"
        >
          <IconMail size={24} />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold leading-none sm:text-3xl">
            Tempmail Suite
          </h1>
          <p className="truncate text-sm text-[var(--color-muted)]">
            Email sementara, langsung di browser. Tanpa daftar.
          </p>
        </div>
      </header>

      {mode !== "menu" && (
        <nav className="mb-5 flex items-center gap-1.5 rounded-full bg-white p-1.5 ring-1 ring-[var(--color-line)]">
          {NAV.map((n) => (
            <button
              key={n.mode}
              type="button"
              onClick={() => {
                setMode(n.mode);
                setOpenId(null);
              }}
              className={`flex-1 cursor-pointer rounded-full px-3 py-2 text-sm font-bold transition ${
                mode === n.mode
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-surface2)]"
              }`}
            >
              {n.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMode("menu")}
            aria-label="Kembali ke menu"
            className="shrink-0 cursor-pointer rounded-full bg-[var(--color-surface2)] px-3 py-2 text-sm font-bold text-[var(--color-muted)] ring-1 ring-[var(--color-line)] transition hover:bg-white"
          >
            <IconBack size={16} className="rotate-180" />
          </button>
        </nav>
      )}

      {openId && active ? (
        <MessageView
          provider={active.provider}
          token={active.token}
          messageId={openId}
          seed={messages.find((m) => m.id === openId)}
          onBack={() => setOpenId(null)}
          onCopied={copyText}
        />
      ) : (
        <div className="space-y-6">
          {!hydrated && mode !== "menu" && (
            <div className="rounded-[var(--radius-blob)] bg-white p-5 ring-1 ring-[var(--color-line)]">
              <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--color-line)]" />
              <div className="mt-3 h-12 w-full animate-pulse rounded-2xl bg-[var(--color-line)]" />
              <div className="mt-4 h-12 w-full animate-pulse rounded-2xl bg-[var(--color-line)]" />
            </div>
          )}

          {mode === "menu" && (
            <ModeMenu onPick={(m) => setMode(m)} accountCount={accounts.length} />
          )}

          {hydrated && mode === "gen" && (
            <GenPanel
              account={active}
              generating={generating}
              provider={provider}
              domain={domain}
              wanted={wanted}
              onWanted={setWanted}
              onProvider={setProvider}
              onGenerate={handleGenerate}
              onCopy={copyText}
              onOpenInbox={() => setMode("inbox")}
            />
          )}

          {hydrated && mode === "bulk" && (
            <BulkPanel
              domain={domain}
              onSaved={(list) => {
                addAccounts(list);
                pushToast("ok", `${list.length} alamat disimpan ke riwayat`);
              }}
              onCopied={copyText}
            />
          )}

          {hydrated && mode === "inbox" && (
            <>
              {active && (
                <ActiveCard
                  account={active}
                  count={messages.length}
                  generating={generating}
                  onCopy={copyText}
                  onGenerate={() => void handleGenerate(active.provider)}
                />
              )}
              <InboxList
                messages={messages}
                state={inboxState}
                active={!!active}
                refreshing={refreshing}
                lastSync={lastSync}
                address={active?.address ?? null}
                onOpen={(id) => setOpenId(id)}
                onRefresh={() => active && fetchInbox(active, true)}
                onGenerate={() => void handleGenerate(provider)}
              />
              <HistoryPanel
                accounts={accounts}
                activeId={activeId}
                onSelect={useAccount}
                onDelete={handleDelete}
                onClearAll={handleClearAll}
                onCopy={copyText}
              />
            </>
          )}

          {hydrated && mode === "menu" && accounts.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold">Lanjut dengan alamat tersimpan</h2>
              <HistoryPanel
                accounts={accounts}
                activeId={activeId}
                onSelect={useAccount}
                onDelete={handleDelete}
                onClearAll={handleClearAll}
                onCopy={copyText}
              />
            </section>
          )}

          <Faq />

          <footer className="pt-2 text-center text-xs text-[var(--color-muted)]">
            <p className="inline-flex items-center gap-1.5">
              <IconTrash size={13} />
              Jangan pakai untuk data sensitif. Email sementara bisa hilang kapan saja.
            </p>
            <p className="mt-1">
              Didukung API publik <span className="font-semibold">mail.tm</span> &amp;{" "}
              <span className="font-semibold">mail.gw</span> · alat verifikasi, bukan pengaktif
              langganan.
            </p>
          </footer>
        </div>
      )}

      <Toaster items={toasts} onDismiss={dismissToast} />
    </>
  );
}
