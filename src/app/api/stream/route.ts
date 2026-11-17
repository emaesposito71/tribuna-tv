/**
 * Proxy di streaming — /api/stream?url=<flusso>&h=<headers base64url>
 *
 * - scarica il flusso lato server (niente CORS, niente mixed-content,
 *   header personalizzati possibili) e lo inoltra al browser;
 * - riscrive i manifest HLS (.m3u8) e DASH (.mpd) così che anche
 *   segmenti, chiavi e varianti passino dal proxy;
 * - supporta richieste Range (necessarie per alcuni player).
 */

import { NextRequest, NextResponse } from "next/server";
import { decodeStreamHeaders } from "@/lib/proxy";

export const dynamic = "force-dynamic";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** URL che non vanno riscritti (namespace XML ecc.) */
const SKIP_HOSTS = /w3\.org|dashif\.org|xml\.org|standards\.iso\.org/i;

function isBlockedHost(hostname: string): boolean {
  return (
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./i.test(hostname) ||
    hostname === "::1" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  );
}

function proxied(
  uri: string,
  base: string | null,
  hParam: string | null,
): string {
  let abs: string;
  try {
    abs = base ? new URL(uri, base).toString() : new URL(uri).toString();
  } catch {
    return uri;
  }
  if (!/^https?:/i.test(abs)) return abs;
  let host: string;
  try {
    host = new URL(abs).hostname;
  } catch {
    return abs;
  }
  if (SKIP_HOSTS.test(host)) return abs;
  const params = new URLSearchParams({ url: abs });
  if (hParam) params.set("h", hParam);
  return `/api/stream?${params.toString()}`;
}

/** Riscrive i manifest HLS: ogni linea non-commento e ogni URI="…" → proxy */
function rewriteHls(text: string, base: string, hParam: string | null): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => `URI="${proxied(uri, base, hParam)}"`);
      }
      return proxied(t, base, hParam);
    })
    .join("\n");
}

/** Riscrive i manifest DASH: tutti gli URL http(s) → proxy (gestendo &amp;) */
function rewriteMpd(text: string, hParam: string | null): string {
  return text.replace(/https?:\/\/[^"'<>\s\\]+/g, (match) => {
    const url = match.replace(/&amp;/g, "&");
    const rewritten = proxied(url, null, hParam);
    return rewritten.replace(/&/g, "&amp;");
  });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const urlParam = sp.get("url");
  const hParamRaw = sp.get("h");

  if (!urlParam) {
    return new NextResponse("Parametro 'url' mancante", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return new NextResponse("URL non valido", { status: 400 });
  }
  if (!/^https?:$/.test(target.protocol) || isBlockedHost(target.hostname)) {
    return new NextResponse("URL non consentito", { status: 403 });
  }

  const custom = decodeStreamHeaders(hParamRaw);
  const fwd: Record<string, string> = {
    "user-agent": custom["User-Agent"] ?? custom["user-agent"] ?? DEFAULT_UA,
  };
  const referer = custom["Referer"] ?? custom["referer"];
  if (referer) fwd["referer"] = referer;
  const range = req.headers.get("range");
  if (range) fwd["range"] = range;

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: fwd,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return new NextResponse("Flusso non raggiungibile", { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse(`Flusso non disponibile (HTTP ${upstream.status})`, {
      status: 502,
    });
  }

  const contentType = (upstream.headers.get("content-type") ?? "").toLowerCase();
  const pathname = target.pathname.toLowerCase();
  const looksM3u8 = contentType.includes("mpegurl") || pathname.endsWith(".m3u8");
  const looksMpd = contentType.includes("dash") || contentType.includes("mpd") || pathname.endsWith(".mpd");

  // Manifest testuali: leggi, riscrivi, restituisci
  if ((looksM3u8 || looksMpd) && upstream.body) {
    const hParam = hParamRaw ? encodeURIComponent(hParamRaw) : null;
    try {
      const text = await upstream.text();
      if (looksM3u8 || text.trimStart().startsWith("#EXTM3U")) {
        return new NextResponse(rewriteHls(text, target.toString(), hParam), {
          status: 200,
          headers: {
            "content-type": "application/vnd.apple.mpegurl",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        });
      }
      if (looksMpd || /^\s*(<\?xml|<MPD)/i.test(text)) {
        return new NextResponse(rewriteMpd(text, hParam), {
          status: 200,
          headers: {
            "content-type": "application/dash+xml",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        });
      }
      // testo ma non manifest: restituisci com'è
      return new NextResponse(text, {
        status: 200,
        headers: { "content-type": upstream.headers.get("content-type") ?? "text/plain" },
      });
    } catch {
      return new NextResponse("Errore leggendo il manifest", { status: 502 });
    }
  }

  // Contenuto binario (segmenti ts/mp4, chiavi, immagini): stream diretto
  const out = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const v = upstream.headers.get(name);
    if (v) out.set(name, v);
  }
  out.set("access-control-allow-origin", "*");
  out.set("cache-control", "no-store");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}
