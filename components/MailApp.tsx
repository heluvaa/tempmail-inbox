"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Account, MessageSummary, Toast, ToastKind } from "@/lib/types";
import { provisionAccount, listMessages } from "@/lib/api";
import {
  loadAccounts,
  loadActiveId,
  newId,
  saveAccounts,
  saveActiveId,
} from "@/lib/storage";
import ActiveCard from "./ActiveCard";
import InboxList from "./InboxList";
import HistoryPanel from "./HistoryPanel";
import MessageView from "./MessageView";
import Toaster from "./Toaster";
import { IconMail, IconShield, IconSparkles, IconTrash, IconClock } from "./icons";
import Faq from "./Faq";

const POLL_MS = 10_000;
const MAX_HISTORY = 12;

export default function MailApp() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [inboxState, setInboxState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hydrated, setHydrated] = useState(false);

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
    setAccounts(saved);
    setActiveId(savedActive && saved.some((a) => a.id === savedActive) ? savedActive : saved[0]?.id ?? null);
    setHydrated(true);
  }, []);

  // Persist setiap perubahan.
  useEffect(() => {
    if (hydrated) saveAccounts(accounts);
  }, [accounts, hydrated]);

  useEffect(() => {
    if (hydrated) saveActiveId(activeId);
  }, [activeId, hydrated]);

  const fetchInbox = useCallback(
    async (token: string, spinner: boolean) => {
      if (fetching.current) return;
      fetching.current = true;
      if (spinner) setRefreshing(true);
      try {
        const list = await listMessages(token);
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

  // Polling inbox alamat aktif setiap 10 detik (hanya alamat aktif).
  useEffect(() => {
    if (!active) {
      setMessages([]);
      setInboxState("idle");
      setLastSync(null);
      return;
    }
    let alive = true;
    setInboxState("loading");
    setMessages([]);
    void fetchInbox(active.token, false);
    const timer = window.setInterval(() => {
      if (!alive) return;
      void fetchInbox(active.token, false);
    }, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [active, fetchInbox]);

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const { address, password, token } = await provisionAccount();
      const account: Account = { id: newId(), address, password, token, createdAt: Date.now() };
      setAccounts((prev) => [account, ...prev].slice(0, MAX_HISTORY));
      setActiveId(account.id);
      setOpenId(null);
      pushToast("ok", "Alamat baru siap dipakai");
    } catch {
      pushToast("err", "Gagal membuat alamat. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  }, [generating, pushToast]);

  const copyText = useCallback(
    async (text: string, label: string) => {
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

  return (
    <>
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white">
          <IconMail size={24} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold leading-none sm:text-3xl">
            Tempmail Inbox
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Email sementara, langsung di browser. Tanpa daftar.
          </p>
        </div>
      </header>

      {openId && active ? (
        <MessageView
          token={active.token}
          messageId={openId}
          seed={messages.find((m) => m.id === openId)}
          onBack={() => setOpenId(null)}
          onCopied={copyText}
        />
      ) : (
        <div className="space-y-6">
          {!hydrated && (
            <div className="rounded-[var(--radius-blob)] bg-white p-5 ring-1 ring-[var(--color-line)]">
              <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--color-line)]" />
              <div className="mt-3 h-12 w-full animate-pulse rounded-2xl bg-[var(--color-line)]" />
              <div className="mt-4 h-12 w-full animate-pulse rounded-2xl bg-[var(--color-line)]" />
            </div>
          )}

          {hydrated && active && (
            <ActiveCard
              account={active}
              count={messages.length}
              generating={generating}
              onCopy={copyText}
              onGenerate={handleGenerate}
            />
          )}

          {hydrated && !active && (
            <section className="rounded-[var(--radius-blob)] bg-white p-8 text-center ring-1 ring-[var(--color-line)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)]">
                <IconSparkles size={30} className="text-[var(--color-primary)]" />
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold">Mulai dalam 1 klik</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--color-muted)]">
                Buat alamat sementara untuk pendaftaran, verifikasi, atau menghindari spam.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-6 py-3.5 font-display text-base font-semibold text-white transition hover:bg-[var(--color-primary2)] active:scale-[0.99] disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                    Membuat alamat…
                  </>
                ) : (
                  <>
                    <IconSparkles size={18} /> Buat alamat baru
                  </>
                )}
              </button>
            </section>
          )}

          <InboxList
            messages={messages}
            state={inboxState}
            active={!!active}
            refreshing={refreshing}
            lastSync={lastSync}
            onOpen={(id) => setOpenId(id)}
            onRefresh={() => active && fetchInbox(active.token, true)}
          />

          <div className="grid grid-cols-3 gap-3">
            <Feature icon={<IconSparkles size={22} />} title="1 klik" body="Alamat langsung jadi" />
            <Feature icon={<IconClock size={22} />} title="10 detik" body="Cek inbox otomatis" />
            <Feature icon={<IconShield size={22} />} title="Lokal" body="Sandi di browser kamu" />
          </div>

          <HistoryPanel
            accounts={accounts}
            activeId={activeId}
            onSelect={(id) => {
              setActiveId(id);
              setOpenId(null);
            }}
            onDelete={handleDelete}
            onClearAll={handleClearAll}
            onCopy={copyText}
          />

          <Faq />

          <footer className="pt-2 text-center text-xs text-[var(--color-muted)]">
            <p className="inline-flex items-center gap-1.5">
              <IconTrash size={13} />
              Jangan pakai untuk data sensitif. Email sementara bisa hilang kapan saja.
            </p>
            <p className="mt-1">
              Didukung API publik <span className="font-semibold">mail.tm</span> · dibuat untuk
              keperluan verifikasi.
            </p>
          </footer>
        </div>
      )}

      <Toaster items={toasts} onDismiss={dismissToast} />
    </>
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