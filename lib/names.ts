/** Pembuat nama alamat acak yang terlihat natural (bukan deretan hash). */

const ADJ = [
  "calm", "swift", "bright", "quiet", "lucky", "amber", "mist", "nova", "pixel", "solar",
  "vivid", "echo", "ember", "frost", "gentle", "hyper", "ivory", "jolly", "keen", "lunar",
];

const NOUN = [
  "otter", "falcon", "maple", "circuit", "harbor", "meteor", "quartz", "ribbon", "citrus", "delta",
  "summit", "vertex", "willow", "cobalt", "dune", "atlas", "orbit", "prism", "ridge", "sonar",
];

function pick<T>(arr: T[]): T {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
  const n = (bytes[0] << 8 | bytes[1]) % arr.length;
  return arr[n];
}

/** "swift-otter42" — huruf kecil, angka, tanda hubung. Tanpa titik: sebagian
 *  provider menormalkan titik di bagian lokal sehingga alamat yang tersimpan
 *  berbeda dari yang kita minta dan login baliknya gagal. */
export function randomLocal(): string {
  return `${pick(ADJ)}${pick(NOUN)}${Math.floor(Math.random() * 900) + 100}`;
}

/** Nama untuk kolom opsional (pratinjau). */
export function randomLabel(): string {
  return `${pick(ADJ)}-${pick(NOUN)}`;
}

/**
 * Sanitasi nama alamat yang diketik pengguna.
 * mail.tm menolak titik di bagian lokal (dinormalkan lalu divalidasi ulang dan
 * gagal), jadi titik dibuang. Sisanya: huruf kecil, angka, hubung, garis bawah.
 */
export function sanitizeLocal(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^[-_.]+/, "")
    .slice(0, 30);
}

const SHORT = "abcdefghijkmnpqrstuvwxyz23456789";

/** "anton" → "anton7k4" — unik per akun supaya bulk tidak tabrakan alamat. */
export function withSuffix(base: string): string {
  let out = "";
  const bytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
  for (let i = 0; i < 4; i++) out += SHORT[bytes[i] % SHORT.length];
  return `${base}${out}`;
}
