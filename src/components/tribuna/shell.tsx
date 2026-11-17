"use client";

/**
 * Shell di Tribuna TV in stile app NOW TV:
 *  - header sticky scuro con wordmark, navigazione testuale, orologio
 *    italiano e ricarica playlist;
 *  - barra di navigazione inferiore stile app su mobile (safe-area iOS);
 *  - footer minimale.
 */

import { useEffect, useState } from "react";
import { CalendarDays, RefreshCw, Radio } from "lucide-react";
import { TRIBUNA_CONFIG, type ViewId } from "@/config/tribuna";
import { cn } from "@/lib/utils";

interface ShellProps {
  view: ViewId;
  onViewChange: (view: ViewId) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof Radio }[] = [
  { id: "events", label: "Eventi", icon: CalendarDays },
  { id: "channels", label: "Canali 24/7", icon: Radio },
];

const CONTAINER = "mx-auto w-full max-w-[1600px] px-4 md:px-6";

/** Orologio italiano (Europe/Rome), renderizzato solo lato client */
function RomeClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit",
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const t = setInterval(tick, 20_000);
    return () => clearInterval(t);
  }, []);
  if (!time) {
    return <div className="hidden h-8 w-20 lg:block" aria-hidden={true} />;
  }
  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 lg:flex">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-primary" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      <span className="text-sm font-bold tabular-nums leading-none">{time}</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Roma
      </span>
    </div>
  );
}

export function Shell({ view, onViewChange, onRefresh, isRefreshing, children }: ShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
        <div className={cn(CONTAINER, "flex h-16 items-center gap-4")}>
          {/* Wordmark */}
          <button
            type="button"
            onClick={() => onViewChange("events")}
            className="flex items-center gap-2.5"
            aria-label="Vai agli eventi"
          >
            <span className="glow-brand flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-primary-foreground" fill="currentColor" aria-hidden={true}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="leading-none">
              <span className="block text-lg font-extrabold tracking-tight">
                TRIBUNA <span className="text-primary">TV</span>
              </span>
              <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:block">
                {TRIBUNA_CONFIG.tagline}
              </span>
            </span>
          </button>

          {/* Navigazione desktop */}
          <nav aria-label="Sezioni del sito" className="ml-4 hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onViewChange(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-bold transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "text-primary")} />
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[1px] h-[3px] rounded-full bg-primary shadow-[0_0_12px_rgba(16,223,139,0.8)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Azioni a destra */}
          <div className="ml-auto flex items-center gap-2.5">
            <RomeClock />
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Ricarica le playlist"
              title="Ricarica le playlist"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-muted-foreground transition-colors hover:text-foreground"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Contenuto ──────────────────────────────────────────── */}
      <main className={cn(CONTAINER, "flex-1 pb-28 pt-5 md:pb-12 md:pt-7")}>{children}</main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.06] pb-[env(safe-area-inset-bottom)] md:pb-0">
        <div className={cn(CONTAINER, "flex flex-col items-center justify-between gap-1 py-4 text-center text-xs text-muted-foreground md:flex-row")}>
          <p>
            <span className="font-bold text-foreground/85">TRIBUNA TV</span>
            {" "}— eventi in diretta e canali 24/7, sempre con te.
          </p>
          <p className="tabular-nums">Fuso orario: Europe/Rome</p>
        </div>
      </footer>

      {/* ── Barra di navigazione mobile ────────────────────────── */}
      <nav
        aria-label="Sezioni del sito"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 md:hidden"
      >
        <div className="grid grid-cols-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
