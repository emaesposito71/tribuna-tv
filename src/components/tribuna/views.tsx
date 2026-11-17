"use client";

/**
 * Viste di Tribuna TV, in stile app NOW TV:
 *  - EventsView: hero cinematografico + rail orizzontali per stato/giorno;
 *  - ChannelsView: griglia di tile canale;
 * entrambe con ricerca, filtri per categoria, skeleton e stati vuoti.
 */

import { useMemo, useState } from "react";
import { Info, SearchX } from "lucide-react";
import { EventPosterCard, ChannelTileCard, LiveBadge, PosterImage, TimeChip, EndedBadge } from "./cards";
import { Rail } from "./rail";
import { SearchInput, CategoryChips } from "./filters";
import {
  computeEventStatus,
  eventBadge,
  formatRomeDay,
  formatRomeTime,
  groupEventsByDay,
} from "@/lib/format";
import type { PlaylistItem, PlaylistResponse } from "@/lib/types";

/* ── Avviso dati di esempio ───────────────────────────────────── */

function SampleNotice({ data }: { data: PlaylistResponse }) {
  if (data.source !== "sample") return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <p className="text-xs leading-relaxed text-amber-200/90">
        {data.fallbackUsed
          ? "La playlist configurata non è raggiungibile in questo momento: al suo posto vedo i dati di esempio. Riprova più tardi con il pulsante ↻."
          : "Nessuna playlist configurata: stai vedendo i dati di esempio. Incolla gli URL dei tuoi file .m3u in src/config/tribuna.ts."}
      </p>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */

function EventsSkeleton() {
  return (
    <div className="space-y-7" aria-hidden={true}>
      <div className="h-[260px] animate-pulse rounded-2xl bg-card md:h-[380px]" />
      {[0, 1].map((r) => (
        <div key={r}>
          <div className="mb-3 h-6 w-48 animate-pulse rounded bg-card" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-video w-[232px] shrink-0 animate-pulse rounded-xl bg-card sm:w-[268px]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChannelsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      aria-hidden={true}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <div key={i} className="animate-pulse rounded-xl bg-card p-2.5">
          <div className="aspect-video rounded-lg bg-white/[0.05]" />
          <div className="mt-2 h-4 w-3/4 rounded bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 py-20 text-center">
      <SearchX className="h-8 w-8 text-muted-foreground/60" />
      <div>
        <p className="text-sm font-semibold text-foreground/80">{message}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">Prova a cambiare ricerca o categoria.</p>
      </div>
    </div>
  );
}

/* ── Utilità comuni ───────────────────────────────────────────── */

function useCategories(items: PlaylistItem[]) {
  return useMemo(() => {
    const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, "it"),
    );
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;
    return { categories, counts };
  }, [items]);
}

function filterItems(
  items: PlaylistItem[],
  query: string,
  category: string | null,
): PlaylistItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category && item.category !== category) return false;
    if (q) {
      const haystack = `${item.title} ${item.provider ?? ""} ${item.category}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function startsAtMs(item: PlaylistItem): number {
  return item.startsAt ? Date.parse(item.startsAt) : Number.MAX_SAFE_INTEGER;
}

/* ── Hero cinematico ──────────────────────────────────────────── */

function Hero({
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
  const isEnded = badge.status === "ended";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-card">
      {/* Immagine di sfondo con sfumature */}
      <div className="absolute inset-0" aria-hidden={true}>
        <PosterImage item={item} name={item.title} className="scale-105 blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/35 to-transparent" />
      </div>

      <div className="relative flex min-h-[280px] flex-col justify-end p-5 md:min-h-[400px] md:p-9">
        <div className="flex flex-wrap items-center gap-2">
          {isLive ? (
            <LiveBadge size="lg" />
          ) : isEnded ? (
            <EndedBadge />
          ) : (
            <TimeChip size="lg" startsAt={item.startsAt} />
          )}
          <span className="rounded-md bg-white/[0.12] px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            {item.category}
          </span>
          {item.provider && (
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/55">
              {item.provider}
            </span>
          )}
        </div>

        <h2 className="hero-title-shadow mt-3 max-w-3xl text-[26px] font-extrabold leading-[1.12] tracking-tight md:text-4xl lg:text-[42px]">
          {item.title}
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="button"
            onClick={() => onPlay(item)}
            className="flex h-12 items-center gap-2.5 rounded-full bg-white px-6 text-sm font-extrabold text-black transition-all hover:bg-white/88 active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden={true}>
              <path d="M8 5v14l11-7z" />
            </svg>
            {isLive ? "Guarda ora" : isEnded ? "Guarda la replica" : "Vai alla diretta"}
          </button>
          {item.startsAt && (
            <span className="text-xs font-semibold tabular-nums text-white/70">
              {formatRomeDay(item.startsAt)} · ore {formatRomeTime(item.startsAt)}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Vista EVENTI ─────────────────────────────────────────────── */

interface EventsViewProps {
  data: PlaylistResponse | undefined;
  isLoading: boolean;
  nowMs: number;
  onPlay: (item: PlaylistItem) => void;
}

export function EventsView({ data, isLoading, nowMs, onPlay }: EventsViewProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const items = data?.items ?? [];
  const { categories, counts } = useCategories(items);
  const filtered = filterItems(items, query, category);
  const isFiltering = query.trim() !== "" || category !== null;

  const live = filtered
    .filter((i) => computeEventStatus(i.startsAt, nowMs) === "live")
    .sort((a, b) => startsAtMs(a) - startsAtMs(b));
  const upcoming = filtered
    .filter((i) => computeEventStatus(i.startsAt, nowMs) === "upcoming")
    .sort((a, b) => startsAtMs(a) - startsAtMs(b));
  const ended = filtered
    .filter((i) => computeEventStatus(i.startsAt, nowMs) === "ended")
    .sort((a, b) => startsAtMs(b) - startsAtMs(a));

  const featured = live[0] ?? upcoming[0] ?? ended[0] ?? null;
  const liveRest = live.slice(1);
  const dayGroups = groupEventsByDay(upcoming);
  const endedRest = featured !== null && ended[0] === featured ? ended.slice(1) : ended;

  return (
    <div className="space-y-6">
      <SampleNotice
        data={
          data ?? { type: "events", source: "sample", fallbackUsed: false, updatedAt: "", items: [] }
        }
      />

      {/* Ricerca + filtri */}
      <div className="space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Cerca un evento, un canale…" />
        <CategoryChips categories={categories} selected={category} onSelect={setCategory} counts={counts} />
      </div>

      {isLoading ? (
        <EventsSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={items.length === 0 ? "Nessun evento nella playlist." : "Nessun evento trovato."}
        />
      ) : isFiltering ? (
        /* Risultati di ricerca: griglia di poster */
        <div className="flex flex-wrap gap-3">
          {filtered.map((item) => (
            <EventPosterCard key={item.id} item={item} nowMs={nowMs} onPlay={onPlay} />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {featured && <Hero item={featured} nowMs={nowMs} onPlay={onPlay} />}

          {liveRest.length > 0 && (
            <Rail title="In diretta ora" count={liveRest.length} countTone="live">
              {liveRest.map((item) => (
                <EventPosterCard key={item.id} item={item} nowMs={nowMs} onPlay={onPlay} />
              ))}
            </Rail>
          )}

          {dayGroups.map((g) => (
            <Rail key={g.day} title={g.day} count={g.items.length}>
              {g.items.map((item) => (
                <EventPosterCard key={item.id} item={item} nowMs={nowMs} onPlay={onPlay} />
              ))}
            </Rail>
          ))}

          {endedRest.length > 0 && (
            <Rail title="Conclusi" count={endedRest.length}>
              {endedRest.map((item) => (
                <EventPosterCard key={item.id} item={item} nowMs={nowMs} onPlay={onPlay} />
              ))}
            </Rail>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Vista CANALI 24/7 ────────────────────────────────────────── */

interface ChannelsViewProps {
  data: PlaylistResponse | undefined;
  isLoading: boolean;
  onPlay: (item: PlaylistItem) => void;
}

export function ChannelsView({ data, isLoading, onPlay }: ChannelsViewProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const items = data?.items ?? [];
  const { categories, counts } = useCategories(items);
  const filtered = filterItems(items, query, category);

  return (
    <div className="space-y-6">
      <SampleNotice
        data={
          data ?? {
            type: "channels",
            source: "sample",
            fallbackUsed: false,
            updatedAt: "",
            items: [],
          }
        }
      />

      {/* Titolo sezione */}
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Canali 24/7</h1>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "canale" : "canali"}
        </span>
      </div>

      <div className="space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Cerca un canale…" />
        <CategoryChips categories={categories} selected={category} onSelect={setCategory} counts={counts} />
      </div>

      {isLoading ? (
        <ChannelsSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={items.length === 0 ? "Nessun canale nella playlist." : "Nessun canale trovato."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filtered.map((item) => (
            <ChannelTileCard key={item.id} item={item} onPlay={onPlay} />
          ))}
        </div>
      )}
    </div>
  );
}
