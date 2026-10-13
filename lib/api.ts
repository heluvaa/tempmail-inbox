import type { Account, MessageDetail, MessageSummary } from "./types";

/**
 * Klien untuk proxy kita sendiri (/api/mail/*). Semua panggilan same-origin,
 * jadi tidak ada masalah CORS. Token hanya lewat header Authorization.
 */
export class MailError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "MailError";
  }
}

type Members<T> = { "hydra:member"?: T[]; "hydra:totalItems"?: number };

function asMembers<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const m = (data as Members<T>)["hydra:member"];
    if (Array.isArray(m)) return m;
  }
  return [];
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const res = await fetch(`/api/mail/${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const raw = await res.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const obj = (data ?? {}) as Record<string, unknown>;
    const msg =
      (typeof obj["hydra:description"] === "string" && obj["hydra:description"]) ||
      (typeof obj.message === "string" && obj.message) ||
      (typeof obj.detail === "string" && obj.detail) ||
      `Gagal (${res.status})`;
    throw new MailError(msg, res.status);
  }
  return data as T;
}

export async function getDomain(): Promise<string> {
  const data = await call<unknown>("domains");
  const domains = asMembers<{ domain: string; isActive: boolean }>(data);
  const active = domains.find((d) => d.isActive) ?? domains[0];
  if (!active?.domain) throw new MailError("Tidak ada domain aktif dari penyedia.", 503);
  return active.domain;
}

export async function createAccount(address: string, password: string) {
  return call<{ id: string; address: string }>("accounts", {
    method: "POST",
    body: { address, password },
  });
}

export async function getToken(address: string, password: string): Promise<string> {
  const data = await call<{ token?: string }>("token", {
    method: "POST",
    body: { address, password },
  });
  if (!data?.token) throw new MailError("Token tidak diterima.", 502);
  return data.token;
}

export async function listMessages(token: string): Promise<MessageSummary[]> {
  const data = await call<unknown>("messages", { token });
  return asMembers<MessageSummary>(data);
}

export async function getMessage(token: string, id: string): Promise<MessageDetail> {
  return call<MessageDetail>(`messages/${encodeURIComponent(id)}`, { token });
}

export async function markSeen(token: string, id: string): Promise<void> {
  await call(`messages/${encodeURIComponent(id)}`, { method: "GET", token });
}

/** Buat akun baru: alamat + password dibuat di sisi klien. */
export async function provisionAccount(): Promise<{ address: string; password: string; token: string }> {
  const domain = await getDomain();
  const local = `inbox${randToken(10)}`;
  const address = `${local}@${domain}`;
  const password = `${randToken(8)}${randToken(6)}`;
  await createAccount(address, password);
  const token = await getToken(address, password);
  return { address, password, token };
}

export function isAccount(a: Account | undefined | null): a is Account {
  return !!a && typeof a.address === "string" && typeof a.token === "string";
}

function randToken(len: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}