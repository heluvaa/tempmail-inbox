export type Account = {
  id: string;
  address: string;
  password: string;
  token: string;
  createdAt: number;
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