/**
 * Dati di esempio realistici per Tribuna TV.
 *
 * Vengono usati finché l'utente non collega le proprie playlist .m3u
 * nel file `src/config/tribuna.ts`. Gli stream di esempio puntano a
 * video demo pubblici (Apple/Mux test streams) per provare il player.
 */

import { romeEventDate } from "./tz";
import type { PlaylistItem, PlaylistType } from "./types";

/** Stream demo pubblici per provare il player integrato */
const DEMO_STREAMS = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
  "https://test-streams.mux.dev/pts_shift/master.m3u8",
];

function demoStream(i: number): string {
  return DEMO_STREAMS[i % DEMO_STREAMS.length];
}

interface SampleEvent {
  title: string;
  category: string;
  dayOffset: number;
  hour: number;
  minute: number;
}

const SAMPLE_EVENTS: SampleEvent[] = [
  { title: "ATP Finals Torino · Semifinale", category: "Tennis", dayOffset: 0, hour: 14, minute: 0 },
  { title: "Serie A · Inter vs Lazio", category: "Calcio", dayOffset: 0, hour: 20, minute: 45 },
  { title: "EuroLeague · Virtus Bologna vs Real Madrid", category: "Basket", dayOffset: 0, hour: 20, minute: 30 },
  { title: "Serie A · Juventus vs Napoli", category: "Calcio", dayOffset: 1, hour: 20, minute: 45 },
  { title: "Serie B · Palermo vs Sassuolo", category: "Calcio", dayOffset: 1, hour: 15, minute: 0 },
  { title: "Formula 1 · GP di Las Vegas — Prove Libere 2", category: "Motori", dayOffset: 1, hour: 23, minute: 30 },
  { title: "Champions League · Milan vs Barcelona", category: "Calcio", dayOffset: 2, hour: 21, minute: 0 },
  { title: "Champions League · Arsenal vs Bayern", category: "Calcio", dayOffset: 2, hour: 21, minute: 0 },
  { title: "Premier League · Arsenal vs Chelsea", category: "Calcio", dayOffset: 3, hour: 17, minute: 30 },
  { title: "Supercoppa · Olimpia Milano vs Panathinaikos", category: "Basket", dayOffset: 3, hour: 20, minute: 15 },
  { title: "MotoGP · Test Valencia — Gara 2", category: "Motori", dayOffset: 3, hour: 15, minute: 0 },
  { title: "ATP Finals Torino · Finale", category: "Tennis", dayOffset: 4, hour: 21, minute: 0 },
];

interface SampleChannel {
  title: string;
  category: string;
}

const SAMPLE_CHANNELS: SampleChannel[] = [
  { title: "Tribuna Sport HD", category: "Sport" },
  { title: "Tribuna Sport 2", category: "Sport" },
  { title: "Tribuna Sport Plus", category: "Sport" },
  { title: "Tribuna Arena", category: "Sport" },
  { title: "Tribuna Calcio 1", category: "Calcio" },
  { title: "Tribuna Calcio 2", category: "Calcio" },
  { title: "Tribuna Calcio 3", category: "Calcio" },
  { title: "Tribuna Champions 24", category: "Calcio" },
  { title: "Tribuna Football 24", category: "Calcio" },
  { title: "Tribuna Tennis", category: "Sport" },
  { title: "Tribuna Motorsport", category: "Motori" },
  { title: "Tribuna News 24", category: "News" },
  { title: "Tribuna Documentari", category: "Documentari" },
  { title: "Tribuna Cinema", category: "Cinema" },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getSampleEvents(): PlaylistItem[] {
  const now = Date.now();
  const items = SAMPLE_EVENTS.map((e, i) => {
    const startsAt =
      i === 0
        ? new Date(now - 40 * 60 * 1000) // il primo evento è "in diretta ora"
        : romeEventDate(e.dayOffset, e.hour, e.minute);
    return {
      id: `sample-event-${slugify(e.title)}`,
      title: e.title,
      url: demoStream(i),
      category: e.category,
      startsAt: startsAt.toISOString(),
      source: "sample" as const,
    };
  });
  return items.sort((a, b) => {
    const ta = a.startsAt ? Date.parse(a.startsAt) : Infinity;
    const tb = b.startsAt ? Date.parse(b.startsAt) : Infinity;
    return ta - tb;
  });
}

export function getSampleChannels(): PlaylistItem[] {
  return SAMPLE_CHANNELS.map((c, i) => ({
    id: `sample-channel-${slugify(c.title)}`,
    title: c.title,
    url: demoStream(i),
    category: c.category,
    startsAt: null,
    source: "sample" as const,
  }));
}

export function getSampleData(type: PlaylistType): PlaylistItem[] {
  return type === "events" ? getSampleEvents() : getSampleChannels();
}
