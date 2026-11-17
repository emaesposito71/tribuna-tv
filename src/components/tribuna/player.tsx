"use client";

/**
 * Player di Tribuna TV v2, stile app NOW TV.
 *
 * Strategia di riproduzione:
 *  1. Stream HLS (.m3u8):
 *     - Safari/iOS → HLS nativo (controlli nativi su iPhone/iPad);
 *     - altri browser → hls.js via MSE.
 *  2. Stream DASH (.mpd) protetti con ClearKey:
 *     - Chrome/Firefox/Edge → dash.js con chiari EME "org.w3.clearkey";
 *     - Safari/iOS non supporta ClearKey → messaggio dedicato.
 *
 * Supporta il cambio qualità (varianti dei canali) e stati di
 * caricamento/errore con riprova.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LiveBadge } from "./cards";
import type { PlaylistItem, StreamQuality } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface PlayerProps {
  item: PlaylistItem | null;
  onClose: () => void;
}

type PlayerState = "loading" | "playing" | "error";
type ErrorKind = "generic" | "drm";

interface RemovablePlayer {
  destroy: () => void;
}

function isAppleDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafariDesktop = /safari/i.test(ua) && !/chrome|chromium|crios|android|firefox|edg/i.test(ua);
  return isIOS || isSafariDesktop;
}

export function Player({ item, onClose }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<RemovablePlayer | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<PlayerState>("loading");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [attempt, setAttempt] = useState(0);
  /** Callback ref: si riaggancia al <video> del portale a ogni apertura */
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  /** Variante di qualità selezionata (canali) */
  const [quality, setQuality] = useState<StreamQuality | null>(null);

  const open = Boolean(item);
  const title = item?.title ?? "";

  // Quando cambia l'item: riparti dalla qualità migliore (la prima in lista)
  useEffect(() => {
    if (!item) {
      setQuality(null);
      return;
    }
    const qs = item.qualities ?? [];
    setQuality(qs.length > 0 ? qs[0] : null);
  }, [item]);

  const streamUrl = quality?.url ?? item?.url ?? "";

  const attach = useCallback((video: HTMLVideoElement, url: string, it: PlaylistItem) => {
    setState("loading");
    setErrorKind("generic");

    // pulizia istanza precedente (hls.js / dash.js)
    const prev = playerRef.current;
    if (prev) {
      try {
        prev.destroy();
      } catch {
        /* già distrutto */
      }
      playerRef.current = null;
    }
    video.removeAttribute("src");
    video.load();

    // Se il flusso non risponde entro 20 s → messaggio di aiuto
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setState((s) => (s === "loading" ? "error" : s));
    }, 20_000);

    const isDash = it.kind === "dash" || /\.mpd([?#]|$)/i.test(url);

    if (isDash) {
      // ClearKey DASH: richiede MSE + EME, Safari/iOS non li supporta
      if (isAppleDevice()) {
        setErrorKind("drm");
        setState("error");
        return;
      }
      void (async () => {
        try {
          const dash = await import("dashjs");
          const player = dash.MediaPlayer().create();
          playerRef.current = {
            destroy: () => {
              const p = player as unknown as { reset?: () => void; destroy?: () => void };
              try {
                p.reset?.();
              } catch {
                /* noop */
              }
              try {
                p.destroy?.();
              } catch {
                /* noop */
              }
            },
          };
          if (it.clearKeys && it.clearKeys.length > 0) {
            const clearkeys: Record<string, string> = {};
            for (const k of it.clearKeys) clearkeys[k.kid] = k.key;
            player.setProtectionData({ "org.w3.clearkey": { clearkeys } });
          }
          player.on("error", () => setState((s) => (s === "loading" ? "error" : s)));
          player.on("playback_started", () => setState("playing"));
          player.initialize(video, url, true);
        } catch {
          setState("error");
        }
      })();
      return;
    }

    // ── HLS ──
    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl");
    if (nativeHls) {
      // Safari / iOS: HLS nativo
      video.src = url;
      video.play().catch(() => {
        /* autoplay rifiutato: l'utente premerà play sui controlli */
      });
    } else {
      // Altri browser: hls.js (import dinamico per ridurre il bundle)
      void (async () => {
        try {
          const { default: Hls } = await import("hls.js");
          if (!Hls.isSupported()) {
            setState("error");
            return;
          }
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
          });
          playerRef.current = { destroy: () => hls.destroy() };
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) setState((s) => (s === "loading" ? "error" : s));
          });
          hls.loadSource(url);
          hls.attachMedia(video);
        } catch {
          setState("error");
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (!open || !streamUrl || !videoEl || !item) return;
    attach(videoEl, streamUrl, item);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const prev = playerRef.current;
      if (prev) {
        try {
          prev.destroy();
        } catch {
          /* noop */
        }
        playerRef.current = null;
      }
      const video = videoRef.current;
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [open, streamUrl, videoEl, attach, item]);

  const onVideoPlaying = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState("playing");
  };

  const onVideoCanPlay = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState((s) => (s === "loading" ? "playing" : s));
    const v = videoRef.current;
    if (v && v.paused) {
      v.play().catch(() => {
        /* autoplay bloccato: l'utente usa i controlli nativi */
      });
    }
  };
  const onVideoError = () => setState((s) => (s === "loading" ? "error" : s));

  const retry = () => setAttempt((a) => a + 1);

  const qualities = item?.qualities ?? [];
  const activeLabel = quality?.label ?? qualities[0]?.label ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={true}
        className="max-w-5xl gap-0 overflow-hidden rounded-xl border-white/10 bg-[#0c0c10] p-0 sm:rounded-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Riproduzione in diretta di {title} su Tribuna TV
        </DialogDescription>

        {/* Video */}
        <div className="relative aspect-video w-full bg-black">
          <video
            ref={(node) => {
              videoRef.current = node;
              setVideoEl(node);
            }}
            controls
            playsInline
            autoPlay
            className="h-full w-full"
            onPlaying={onVideoPlaying}
            onCanPlay={onVideoCanPlay}
            onError={onVideoError}
          />

          {/* Badge LIVE durante la riproduzione */}
          {state === "playing" && (
            <div className="pointer-events-none absolute left-3 top-3">
              <LiveBadge size="lg" />
            </div>
          )}

          {state === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-white/70">Connessione al flusso…</p>
            </div>
          )}

          {state === "error" && errorKind === "generic" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/88 px-6 text-center">
              <AlertTriangle className="h-9 w-9 text-destructive" />
              <div>
                <p className="text-sm font-bold">Il flusso non risponde</p>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-white/60">
                  Il canale potrebbe essere temporaneamente offline oppure il collegamento
                  potrebbe non essere più attivo. Riprova o torna più tardi.
                </p>
              </div>
              <button
                type="button"
                onClick={retry}
                className="flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-black transition-transform hover:bg-white/90 active:scale-[0.97]"
              >
                <RotateCcw className="h-4 w-4" />
                Riprova
              </button>
            </div>
          )}

          {state === "error" && errorKind === "drm" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/88 px-6 text-center">
              <ShieldAlert className="h-9 w-9 text-amber-400" />
              <div>
                <p className="text-sm font-bold">Stream protetto non compatibile</p>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-white/60">
                  Questo evento usa una protezione (DASH ClearKey) riproducibile solo da PC
                  con Chrome, Firefox o Edge. Su iPhone/iPad il browser di sistema non la
                  supporta: apri Tribuna TV da un computer per guardarlo.
                </p>
              </div>
              <button
                type="button"
                onClick={retry}
                className="flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-black transition-transform hover:bg-white/90 active:scale-[0.97]"
              >
                <RotateCcw className="h-4 w-4" />
                Riprova
              </button>
            </div>
          )}
        </div>

        {/* Barra info + qualità */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[item?.provider, item?.category].filter(Boolean).join(" · ") || "Diretta"} · Tribuna TV
            </p>
          </div>

          {qualities.length > 1 && (
            <div
              role="group"
              aria-label="Scegli la qualità del video"
              className="flex items-center gap-1 rounded-full bg-white/[0.07] p-1"
            >
              {qualities.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setQuality(q)}
                  aria-pressed={activeLabel === q.label}
                  className={cn(
                    "h-7 rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-wide transition-colors",
                    activeLabel === q.label
                      ? "bg-white text-black"
                      : "text-white/55 hover:text-white",
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
