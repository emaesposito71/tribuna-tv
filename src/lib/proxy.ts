/**
 * Helper per il proxy stream lato server (usato solo in API routes).
 *
 * Gli stream IPTV spesso:
 *  - usano http:// (mixed content → bloccati dal browser su pagine https)
 *  - richiedono Referer / User-Agent particolari (impossibili da browser)
 *  - non espongono header CORS per essere letti da hls.js / dash.js
 *
 * `/api/stream` risolve tutto fetchando lato server e riscrivendo i
 * manifest HLS/DASH così che anche segmenti e chiavi passino dal proxy.
 */

/** Headers personalizzati codificati base64url nel query param `h` */
export function encodeStreamHeaders(headers: Record<string, string> | null | undefined): string | null {
  if (!headers || Object.keys(headers).length === 0) return null;
  return Buffer.from(JSON.stringify(headers), "utf8").toString("base64url");
}

export function decodeStreamHeaders(hParam: string | null | undefined): Record<string, string> {
  if (!hParam) return {};
  try {
    const json = Buffer.from(hParam, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Record<string, string>;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) clean[k.slice(0, 64)] = v.slice(0, 2048);
    }
    return clean;
  } catch {
    return {};
  }
}

/** Costruisce l'URL proxy per un flusso (server-side). */
export function buildProxyUrl(
  url: string,
  headers?: Record<string, string> | null,
): string {
  const h = encodeStreamHeaders(headers);
  const params = new URLSearchParams({ url });
  if (h) params.set("h", h);
  return `/api/stream?${params.toString()}`;
}
