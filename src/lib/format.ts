/**
 * Utility client/server per stato eventi e formattazione orario italiano.
 */

import { romeNow, romeWallTimeToUtc } from "./tz";
import type { EventStatus } from "./types";

/** Durata presunta di un evento live (minuti) */
export const EVENT_DURATION_MIN = 150;

export function computeEventStatus(startsAt: string | null | undefined, nowMs: number): EventStatus {
  if (!startsAt) return "live"; // stream evento senza orario: trattato come diretta
  const start = Date.parse(startsAt);
  if (Number.isNaN(start)) return "live";
  if (nowMs < start) return "upcoming";
  if (nowMs > start + EVENT_DURATION_MIN * 60 * 1000) return "ended";
  return "live";
}

/** "20:45" in orario italiano */
export function formatRomeTime(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "Oggi", "Domani", "Lun 24" a confronto con l'oggi di Roma */
export function formatRomeDay(iso: string): string {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(iso));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const eventDay = Date.UTC(get("year"), get("month") - 1, get("day"));

  const now = romeNow();
  const todayUtc = Date.UTC(now.year, now.month - 1, now.day);
  const diffDays = Math.round((eventDay - todayUtc) / 86400000);

  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Domani";
  if (diffDays === -1) return "Ieri";
  const wd = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
  }).format(new Date(iso));
  const dd = get("day");
  const mm = get("month");
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${dd}/${mm}`;
}

/** Etichetta badge per un evento */
export function eventBadge(
  startsAt: string | null | undefined,
  nowMs: number,
): { status: EventStatus; label: string } {
  const status = computeEventStatus(startsAt, nowMs);
  if (status === "live") return { status, label: "IN DIRETTA" };
  if (status === "ended") return { status, label: "CONCLUSO" };
  const day = startsAt ? formatRomeDay(startsAt) : "";
  const time = startsAt ? formatRomeTime(startsAt) : "";
  return { status, label: `${day} · ${time}` };
}

/** Raggruppa gli eventi per giorno ("Oggi", "Domani", ...) mantenendo l'ordine */
export function groupEventsByDay<T extends { startsAt?: string | null }>(
  items: T[],
): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = [];
  const index = new Map<string, number>();
  for (const item of items) {
    const day = item.startsAt ? formatRomeDay(item.startsAt) : "In diretta";
    if (!index.has(day)) {
      index.set(day, groups.length);
      groups.push({ day, items: [] });
    }
    groups[index.get(day)!].items.push(item);
  }
  return groups;
}

/** Aggiorna (o crea) l'orario "da muro" di Roma per oggi */
export function romeTodayWallTime(hour: number, minute: number): Date {
  const now = romeNow();
  return romeWallTimeToUtc({ year: now.year, month: now.month, day: now.day, hour, minute });
}
