/**
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  TRIBUNA TV — CONFIGURAZIONE PLAYLIST                            │
 * │                                                                  │
 * │  Questo è l'UNICO file che devi modificare per collegare         │
 * │  le tue playlist. Incolla qui gli URL dei tuoi file .m3u /       │
 * │  .m3u8 (uno per tipo) e riavvia il sito.                         │
 * │                                                                  │
 * │  Esempio:  m3uUrl: "https://esempio.com/eventi.m3u"              │
 * │            m3uUrl: "https://esempio.com/canali247.m3u"           │
 * │                                                                  │
 * │  Puoi indicare anche un file locale pubblico nella cartella      │
 * │  `public/`, es. m3uUrl: "/eventi.m3u"                            │
 * └──────────────────────────────────────────────────────────────────┘
 */

export const TRIBUNA_CONFIG = {
  /** Nome del sito mostrato in header e tab del browser */
  siteName: "Tribuna TV",
  /** Tagline mostrata sotto il logo */
  tagline: "Eventi & Canali 24/7",

  /**
   * Playlist "EVENTI": file .m3u con gli eventi in diretta.
   * Lascia la stringa vuota ("") per usare i dati di esempio.
   */
  events: {
    m3uUrl: "https://tvix.qzz.io/eventi.m3u",
  },

  /**
   * Playlist "CANALI 24/7": file .m3u con i canali sempre attivi.
   * Lascia la stringa vuota ("") per usare i dati di esempio.
   */
  channels: {
    m3uUrl: "https://tvix.qzz.io/listahls.m3u",
  },

  /**
   * Ogni quanto ricaricare le playlist dal server (in minuti).
   * 5 minuti è un buon compromesso tra freschezza dei dati e carico.
   */
  refreshMinutes: 5,
} as const;

/** Tipi di vista disponibile nel sito */
export type ViewId = "events" | "channels";
