import type { Account } from "./types";
import { isProviderId, PROVIDERS, PROVIDER_ORDER, type ProviderId } from "./providers";

const KEY_ACCOUNTS = "tempmail.accounts.v2";
const KEY_ACTIVE = "tempmail.active.v2";
const KEY_LEGACY_ACCOUNTS = "tempmail.accounts.v1";
const KEY_LEGACY_ACTIVE = "tempmail.active.v1";
const KEY_MODE = "tempmail.mode.v1";

const isBrowser = () => typeof window !== "undefined";

function normalize(raw: unknown): Account | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Partial<Account>;
  if (typeof a.address !== "string" || typeof a.token !== "string" || typeof a.id !== "string")
    return null;
  const provider = isProviderId(a.provider) ? a.provider : PROVIDER_ORDER[0];
  const out: Account = {
    id: a.id,
    address: a.address,
    password: typeof a.password === "string" ? a.password : "",
    token: a.token,
    provider,
    createdAt: typeof a.createdAt === "number" ? a.createdAt : Date.now(),
  };
  // Hanya provider berumur (tmi) yang punya masa berlaku; alamat mail.tm
  // lama yang kebetulan punya field ini tidak boleh ikut dianggap berumur.
  if (typeof a.expiresAt === "number" && PROVIDERS[provider].ephemeral) out.expiresAt = a.expiresAt;
  return out;
}

function read(key: string): unknown[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadAccounts(): Account[] {
  if (!isBrowser()) return [];
  let list = read(KEY_ACCOUNTS).map(normalize).filter((a): a is Account => !!a);
  // Migrasi satu arah dari skema v1 (tanpa provider).
  if (list.length === 0) {
    list = read(KEY_LEGACY_ACCOUNTS).map(normalize).filter((a): a is Account => !!a);
    if (list.length) {
      saveAccounts(list);
      const legacyActive = window.localStorage.getItem(KEY_LEGACY_ACTIVE);
      if (legacyActive) saveActiveId(legacyActive);
    }
  }
  return list;
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
  return window.localStorage.getItem(KEY_ACTIVE) ?? window.localStorage.getItem(KEY_LEGACY_ACTIVE);
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

/** Provider terakhir yang dipakai bulk — supaya generator tidak selalu nyoba ulang yang gagal. */
export function loadPreferredProvider(): ProviderId | null {
  if (!isBrowser()) return null;
  const v = window.localStorage.getItem("tempmail.provider.v1");
  return isProviderId(v) ? v : null;
}

export function savePreferredProvider(p: ProviderId): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem("tempmail.provider.v1", p);
  } catch {
    /* abaikan */
  }
}

export function newId(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const VALID_MODES = ["menu", "gen", "bulk", "inbox"] as const;

export function loadMode(): string | null {
  if (!isBrowser()) return null;
  const v = window.localStorage.getItem(KEY_MODE);
  return (VALID_MODES as readonly string[]).includes(v ?? "") ? v : null;
}

export function saveMode(mode: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY_MODE, mode);
  } catch {
    /* abaikan */
  }
}
