/**
 * Proxy API ke penyedia tempmail yang tanpa CORS (mail.tm / mail.gw).
 *
 * Permukaan API keduanya identik (API Platform / Hydra), jadi satu route
 * menangani semua lewat segmen pertama = id provider:
 *
 *   GET  /api/mail/mailtm/domains      -> https://api.mail.tm/domains
 *   GET  /api/mail/mailgw/messages     -> https://api.mail.gw/messages
 *
 * Browser tidak boleh memanggil upstream langsung (tanpa header CORS),
 * makanya semua trafik lewat server ini. Token JWT hanya melintas sebagai
 * header Authorization dan tidak pernah ditulis ke log.
 */
import { NextResponse } from "next/server";

const ALLOWED = new Set(["domains", "accounts", "token", "messages"]);
const MAX_BODY = 16 * 1024;
/** 3 percobaan total untuk kegagalan sementara (rate limit / IP diblokir). */
const ATTEMPTS = 3;

const PROVIDERS: Record<string, { base: string; ua: string }> = {
  mailtm: { base: "https://api.mail.tm", ua: "tempmail-inbox/2.0 (mail.tm)" },
  mailgw: { base: "https://api.mail.gw", ua: "tempmail-inbox/2.0 (mail.gw)" },
};

/**
 * tempmail.ing TIDAK diproksikan. Header CORS-nya `access-control-allow-origin: *`
 * (terverifikasi) dan browser memanggilnya langsung — lihat lib/tempmailing.ts.
 * Yang lewat server hanya probe kesehatan, memakai /health milik mereka supaya
 * tidak menghabiskan kuota generate (2/menit per IP).
 */
const TMI = { base: "https://api.tempmail.ing", ua: "tempmail-inbox/2.0 (tempmail.ing)" };

export const runtime = "nodejs";
export const maxDuration = 30;

type Ctx = { params: Promise<{ path: string[] }> };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Uji kelayakan provider dari sisi server (egress Vercel). Upstream kadang
 * menolak IP datacenter dengan 500 kosong — hasil probe ini yang menentukan
 * provider mana yang ditawarkan ke pengguna.
 */
async function probe(base: string, ua: string) {
  try {
    const res = await fetch(`${base}/domains`, {
      headers: { Accept: "application/json", "User-Agent": ua },
      cache: "no-store",
      signal: AbortSignal.timeout(9_000),
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      domains: text.length,
      detail: res.ok ? "" : text.slice(0, 160),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      domains: 0,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Probe tmi: /health saja — tidak menyentuh /api/generate yang dibatasi 2/menit. */
async function probeTmi() {
  try {
    const res = await fetch(`${TMI.base}/health`, {
      headers: { Accept: "application/json", "User-Agent": TMI.ua },
      cache: "no-store",
      signal: AbortSignal.timeout(9_000),
    });
    const text = await res.text();
    let status = "";
    try {
      status = String(JSON.parse(text)?.status ?? "");
    } catch {
      status = "";
    }
    return {
      ok: res.ok && status === "ok",
      status: res.status,
      domains: 0,
      detail: res.ok ? (status === "ok" ? "" : `status=${status || "?"}`) : text.slice(0, 160),
    };
  } catch (err) {
    return { ok: false, status: 0, domains: 0, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function health() {
  const results = await Promise.all([
    ...Object.entries(PROVIDERS).map(async ([id, { base, ua }]) => ({
      provider: id,
      base,
      ...(await probe(base, ua)),
    })),
    { provider: "tmi", base: TMI.base, ...(await probeTmi()) },
  ]);
  const usable = results.filter((r) => r.ok).map((r) => r.provider);
  return NextResponse.json(
    { checkedAt: new Date().toISOString(), usable, results },
    { headers: { "cache-control": "no-store" } },
  );
}

async function proxy(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const segments = path ?? [];

  if (segments[0] === "health") return health();

  const provider = PROVIDERS[segments[0]];
  if (!provider || segments.length < 2 || !ALLOWED.has(segments[1])) {
    return NextResponse.json({ message: "Endpoint tidak diizinkan." }, { status: 403 });
  }

  const url = new URL(request.url);
  const rest = segments.slice(1).map(encodeURIComponent).join("/");
  const target = `${provider.base}/${rest}${url.search}`;

  let body: string | undefined;
  if (request.method === "POST" || request.method === "PATCH") {
    body = await request.text();
    if (body.length > MAX_BODY) {
      return NextResponse.json({ message: "Payload terlalu besar." }, { status: 413 });
    }
  }

  const auth = request.headers.get("authorization");
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": provider.ua,
  };
  if (body) headers["Content-Type"] = "application/json";
  if (auth) headers["Authorization"] = auth;

  let lastStatus = 0;
  let lastText = "";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(target, {
        method: request.method,
        headers,
        body,
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
      });
    } catch (err) {
      console.error(`[mail-proxy] fetch error ${target} (coba ${attempt})`, err);
      lastStatus = 0;
      lastText = err instanceof Error ? err.message : String(err);
      if (attempt < ATTEMPTS) {
        await sleep(600 * attempt);
        continue;
      }
      return NextResponse.json(
        {
          message: "Tidak bisa menghubungi server email. Coba provider lain.",
          detail: lastText.slice(0, 200),
          provider: segments[0],
        },
        { status: 502 },
      );
    }

    lastStatus = res.status;
    lastText = await res.text();

    // 429/5xx = kondisi sementara → mundur dan coba lagi sebelum menyerah.
    if ((lastStatus === 429 || lastStatus >= 500) && attempt < ATTEMPTS) {
      console.log(`[mail-proxy] ${lastStatus} dari ${target}, retry ${attempt}`);
      await sleep(lastStatus === 429 ? 1200 * attempt : 700 * attempt);
      continue;
    }

    console.log(
      "[mail-proxy]",
      request.method,
      target,
      "->",
      lastStatus,
      "bytes:",
      lastText.length,
    );

    // 500 kosong dari upstream biasanya = IP datacenter ditolak. Beri pesan
    // yang bisa ditindak client supaya ia pindah provider.
    if (lastStatus >= 500 && !lastText.trim()) {
      return NextResponse.json(
        {
          message: `Provider ${segments[0]} menolak server ini (kemungkinan blokir IP). Ganti provider.`,
          status: lastStatus,
          provider: segments[0],
          switchable: true,
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    return new NextResponse(lastText || "{}", {
      status: lastStatus,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  }

  return NextResponse.json(
    { message: "Gagal menghubungi upstream.", status: lastStatus, provider: segments[0] },
    { status: 502 },
  );
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
