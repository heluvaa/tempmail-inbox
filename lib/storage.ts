import type { Account } from "./types";

const KEY_ACCOUNTS = "tempmail.accounts.v1";
const KEY_ACTIVE = "tempmail.active.v1";

const isBrowser = () => typeof window !== "undefined";

export function loadAccounts(): Account[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY_ACCOUNTS);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is Account =>
        !!a && typeof a === "object" && typeof (a as Account).address === "string",
    );
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: Account[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch {
    /* storage penuh / mode privat: abaikan, state tetap hidup di memori */
  }
}

export function loadActiveId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(KEY_ACTIVE);
}

export function saveActiveId(id: string | null): void {
  if (!isBrowser()) return;
  try {
    if (id) window.localStorage.setItem(KEY_ACTIVE, id);
    else window.localStorage.removeItem(KEY_ACTIVE);
  } catch {
    /* abaikan */
  }
}

export function newId(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}