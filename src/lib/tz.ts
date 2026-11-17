/**
 * Helper per gestire l'orario italiano (Europe/Rome) indipendentemente
 * dal fuso orario del server o del dispositivo dell'utente.
 */

const ROME_TZ = "Europe/Rome";

type WallTime = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
};

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return (asUTC - date.getTime()) / 60000;
}

/** Converte un orario "da muro" di Roma (es. 20:45 di oggi) in un Date UTC preciso */
export function romeWallTimeToUtc(w: WallTime): Date {
  const guess = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  const offset = tzOffsetMinutes(new Date(guess), ROME_TZ);
  return new Date(guess - offset * 60000);
}

/** Data/ora corrente a Roma come "orario da muro" */
export function romeNow(): WallTime {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: ROME_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = dtf.formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
  };
}

/**
 * Costruisce la data di inizio di un evento a Roma:
 * `dayOffset` = 0 (oggi), 1 (domani), 2 (dopodomani)...
 */
export function romeEventDate(dayOffset: number, hour: number, minute: number): Date {
  const now = romeNow();
  const base = new Date(Date.UTC(now.year, now.month - 1, now.day));
  base.setUTCDate(base.getUTCDate() + dayOffset);
  return romeWallTimeToUtc({
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
    hour,
    minute,
  });
}
