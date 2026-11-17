"use client";

/**
 * Tribuna TV — pagina principale.
 *
 * Due sezioni ("pagine") accessibili dalla navigazione:
 *  - Eventi:      playlist degli eventi in diretta e programmati
 *  - Canali 24/7: playlist dei canali sempre attivi
 *
 * I dati arrivano dall'API /api/playlist (che legge i file .m3u
 * configurati in src/config/tribuna.ts) e vengono mostrati con
 * ricerca, filtri e player integrato.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/tribuna/shell";
import { EventsView, ChannelsView } from "@/components/tribuna/views";
import { Player } from "@/components/tribuna/player";
import { TRIBUNA_CONFIG, type ViewId } from "@/config/tribuna";
import type { PlaylistItem, PlaylistResponse, PlaylistType } from "@/lib/types";

async function fetchPlaylist(type: PlaylistType): Promise<PlaylistResponse> {
  const res = await fetch(`/api/playlist?type=${type}`);
  if (!res.ok) throw new Error("Impossibile caricare la playlist");
  return res.json() as Promise<PlaylistResponse>;
}

export default function Home() {
  const [view, setView] = useState<ViewId>("events");
  const [playing, setPlaying] = useState<PlaylistItem | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Aggiorna l'orologio per i badge LIVE / OGGI / CONCLUSO
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const refreshMs = Math.max(1, TRIBUNA_CONFIG.refreshMinutes) * 60_000;
  const eventsQuery = useQuery({
    queryKey: ["playlist", "events"],
    queryFn: () => fetchPlaylist("events"),
    refetchInterval: refreshMs,
  });
  const channelsQuery = useQuery({
    queryKey: ["playlist", "channels"],
    queryFn: () => fetchPlaylist("channels"),
    refetchInterval: refreshMs,
  });

  const isRefreshing = eventsQuery.isFetching || channelsQuery.isFetching;
  const refresh = () => {
    void eventsQuery.refetch();
    void channelsQuery.refetch();
  };

  return (
    <Shell
      view={view}
      onViewChange={setView}
      onRefresh={refresh}
      isRefreshing={isRefreshing}
    >
      {view === "events" ? (
        <EventsView
          data={eventsQuery.data}
          isLoading={eventsQuery.isLoading}
          nowMs={nowMs}
          onPlay={setPlaying}
        />
      ) : (
        <ChannelsView
          data={channelsQuery.data}
          isLoading={channelsQuery.isLoading}
          onPlay={setPlaying}
        />
      )}

      <Player item={playing} onClose={() => setPlaying(null)} />
    </Shell>
  );
}
