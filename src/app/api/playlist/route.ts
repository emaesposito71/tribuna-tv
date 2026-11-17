/**
 * API di Tribuna TV — /api/playlist?type=events|channels
 *
 * 1. Se in `src/config/tribuna.ts` è impostato un URL .m3u, scarica la
 *    playlist, la analizza e la restituisce (cache in memoria 5 min).
 * 2. Se l'URL non è configurato, non è raggiungibile o non contiene
 *    voci valide, restituisce i dati di esempio (source: "sample").
 *
 * Tutti gli stream vengono instradati dal proxy /api/stream (CORS,
 * mixed-content, header personalizzati) e gli eventi vengono arricchiti
 * con orario, canale di provenienza e chiavi ClearKey (DASH protetti).
 */

import { NextRequest, NextResponse } from "next/server";
import { TRIBUNA_CONFIG } from "@/config/tribuna";
import {
  parseM3U,
  parseEventMeta,
  groupChannelEntries,
  cleanCategory,
  cleanChannelName,
} from "@/lib/m3u";
import { buildProxyUrl } from "@/lib/proxy";
import { getSampleData } from "@/lib/sample-data";
import type { M3uEntry } from "@/lib/m3u";
import type { PlaylistItem, PlaylistResponse, PlaylistType, StreamQuality } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Cache in memoria: URL → risposta analizzata */
const cache = new Map<string, { data: PlaylistResponse; at: number }>();
const CACHE_TTL_MS = TRIBUNA_CONFIG.refreshMinutes * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

function normalizeType(raw: string | null): PlaylistType {
  return raw === "events" ? "events" : "channels";
}

async function fetchM3UText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "TribunaTV/1.0" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Logo: se è http:// passa dal proxy (mixed-content), altrimenti diretto */
function logoUrl(logo: string | undefined): string | undefined {
  if (!logo) return undefined;
  if (/^http:\/\//i.test(logo)) return buildProxyUrl(logo);
  return logo;
}

function eventsToItems(entries: M3uEntry[]): PlaylistItem[] {
  const seen = new Set<string>();
  const items: PlaylistItem[] = [];

  for (const [i, e] of entries.entries()) {
    const meta = parseEventMeta(e.title || e.attrs["tvg-name"] || "");
    const dedupeKey = `${meta.title.toLowerCase()}|${meta.provider ?? ""}|${meta.startsAt?.toISOString() ?? ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    items.push({
      id: `ev-${i}-${Math.abs(hashString(e.url + dedupeKey))}`,
      title: meta.title,
      url: buildProxyUrl(e.url, e.headers),
      logo: logoUrl(e.attrs["tvg-logo"] || undefined),
      category: cleanCategory(e.group, "events", meta.title),
      startsAt: meta.startsAt?.toISOString() ?? null,
      source: "playlist",
      provider: meta.provider,
      kind: e.kind,
      clearKeys: e.clearKeys.length > 0 ? e.clearKeys : undefined,
    });
  }

  return items;
}

function channelsToItems(entries: M3uEntry[]): PlaylistItem[] {
  const groups = groupChannelEntries(entries);
  return groups.map((g, i) => {
    const best = g.variants[0];

    // Varianti di qualità (dedup per etichetta, già ordinate HD→SD)
    const qualities: StreamQuality[] = [];
    const seenLabels = new Set<string>();
    for (const v of g.variants) {
      const label = v.quality?.label ?? "Auto";
      if (seenLabels.has(label)) continue;
      seenLabels.add(label);
      qualities.push({ label, height: v.quality?.height ?? 0, url: buildProxyUrl(v.url, v.headers) });
    }

    return {
      id: `ch-${i}-${Math.abs(hashString(g.key + g.name))}`,
      title: g.name || cleanChannelName(g.key),
      url: buildProxyUrl(best.url, best.headers),
      logo: logoUrl(g.logo),
      category: cleanCategory(g.group, "channels", g.name),
      startsAt: null,
      source: "playlist" as const,
      kind: best.kind,
      clearKeys: undefined,
      qualities: qualities.length > 1 ? qualities : undefined,
    };
  });
}

export async function GET(req: NextRequest) {
  const type = normalizeType(req.nextUrl.searchParams.get("type"));
  const m3uUrl = (
    type === "events" ? TRIBUNA_CONFIG.events.m3uUrl : TRIBUNA_CONFIG.channels.m3uUrl
  ).trim();

  // 1) Cache valida
  const cached = cache.get(`${type}:${m3uUrl}`);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  let data: PlaylistResponse | null = null;

  // 2) Playlist reale dell'utente
  if (m3uUrl) {
    const text = await fetchM3UText(m3uUrl);
    if (text) {
      const entries = parseM3U(text);
      const items =
        type === "events" ? eventsToItems(entries) : channelsToItems(entries);
      if (items.length > 0) {
        data = {
          type,
          source: "playlist",
          fallbackUsed: false,
          updatedAt: new Date().toISOString(),
          items,
        };
        cache.set(`${type}:${m3uUrl}`, { data, at: Date.now() });
      }
    }
  }

  // 3) Fallback: dati di esempio (sempre freschi, non in cache)
  if (!data) {
    data = {
      type,
      source: "sample",
      fallbackUsed: Boolean(m3uUrl),
      updatedAt: new Date().toISOString(),
      items: getSampleData(type),
    };
  }

  return NextResponse.json(data);
}
