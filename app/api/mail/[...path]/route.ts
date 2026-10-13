/**
 * Proxy API ke mail.tm.
 *
 * Browser tidak boleh memanggil api.mail.tm langsung (tidak ada header CORS),
 * jadi semua request lewat route server ini. Token JWT hanya melintas sebagai
 * header Authorization dan tidak pernah ditulis ke log.
 */
import { NextResponse } from "next/server";

const UPSTREAM = "https://api.mail.tm";
const ALLOWED = new Set(["domains", "accounts", "token", "messages"]);
const MAX_BODY = 8 * 1024;

export const runtime = "nodejs";
export const maxDuration = 30;

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const segments = path ?? [];

  if (segments.length === 0 || !ALLOWED.has(segments[0])) {
    return NextResponse.json({ message: "Endpoint tidak diizinkan." }, { status: 403 });
  }

  const url = new URL(request.url);
  const target = `${UPSTREAM}/${segments.map(encodeURIComponent).join("/")}${url.search}`;

  let body: string | undefined;
  if (request.method === "POST") {
    body = await request.text();
    if (body.length > MAX_BODY) {
      return NextResponse.json({ message: "Payload terlalu besar." }, { status: 413 });
    }
  }

  const auth = request.headers.get("authorization");
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "tempmail-inbox/1.0",
  };
  if (body) headers["Content-Type"] = "application/json";
  if (auth) headers["Authorization"] = auth;

  let res: Response;
  try {
    res = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "follow",
    });
  } catch (err) {
    return NextResponse.json(
      {
        message: "Tidak bisa menghubungi server email. Coba lagi.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;