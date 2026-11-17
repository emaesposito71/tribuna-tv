"use client";

/**
 * Card di Tribuna TV, stile app NOW TV:
 *  - EventPosterCard: poster 16:9 con immagine, badge di stato e titolo;
 *  - ChannelTileCard: tile con logo centrato, badge 24/7 e nome;
 *  - badge di stato (LIVE rosso animato, orario, concluso).
 */

import { useMemo, useState } from "react";
import { Play, Clock } from "lucide-react";
import { eventBadge, formatRomeTime } from "@/lib/format";
import type { PlaylistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ── Logo canale con fallback a iniziali colorate ─────────────── */

const LOGO_HUES = [150, 100, 70, 40, 15, 180]; // verde, lime, ambra, arancio, rosso, teal — palette sportiva
const LOGO_SAT = [0.17, 0.15, 0.14, 0.15, 0.17, 0.13];

function hueIndex(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h) % LOGO_HUES.length;
}

function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^\d+$/.test(w));
  if (words.length === 0) return "TV";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function ChannelLogo({
  name,
  logo,
  className,
  textClassName,
}: {
  name: string;
  logo?: string;
  className?: string;
  textClassName?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const idx = useMemo(() => hueIndex(name), [name]);
  const showImg = logo && !imgFailed;

  return (
    <div
      aria-hidden={true}
      className={cn(
        "flex items-center justify-center overflow-hidden",
        !showImg && "border border-white/10",
        className,
      )}
      style={
        showImg
          ? { backgroundColor: "rgba(255,255,255,0.05)" }
          : {
              background: `linear-gradient(140deg, oklch(0.4 ${LOGO_SAT[idx]} ${LOGO_HUES[idx]}) 0%, oklch(0.23 ${LOGO_SAT[idx]} ${LOGO_HUES[idx]}) 100%)`,
            }
      }
    >
      {showImg ? (
        <img
          src={logo}
          alt={`Logo ${name}`}
          loading="lazy"
          className="h-full w-full object-contain p-3"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className={cn(
            "font-bold uppercase tracking-wide text-white/95",
            textClassName ?? "text-2xl",
          )}
        >
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}

/* ── Badge di stato ───────────────────────────────────────────── */

export function LiveBadge({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-destructive font-extrabold uppercase tracking-wider text-white shadow-[0_2px_10px_rgba(220,50,45,0.45)]",
        size === "lg" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]",
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      Live
    </span>
  );
}

/** Chip orario per gli eventi programmati: "Oggi · 20:45" */
export function TimeChip({
  startsAt,
  size = "sm",
}: {
  startsAt: string | null | undefined;
  size?: "sm" | "lg";
}) {
  if (!startsAt) return null;
  const time = formatRomeTime(startsAt);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-white/[0.14] font-bold tabular-nums text-white backdrop-blur-sm",
        size === "lg" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]",
      )}
    >
      <Clock className={size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {time}
    </span>
  );
}

export function EndedBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-white/[0.12] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70 backdrop-blur-sm">
      Concluso
    </span>
  );
}

/* ── Badge di stato in base all'evento ────────────────────────── */

function StatusBadge({
  item,
  nowMs,
  size = "sm",
}: {
  item: PlaylistItem;
  nowMs: number;
  size?: "sm" | "lg";
}) {
  const badge = eventBadge(item.startsAt, nowMs);
  if (badge.status === "live") return <LiveBadge size={size} />;
  if (badge.status === "ended") return <EndedBadge />;
  return <TimeChip startsAt={item.startsAt} size={size} />;
}

/* ── Immagine del poster (logo evento o fallback) ─────────────── */

export function PosterImage({
  item,
  name,
  className,
}: {
  item: PlaylistItem;
  name: string;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const idx = useMemo(() => hueIndex(name), [name]);
  const showImg = item.logo && !imgFailed;

  if (showImg) {
    return (
      <img
        src={item.logo}
        alt={name}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div
      aria-hidden={true}
      className={cn("flex h-full w-full items-center justify-center", className)}
      style={{
        background: `linear-gradient(140deg, oklch(0.38 ${LOGO_SAT[idx]} ${LOGO_HUES[idx]}) 0%, oklch(0.2 ${LOGO_SAT[idx]} ${LOGO_HUES[idx]}) 100%)`,
      }}
    >
      <span className="px-3 text-center text-sm font-bold uppercase tracking-wide text-white/90">
        {initialsOf(name)}
      </span>
    </div>
  );
}

/* ── Card poster evento (rail 16:9) ───────────────────────────── */

export function EventPosterCard({
  item,
  nowMs,
  onPlay,
}: {
  item: PlaylistItem;
  nowMs: number;
  onPlay: (item: PlaylistItem) => void;
}) {
  const badge = eventBadge(item.startsAt, nowMs);
  const isLive = badge.status === "live";

  return (
    <button
      type="button"
      onClick={() => onPlay(item)}
      className={cn(
        "group relative w-[232px] shrink-0 snap-start overflow-hidden rounded-xl border bg-card text-left transition-all duration-200 sm:w-[268px]",
        isLive
          ? "border-destructive/50 hover:border-destructive"
          : "border-white/10 hover:border-white/30",
        "hover:scale-[1.02] hover:shadow-[0_10px_36px_rgba(0,0,0,0.5)] active:scale-[0.99]",
      )}
    >
      <div className="relative aspect-video w-full">
        <PosterImage item={item} name={item.title} />

        {/* Gradiente di leggibilità */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />

        {/* Badge di stato */}
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <StatusBadge item={item} nowMs={nowMs} />
        </div>

        {/* Titolo + provenienza */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="hero-title-shadow line-clamp-2 text-[13px] font-bold leading-snug text-white">
            {item.title}
          </p>
          <p className="hero-title-shadow mt-1 truncate text-[11px] font-medium text-white/65">
            {item.provider ?? item.category}
          </p>
        </div>

        {/* Play su hover */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl">
            <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
          </span>
        </span>
      </div>
    </button>
  );
}

/* ── Card canale (griglia) ────────────────────────────────────── */

export function ChannelTileCard({
  item,
  onPlay,
}: {
  item: PlaylistItem;
  onPlay: (item: PlaylistItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPlay(item)}
      className="group flex flex-col rounded-xl border border-white/[0.08] bg-card p-2.5 text-left transition-all duration-200 hover:border-white/25 hover:bg-card/85 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] active:scale-[0.98]"
    >
      <div className="relative">
        <ChannelLogo
          name={item.title}
          logo={item.logo}
          className="aspect-video w-full rounded-lg group-hover:border-primary/40"
          textClassName="text-2xl"
        />
        <span className="absolute right-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white/90 backdrop-blur">
          24/7
        </span>
        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl">
            <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
          </span>
        </span>
      </div>
      <div className="mt-2 px-0.5">
        <p className="truncate text-[13px] font-semibold" title={item.title}>
          {item.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {item.category}
          {item.qualities && item.qualities.length > 1
            ? ` · ${item.qualities[0]?.label ?? ""}`
            : ""}
        </p>
      </div>
    </button>
  );
}
