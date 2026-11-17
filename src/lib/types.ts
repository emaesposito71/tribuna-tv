/** Tipi condivisi di Tribuna TV */

export type PlaylistType = "events" | "channels";

/** Stato di un evento calcolato rispetto all'ora corrente */
export type EventStatus = "live" | "upcoming" | "ended";

/** Tipo di flusso: HLS (.m3u8) oppure DASH (.mpd) */
export type StreamKind = "hls" | "dash";

/** Coppia di chiavi ClearKey per stream DASH protetti */
export interface ClearKeyPair {
  /** Key ID (hex, senza trattini) */
  kid: string;
  /** Chiave (hex) */
  key: string;
}

/** Variante di qualità di uno stream (per i canali con più versioni) */
export interface StreamQuality {
  /** Etichetta compatta: "720p", "576p", "432p"… */
  label: string;
  /** Altezza in pixel (per ordinare) */
  height: number;
  /** URL del flusso per questa qualità */
  url: string;
}

/** Voce generica di una playlist (evento o canale) */
export interface PlaylistItem {
  /** Identificativo univoco */
  id: string;
  /** Titolo mostrato in card e player */
  title: string;
  /** URL del flusso (già elaborato/proxy) */
  url: string;
  /** URL del logo (opzionale, preso da tvg-logo) */
  logo?: string;
  /** Categoria (group-title della playlist, normalizzata) */
  category: string;
  /** Solo per eventi: inizio programmato (ISO, fuso Europe/Rome) */
  startsAt?: string | null;
  /** Origine dei dati */
  source: "playlist" | "sample";
  /** Canale / provenienza dello stream (es. "Sky Sport Uno") — solo eventi */
  provider?: string | null;
  /** "hls" (default) oppure "dash" per i manifest .mpd */
  kind?: StreamKind;
  /** Chiavi ClearKey per DASH protetti (desktop browser) */
  clearKeys?: ClearKeyPair[];
  /** Varianti di qualità disponibili (canali) */
  qualities?: StreamQuality[];
}

/** Risposta dell'API /api/playlist */
export interface PlaylistResponse {
  type: PlaylistType;
  /** "playlist" = file .m3u dell'utente; "sample" = dati dimostrativi */
  source: "playlist" | "sample";
  /** true se la playlist configurata non era raggiungibile ed è stata usata la fallback */
  fallbackUsed: boolean;
  updatedAt: string;
  items: PlaylistItem[];
}
