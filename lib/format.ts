export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 45) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} jam lalu`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} hari lalu`;
  return fullDate(iso);
}

export function fullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(d);
  } catch {
    return d.toTimeString().slice(0, 5);
  }
}

const LINK_RE = /https?:\/\/[^\s"'<>)\]]+/g;

export function extractLinks(text?: string, html?: string[]): string[] {
  const raw = `${text ?? ""} ${(html ?? []).join(" ")}`;
  const found = raw.match(LINK_RE) ?? [];
  const cleaned = found.map((u) =>
    u
      .replace(/&amp;/g, "&")
      .replace(/&#x2F;/gi, "/")
      .replace(/&quot;/g, '"')
      .replace(/[.,;:]+$/, ""),
  );
  return Array.from(new Set(cleaned));
}

const CODE_HINT = /(kode|otp|verifikasi|verification|code|pin|token|sandi|password)/i;
const CODE_RE = /\b(\d{4,8})\b/g;

export function extractCodes(text?: string, html?: string[]): string[] {
  const body = `${text ?? ""} ${(html ?? []).join(" ")}`.replace(/<[^>]+>/g, " ");
  if (!CODE_HINT.test(body)) return [];
  const found = body.match(CODE_RE) ?? [];
  return Array.from(new Set(found)).slice(0, 4);
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Sanitasi HTML email sebelum dirender. Hapus skrip, iframe, event handler,
 * dan URL berbahaya. Dipakai hanya di client (butuh DOMParser).
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(dirty, "text/html");

  doc
    .querySelectorAll("script, iframe, object, embed, form, input, button, link, meta, base, noscript")
    .forEach((el) => el.remove());

  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      else if ((name === "href" || name === "src" || name === "xlink:href") && /^(javascript|data|vbscript):/.test(value))
        el.removeAttribute(attr.name);
      else if (name === "style" && /expression|url\s*\(\s*['"]?\s*javascript/i.test(value))
        el.removeAttribute(attr.name);
    }
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });

  if (doc.body) {
    doc.querySelectorAll("style").forEach((s) => s.remove());
  }

  return doc.body ? doc.body.innerHTML : "";
}