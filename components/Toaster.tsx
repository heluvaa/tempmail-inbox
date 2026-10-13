"use client";

import { useEffect } from "react";
import type { Toast } from "@/lib/types";
import { IconAlert, IconCheck, IconMail } from "./icons";

export default function Toaster({
  items,
  onDismiss,
}: {
  items: Toast[];
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((t) => window.setTimeout(() => onDismiss(t.id), 2600));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [items, onDismiss]);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="pop pointer-events-auto flex max-w-sm items-center gap-2 rounded-full bg-[var(--color-ink)] px-4 py-2.5 text-sm font-bold text-white shadow-lg"
        >
          {t.kind === "ok" && <IconCheck size={17} className="text-[#4ade80]" />}
          {t.kind === "err" && <IconAlert size={17} className="text-[#fda4af]" />}
          {t.kind === "info" && <IconMail size={17} className="text-[#fcd34d]" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}