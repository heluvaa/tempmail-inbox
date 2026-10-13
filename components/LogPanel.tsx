"use client";

import { useEffect, useRef } from "react";
import type { LogLine } from "@/lib/types";
import { IconTerminal } from "./icons";

const LEVEL_CLASS: Record<LogLine["level"], string> = {
  info: "text-[#e9d5ff]",
  ok: "text-[#86efac]",
  warn: "text-[#fcd34d]",
  err: "text-[#fda4af]",
};

function clock(t: number): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date(t));
  } catch {
    return new Date(t).toTimeString().slice(0, 8);
  }
}

export default function LogPanel({
  lines,
  running = false,
  emptyHint = "Log akan muncul di sini.",
}: {
  lines: LogLine[];
  running?: boolean;
  emptyHint?: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="overflow-hidden rounded-2xl bg-[#241531] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_35%,black)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <IconTerminal size={15} className="text-[#c4b5fd]" />
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#c4b5fd]">
          Log progres
        </span>
        {running && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#a7f3d0]">
            <span className="ring-live inline-block h-1.5 w-1.5 rounded-full bg-[#34d399]" aria-hidden />
            berjalan
          </span>
        )}
      </div>
      <div ref={boxRef} className="thin-scroll max-h-64 min-h-24 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed">
        {lines.length === 0 ? (
          <p className="text-white/45">{emptyHint}</p>
        ) : (
          <ul className="space-y-0.5">
            {lines.map((l, i) => (
              <li key={`${l.t}-${i}`} className={LEVEL_CLASS[l.level]}>
                <span className="text-white/40">[{clock(l.t)}]</span> {l.msg}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
