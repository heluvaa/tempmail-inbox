import type { ProviderId } from "./providers";

export type Account = {
  id: string;
  address: string;
  password: string;
  token: string;
  provider: ProviderId;
  createdAt: number;
  /** epoch ms — hanya provider berumur (tmi). Provider lain: undefined. */
  expiresAt?: number;
};

export type MailAddress = { address: string; name?: string };

export type MessageSummary = {
  id: string;
  from: MailAddress;
  to?: MailAddress[];
  subject: string;
  intro: string;
  seen: boolean;
  hasAttachments: boolean;
  createdAt: string;
};

export type MessageDetail = MessageSummary & {
  text?: string;
  html?: string[];
  downloadUrl?: string;
};

export type ToastKind = "ok" | "err" | "info";
export type Toast = { id: number; kind: ToastKind; text: string };

export type Mode = "menu" | "gen" | "bulk" | "inbox";

export type LogLevel = "info" | "ok" | "warn" | "err";

export type LogLine = {
  t: number;
  /** Label langkah, mis. "[3/20] Membuat tempmail…" */
  msg: string;
  level: LogLevel;
};

export type BulkResult = {
  index: number;
  address: string;
  password: string;
  provider: ProviderId;
  createdAt: number;
  /** true kalau alamat siap dipakai (akun + token berhasil dibuat). */
  inboxReady: boolean;
  error?: string;
};
