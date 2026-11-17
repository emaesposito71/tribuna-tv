/**
 * Parser M3U/M3U8 v2 per Tribuna TV.
 *
 * Supporta le direttive usate nelle liste IPTV reali:
 *  - #EXTM3U
 *  - #EXTINF:<durata> attributi,Titolo  (tvg-id, tvg-name, tvg-logo, group-title…)
 *  - #EXTGRP:<gruppo>
 *  - #KODIPROP:inputstream.adaptive.manifest_type / license_key  (DASH + ClearKey)
 *  - #EXTVLCOPT:http-referrer / http-user-agent
 *  - opzioni "pipe" Kodi nell'URL:  …|clearkey=k:v|Referer=…|headers=<json urlencoded>
 *
 * Estrae anche:
 *  - orario e data dell'evento dal titolo ("[20:45]", "Nov 17 - …", "17/11 …")
 *  - canale di provenienza (ultima parentesi tonda non duplicata)
 *  - varianti di qualità dei canali (param ?quality=1280x720_p25_4716kb)
 */

import { romeNow, romeWallTimeToUtc } from "./tz";
import type { StreamKind } from "./types";

/* ─────────────────────────── Tipi ─────────────────────────── */

export interface M3uEntry {
  title: string;
  url: string;
  attrs: Record<string, string>;
  group: string | null;
  /** Header HTTP da usare per lo stream (Referer / User-Agent) */
  headers: Record<string, string>;
  /** Chiavi ClearKey trovate (DASH protetti) */
  clearKeys: { kid: string; key: string }[];
  /** Tipo di flusso */
  kind: StreamKind;
}

export interface QualityInfo {
  width: number;
  height: number;
  /** bitrate in kb (se presente) */
  bitrate: number;
  label: string;
}

export interface ChannelVariant {
  url: string;
  headers: Record<string, string>;
  kind: StreamKind;
  quality: QualityInfo | null;
}

export interface ChannelGroup {
  key: string;
  name: string;
  logo?: string;
  tvgId: string | null;
  group: string | null;
  variants: ChannelVariant[];
}

/* ─────────────────────── Parsing EXTINF ─────────────────────── */

const ATTR_RE = /([A-Za-z0-9_-]+)="([^"]*)"/g;

/** Trova la virgola che separa gli attributi dal titolo (fuori dalle virgolette) */
function splitExtinfLine(line: string): { metaPart: string; title: string } {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      return { metaPart: line.slice(0, i), title: line.slice(i + 1).trim() };
    }
  }
  return { metaPart: line, title: "" };
}

function parseExtinf(line: string): { title: string; attrs: Record<string, string> } {
  // #EXTINF:-1 tvg-logo="...1080_SX1280..." group-title="…",Titolo
  // (le virgole dentro gli attributi quotati non separano il titolo)
  const { metaPart, title } = splitExtinfLine(line);

  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(metaPart)) !== null) {
    attrs[m[1].toLowerCase()] = m[2].trim();
  }
  return { title, attrs };
}

/* ─────────────── Opzioni "pipe" Kodi nell'URL ─────────────── */

interface UrlOptions {
  base: string;
  clearKeys: { kid: string; key: string }[];
  headers: Record<string, string>;
}

/** Chiavi valide: hex senza trattini, minimo 16 caratteri */
function isHexKey(s: string): boolean {
  return /^[0-9a-fA-F]{16,512}$/.test(s.replace(/-/g, ""));
}

function pushClearKey(list: { kid: string; key: string }[], pair: string) {
  const [kid, key] = pair.split(":");
  if (kid && key && isHexKey(kid) && isHexKey(key)) {
    list.push({ kid: kid.replace(/-/g, "").toLowerCase(), key: key.replace(/-/g, "").toLowerCase() });
  }
}

/** Legge le opzioni pipe di stile Kodi: url|clearkey=…|Referer=…|headers=… */
function splitUrlOptions(url: string): UrlOptions {
  const pipeIdx = url.indexOf("|");
  let base = pipeIdx >= 0 ? url.slice(0, pipeIdx).trim() : url.trim();
  const options = pipeIdx >= 0 ? url.slice(pipeIdx + 1).split("|") : [];

  const clearKeys: { kid: string; key: string }[] = [];
  const headers: Record<string, string> = {};

  for (const opt of options) {
    const eq = opt.indexOf("=");
    if (eq < 0) continue;
    const name = opt.slice(0, eq).trim().toLowerCase();
    const value = opt.slice(eq + 1).trim();

    if (name === "clearkey") {
      for (const pair of value.split(",")) pushClearKey(clearKeys, pair);
    } else if (name === "referer") {
      if (value) headers["Referer"] = value;
    } else if (name === "headers") {
      try {
        const parsed = JSON.parse(decodeURIComponent(value)) as Record<string, string>;
        for (const [k, v] of Object.entries(parsed)) {
          const key = k.toLowerCase() === "user-agent" ? "User-Agent" : k.toLowerCase() === "referer" ? "Referer" : k;
          if (typeof v === "string" && v) headers[key] = v;
        }
      } catch {
        /* headers non validi: ignora */
      }
    }
  }

  // Alcuni manifest portano le chiavi in query, in due formati:
  //   …mpd&key_id=<kid>:<key>          (combinato)
  //   …mpd&key_id=<kid>&key=<key>      (parametri separati)
  const combinedRe = /[?&]key_id=([0-9a-fA-F-]{16,64}):([0-9a-fA-F-]{16,512})/;
  const separateRe = /[?&]key_id=([0-9a-fA-F-]{16,64})&key=([0-9a-fA-F-]{16,512})/;
  const mCombined = base.match(combinedRe);
  const mSeparate = mCombined ? null : base.match(separateRe);
  const mKey = mCombined ?? mSeparate;
  if (mKey) {
    pushClearKey(clearKeys, `${mKey[1]}:${mKey[2]}`);
    base = base.replace(mCombined ? combinedRe : separateRe, "");
  }

  return { base, clearKeys, headers };
}

/* ─────────────────────── Parsing M3U ─────────────────────── */

function detectKind(url: string, manifestType: string): StreamKind {
  if (manifestType.toLowerCase() === "mpd") return "dash";
  if (/\.mpd([?#]|$)/i.test(url)) return "dash";
  return "hls";
}

/**
 * Analizza il testo di una playlist M3U e restituisce le voci valide
 * (EXTINF + direttive Kodi + URL).
 */
export function parseM3U(text: string): M3uEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: M3uEntry[] = [];

  let pending: { title: string; attrs: Record<string, string> } | null = null;
  let pendingGroup: string | null = null;
  let kodiManifestType = "";
  let kodiLicenseKeys: string | null = null;
  let vlcReferrer: string | null = null;
  let vlcUserAgent: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const upper = line.toUpperCase();

    if (upper.startsWith("#EXTINF:")) {
      pending = parseExtinf(line.slice(8));
      pendingGroup = null;
      kodiManifestType = "";
      kodiLicenseKeys = null;
      vlcReferrer = null;
      vlcUserAgent = null;
      continue;
    }

    if (upper.startsWith("#EXTGRP:")) {
      pendingGroup = line.slice(8).trim() || null;
      continue;
    }

    if (upper.startsWith("#KODIPROP:")) {
      const prop = line.slice(10).trim();
      const eq = prop.indexOf("=");
      if (eq > 0) {
        const key = prop.slice(0, eq).toLowerCase();
        const value = prop.slice(eq + 1);
        if (key.endsWith("manifest_type")) kodiManifestType = value.trim();
        else if (key.endsWith("license_key")) kodiLicenseKeys = value.trim();
      }
      continue;
    }

    if (upper.startsWith("#EXTVLCOPT:")) {
      const prop = line.slice(11).trim();
      const eq = prop.indexOf("=");
      if (eq > 0) {
        const key = prop.slice(0, eq).toLowerCase();
        const value = prop.slice(eq + 1).trim();
        if (key === "http-referrer") vlcReferrer = value;
        else if (key === "http-user-agent") vlcUserAgent = value;
      }
      continue;
    }

    if (line.startsWith("#")) continue; // altre direttive: ignora

    // Prima riga non-commento dopo un EXTINF → URL del flusso
    if (pending) {
      if (/^(https?|rtmp|rtsp):\/\//i.test(line) || line.startsWith("/")) {
        const opts = splitUrlOptions(line);

        // chiavi anche dai KODIPROP (se non già trovate nell'URL)
        if (opts.clearKeys.length === 0 && kodiLicenseKeys) {
          for (const pair of kodiLicenseKeys.split(",")) pushClearKey(opts.clearKeys, pair);
        }

        const headers: Record<string, string> = { ...opts.headers };
        if (vlcReferrer && !headers["Referer"]) headers["Referer"] = vlcReferrer;
        if (vlcUserAgent && !headers["User-Agent"]) headers["User-Agent"] = vlcUserAgent;

        entries.push({
          title: pending.title || pending.attrs["tvg-name"] || opts.base,
          url: opts.base,
          attrs: pending.attrs,
          group: pendingGroup ?? pending.attrs["group-title"] ?? null,
          headers,
          clearKeys: opts.clearKeys,
          kind: detectKind(opts.base, kodiManifestType),
        });
      }
      pending = null;
      pendingGroup = null;
      kodiManifestType = "";
      kodiLicenseKeys = null;
      vlcReferrer = null;
      vlcUserAgent = null;
    }
  }

  return entries;
}

/* ─────────────── Metadati evento dal titolo ─────────────── */

const MONTHS: Record<string, number> = {
  jan: 1, gen: 1, feb: 2, mar: 3, apr: 4, mag: 5, may: 5, giu: 6, jun: 6,
  lug: 7, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, ott: 10, oct: 10,
  nov: 11, dic: 12, dec: 12,
};

const MONTH_RE = Object.keys(MONTHS).join("|");

export interface EventMeta {
  title: string;
  provider: string | null;
  startsAt: Date | null;
}

function normForCompare(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Ripulisce il titolo di un evento e ne estrae i metadati:
 *  "📺 [11:00] Singapore - Brazil (International Friendly Games) (Sport Tv BR)"
 *    → { title: "Singapore - Brazil (International Friendly Games)",
 *        provider: "Sport Tv BR", startsAt: oggi alle 11:00 }
 */
export function parseEventMeta(raw: string): EventMeta {
  let t = raw.replace(/[\u{1F300}-\u{1FAFF}\u{FE0F}\u{2B50}\u{2600}-\u{27BF}]/gu, "").trim();

  // Orario tra parentesi quadre/tonde all'inizio: "[10:06]" o "(20:45)"
  let time: { h: number; m: number } | null = null;
  const bracketTime = t.match(/^[\[(](\d{1,2})[:.](\d{2})[\])]\s*/);
  if (bracketTime) {
    time = { h: Number(bracketTime[1]), m: Number(bracketTime[2]) };
    t = t.slice(bracketTime[0].length);
  }

  // Data nel titolo: "Nov 17", "17 nov", "17/11"
  let date: { day: number; month: number } | null = null;
  const mEn = t.match(new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})\\b`, "i"));
  const mIt = t.match(new RegExp(`\\b(\\d{1,2})\\s*(?:di\\s+)?(${MONTH_RE})\\b`, "i"));
  const mNum = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  let consumedDate: string | null = null;
  if (mEn) {
    const month = MONTHS[mEn[1].toLowerCase()];
    const day = Number(mEn[2]);
    if (month && day >= 1 && day <= 31) { date = { day, month }; consumedDate = mEn[0]; }
  } else if (mIt) {
    const day = Number(mIt[1]);
    const month = MONTHS[mIt[2].toLowerCase()];
    if (month && day >= 1 && day <= 31) { date = { day, month }; consumedDate = mIt[0]; }
  } else if (mNum) {
    const day = Number(mNum[1]);
    const month = Number(mNum[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) { date = { day, month }; consumedDate = mNum[0]; }
  }
  if (consumedDate) {
    t = t.replace(consumedDate, "").replace(/^\s*[-–—:|]\s*/, "").trim();
  }

  // Orario non iniziale (es. "Inter vs Milan 20:45") — solo se non già trovato
  if (!time) {
    const mTime = t.match(/\b(\d{1,2}):(\d{2})\b/);
    if (mTime) {
      const h = Number(mTime[1]);
      const m = Number(mTime[2]);
      if (h <= 23 && m <= 59) {
        time = { h, m };
        t = (t.slice(0, mTime.index) + t.slice((mTime.index ?? 0) + mTime[0].length)).trim();
      }
    }
  }

  // Ultima parentesi tonda = canale di provenienza (se non duplica il titolo)
  let provider: string | null = null;
  let parenInner: string | null = null;
  const lastParen = t.match(/\s*\(([^()]*)\)\s*$/);
  if (lastParen && lastParen.index !== undefined) {
    const inner = lastParen[1].trim();
    parenInner = inner;
    const base = t.slice(0, lastParen.index).trim();
    const ni = normForCompare(inner);
    const nb = normForCompare(base);
    if (ni.length > 0 && nb.length > 0 && ni !== nb && !nb.startsWith(ni) && !ni.endsWith(nb)) {
      provider = inner;
    }
    t = base;
  }

  // Parentesi finale orfana ("Italy)")
  const open = (t.match(/\(/g) ?? []).length;
  const close = (t.match(/\)/g) ?? []).length;
  if (close > open) t = t.replace(/\)+$/, "").trim();

  t = t.replace(/\s{2,}/g, " ").trim();
  // Titolo composto solo da parentesi (es. "[16:00] (Sky Sport Uno)") → usa il contenuto
  if (!t && parenInner) t = parenInner;
  if (!t) t = raw.replace(/^[^A-Za-z0-9]*(.*?)[\])]*$/, "$1").trim() || "Evento";

  // Combina data + orario nel fuso di Roma
  let startsAt: Date | null = null;
  if (time || date) {
    const now = romeNow();
    const d = date ?? { day: now.day, month: now.month };
    startsAt = romeWallTimeToUtc({
      year: now.year,
      month: d.month,
      day: d.day,
      hour: time?.h ?? 0,
      minute: time?.m ?? 0,
    });
  }

  return { title: t, provider, startsAt };
}

/* ─────────────────────── Canali ─────────────────────── */

/** Rimuove prefissi tipo "[nowita]" e emoji dal nome canale */
export function cleanChannelName(raw: string): string {
  return raw
    .replace(/[\u{1F300}-\u{1FAFF}\u{FE0F}]/gu, "")
    .replace(/^\[[^\]]*\]\s*/, "")
    .trim();
}

/** Legge il parametro ?quality=1280x720_p25_4716kb */
export function parseQuality(url: string): QualityInfo | null {
  const m = url.match(/[?&]quality=(\d+)x(\d+)_p\d+_(\d+)kb/i);
  if (!m) return null;
  const width = Number(m[1]);
  const height = Number(m[2]);
  const bitrate = Number(m[3]);
  return { width, height, bitrate, label: `${height}p` };
}

/** Raggruppa le voci canale per identità (tvg-id o nome) raccogliendo le qualità */
export function groupChannelEntries(entries: M3uEntry[]): ChannelGroup[] {
  const groups = new Map<string, ChannelGroup>();

  for (const e of entries) {
    const name = cleanChannelName(e.title) || cleanChannelName(e.attrs["tvg-name"] ?? "") || e.title;
    const tvgId = e.attrs["tvg-id"] || null;
    const key = tvgId ?? name.toLowerCase();

    let g = groups.get(key);
    if (!g) {
      g = { key, name, logo: e.attrs["tvg-logo"] || undefined, tvgId, group: e.group, variants: [] };
      groups.set(key, g);
    }
    if (!g.logo && e.attrs["tvg-logo"]) g.logo = e.attrs["tvg-logo"];
    if (!g.name && name) g.name = name;

    if (!g.variants.some((v) => v.url === e.url)) {
      g.variants.push({ url: e.url, headers: e.headers, kind: e.kind, quality: parseQuality(e.url) });
    }
  }

  // Unisce i gruppi con lo stesso nome (tvg-id diversi ma canale identico,
  // es. "nickjr" e "nickjr1" → un'unica scheda con tutte le varianti)
  const byName = new Map<string, ChannelGroup>();
  for (const g of groups.values()) {
    const nameKey = g.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const existing = byName.get(nameKey);
    if (!existing) {
      byName.set(nameKey, g);
      continue;
    }
    for (const v of g.variants) {
      if (!existing.variants.some((x) => x.url === v.url)) existing.variants.push(v);
    }
    if (!existing.logo && g.logo) existing.logo = g.logo;
  }

  // Ordina le varianti per qualità decrescente (l'HD prima)
  for (const g of byName.values()) {
    g.variants.sort((a, b) => {
      const ha = a.quality?.height ?? 0;
      const hb = b.quality?.height ?? 0;
      if (ha !== hb) return hb - ha;
      return (b.quality?.bitrate ?? 0) - (a.quality?.bitrate ?? 0);
    });
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, "it"));
}

/* ─────────────────────── Categorie ─────────────────────── */

/** Classificazione dei canali dal nome (quando il group-title non è utile) */
export function classifyChannel(name: string): string {
  const n = name.toLowerCase();
  if (/\b(news|tg24|meteo|cronaca)\b/.test(n)) return "News";
  if (/sport|calcio|football|f1|formula|motogp|\bmoto\b|tennis|basket|nba|golf|arena|eurosport|dazn/.test(n)) return "Sport";
  if (/cinema|movie|\bfilm\b/.test(n)) return "Cinema";
  if (/cartoon|nick|deakids|boomerang|junior|\bkids\b|yoyo|bambini|disney|gulli|frisbee|rai yoyo/.test(n)) return "Bambini";
  if (/documentar|history|nature|\barte\b|discovery|nat\s?geo|animal planet|stagioni/.test(n)) return "Documentari";
  return "Intrattenimento";
}

const EVENT_CATEGORY_RULES: [RegExp, string][] = [
  [/calcio|football|soccer|serie\s?[abc]|champions|premier|liga|uefa|fifa|coppa|monza|inter|milan/i, "Calcio"],
  [/tennis|atp|wta|itf/i, "Tennis"],
  [/basket|nba|ncaa|euroleague|euroleague|fiba/i, "Basket"],
  [/formula|f1|motogp|moto|nascar|rally|gp\s?di|superbike/i, "Motori"],
  [/cicli|cycl|giro|tour|uci|strade/i, "Ciclismo"],
  [/volley|pallavolo/i, "Volley"],
  [/sci|ski|alpin|fondo|nordic|biathlon|invernali|snowboard/i, "Sport invernali"],
  [/snooker|billiardo/i, "Snooker"],
  [/boxe|boxing|ufc|mma|pugil/i, "Combat"],
  [/golf/i, "Golf"],
  [/baseball/i, "Baseball"],
  [/hockey|nhl/i, "Hockey"],
  [/nuoto|swim|pallanuoto/i, "Nuoto"],
  [/atletica|athletics|maratona/i, "Atletica"],
  [/rugby/i, "Rugby"],
  [/pallamano|handball/i, "Pallamano"],
  [/^sport$|generic|divers|vari/i, "Sport"],
];

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Normalizza il group-title in una categoria leggibile */
export function cleanCategory(
  group: string | null,
  type: "events" | "channels",
  itemName: string,
): string {
  const g = (group ?? "").trim();

  // Canali: i gruppi "provider" (es. "nowita") non descrivono il contenuto
  if (type === "channels") {
    if (!g || !/\s/.test(g)) return classifyChannel(itemName);
    return g;
  }

  let name = g.replace(/^SPORT\s*[-–—]\s*/i, "").replace(/\.$/, "").trim();
  if (!name) return "Eventi";

  for (const [re, label] of EVENT_CATEGORY_RULES) {
    if (re.test(name)) return label;
  }

  // Group troppo lunghi e descrittivi → taglia
  if (name.length > 34) name = `${name.slice(0, 34).trim()}…`;
  return titleCase(name);
}
