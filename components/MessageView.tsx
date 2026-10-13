"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId } from "@/lib/providers";
import type { MessageDetail } from "@/lib/types";
import {
  extractCodes,
  extractLinks,
  htmlToPlain,
  relativeTime,
  sanitizeHtml,
} from "@/lib/format";
import {
  IconAlert,
  IconBack,
  IconCheck,
  IconClock,
  IconCopy,
  IconKey,
  IconLink,
} from "./icons";

type Props = {
  provider: ProviderId;
  token: string;
  messageId: string;
  seed?: Partial<MessageDetail>;
  onBack: () => void;
  onCopied: (text: string, label: string) => void;
};

export default function MessageView({ provider, token, messageId, seed, onBack, onCopied }: Props) {
  const [msg, setMsg] = useState<MessageDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<"html" | "text">("html");
  const [showHtml, setShowHtml] = useState<boolean>(true);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    let alive = true;
    setState("loading");
    (async () => {
      try {
        const { getMessage } = await import("@/lib/api");
        const detail = await getMessage(provider, token, messageId);
        if (!alive) return;
        setMsg(detail);
        setState("ready");
        setShowHtml(!!(detail.html && detail.html.length));
      } catch {
        if (!alive) return;
        if (seed?.subject) {
          setMsg(seed as MessageDetail);
          setState("ready");
        } else {
          setState("error");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [provider, token, messageId, seed]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [state]);

  const html = useMemo(() => {
    if (!msg?.html || msg.html.length === 0) return "";
    return sanitizeHtml(msg.html.join("\n"));
  }, [msg]);

  const plain = useMemo(() => {
    if (msg?.text && msg.text.trim()) return msg.text;
    if (msg?.html && msg.html.length) return htmlToPlain(msg.html.join("\n"));
    return "(Email ini tidak punya isi teks.)";
  }, [msg, html]);

  const links = useMemo(() => extractLinks(plain, msg?.html), [plain, msg?.html]);
  const codes = useMemo(() => extractCodes(plain, msg?.html), [plain, msg?.html]);

  const fromName = msg?.from?.name?.trim() || msg?.from?.address || "Pengirim tidak dikenal";

  return (
    <section className="rise space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-[var(--color-ink)] ring-1 ring-[var(--color-line)] transition hover:bg-[var(--color-surface2)]"
      >
        <IconBack size={18} />
        Kembali ke inbox
      </button>

      {state === "loading" && (
        <div className="space-y-3 rounded-[var(--radius-blob)] bg-white p-5 ring-1 ring-[var(--color-line)]">
          <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--color-line)]" />
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-[var(--color-line)]" />
          <div className="h-3 w-full animate-pulse rounded-full bg-[var(--color-line)]" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-[var(--color-line)]" />
          <p className="text-xs text-[var(--color-muted)]">Membuka isi email…</p>
        </div>
      )}

      {state === "error" && (
        <div className="flex items-start gap-3 rounded-[var(--radius-blob)] bg-white p-5 ring-1 ring-[var(--color-line)]">
          <IconAlert className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
          <div>
            <p className="font-bold">Tidak bisa membuka email ini.</p>
            <p className="text-sm text-[var(--color-muted)]">
              Pesan mungkin sudah kedaluwarsa. Coba muat ulang inbox.
            </p>
          </div>
        </div>
      )}

      {state === "ready" && msg && (
        <>
          <article className="rounded-[var(--radius-blob)] bg-white p-5 ring-1 ring-[var(--color-line)]">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-semibold leading-snug sm:text-2xl"
            >
              {msg.subject || "(Tanpa subjek)"}
            </h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-[var(--color-muted)]">Dari</dt>
                <dd className="min-w-0 break-words font-semibold">{fromName}</dd>
              </div>
              {msg.from?.name && msg.from?.address && (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-[var(--color-muted)]">Email</dt>
                  <dd className="min-w-0 break-words font-mono text-xs">{msg.from.address}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-[var(--color-muted)]">Waktu</dt>
                <dd className="inline-flex items-center gap-1">
                  <IconClock size={15} className="text-[var(--color-muted)]" />
                  {relativeTime(msg.createdAt)}
                </dd>
              </div>
            </dl>
          </article>

          {codes.length > 0 && (
            <div className="rounded-[var(--radius-blob)] bg-[color-mix(in_srgb,var(--color-sun)_28%,white)] p-4 ring-1 ring-[color-mix(in_srgb,var(--color-accent)_35%,white)]">
              <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold">
                <IconKey size={17} /> Kode terdeteksi
              </p>
              <div className="flex flex-wrap gap-2">
                {codes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onCopied(c, "Kode")}
                    className="cursor-pointer rounded-xl bg-white px-3 py-1.5 font-mono text-lg font-bold tracking-widest ring-1 ring-[var(--color-line)] transition hover:bg-[var(--color-surface2)]"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div className="rounded-[var(--radius-blob)] bg-white p-4 ring-1 ring-[var(--color-line)]">
              <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold">
                <IconLink size={17} /> Link (klik untuk menyalin)
              </p>
              <ul className="space-y-2">
                {links.map((u) => (
                  <li key={u} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onCopied(u, "Link")}
                      title={u}
                      className="min-w-0 flex-1 cursor-pointer truncate rounded-lg bg-[var(--color-surface2)] px-3 py-2 text-left text-xs font-medium text-[var(--color-primary)] ring-1 ring-[var(--color-line)] transition hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,white)]"
                    >
                      {u}
                    </button>
                    <a
                      href={u}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="shrink-0 cursor-pointer rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-primary2)]"
                    >
                      Buka
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-[var(--radius-blob)] bg-white p-4 ring-1 ring-[var(--color-line)]">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex rounded-full bg-[var(--color-surface2)] p-1 ring-1 ring-[var(--color-line)]">
                <button
                  type="button"
                  onClick={() => setTab("html")}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-bold transition ${
                    tab === "html" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted)]"
                  }`}
                >
                  Tampilan
                </button>
                <button
                  type="button"
                  onClick={() => setTab("text")}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-bold transition ${
                    tab === "text" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted)]"
                  }`}
                >
                  Teks
                </button>
              </div>
              <button
                type="button"
                onClick={() => onCopied(plain, "Isi email")}
                className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-bold ring-1 ring-[var(--color-line)] transition hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,white)]"
              >
                <IconCopy size={16} /> Salin isi
              </button>
            </div>

            {tab === "html" ? (
              html && showHtml ? (
                <div
                  className="mail-body thin-scroll max-h-[60vh] overflow-auto rounded-xl bg-[var(--color-surface2)] p-3 text-sm"
                  // Konten sudah dilewatkan sanitizeHtml() di atas.
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <p className="rounded-xl bg-[var(--color-surface2)] p-3 text-sm text-[var(--color-muted)]">
                  Email ini tidak punya versi HTML. Lihat tab <b>Teks</b>.
                </p>
              )
            ) : (
              <pre className="thin-scroll max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--color-surface2)] p-3 font-sans text-sm">
                {plain}
              </pre>
            )}

            <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <IconCheck size={14} className="text-[var(--color-good)]" />
              HTML email sudah dibersihkan otomatis (skrip & iframe dibuang).
            </p>
          </div>
        </>
      )}
    </section>
  );
}