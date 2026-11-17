"use client";

/**
 * Rail orizzontale stile NOW TV: scorrimento con snap su mobile,
 * frecce di navigazione su desktop quando il contenuto trabocca.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RailProps {
  title: string;
  /** Etichetta finale del titolo (es. data) */
  titleSuffix?: string;
  /** Chip contatore accanto al titolo */
  count?: number;
  /** Contenuto: una serie di card con larghezza fissa */
  children: React.ReactNode;
  /** Colore del chip contatore */
  countTone?: "live" | "default";
}

export function Rail({ title, titleSuffix, count, children, countTone = "default" }: RailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScroll({
      left: el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section aria-label={title} className="group/rail">
      {/* Intestazione: titolo + frecce */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="truncate text-lg font-extrabold tracking-tight md:text-xl">{title}</h2>
          {titleSuffix && (
            <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {titleSuffix}
            </span>
          )}
          {count !== undefined && count > 0 && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                countTone === "live"
                  ? "bg-destructive text-white"
                  : "bg-white/[0.08] text-muted-foreground",
              )}
            >
              {count}
            </span>
          )}
        </div>
        <div className="hidden shrink-0 gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label={`Scorri indietro: ${title}`}
            disabled={!canScroll.left}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-foreground transition",
              canScroll.left ? "hover:bg-white/[0.14]" : "opacity-30",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label={`Scorri avanti: ${title}`}
            disabled={!canScroll.right}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-foreground transition",
              canScroll.right ? "hover:bg-white/[0.14]" : "opacity-30",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Pista scorrevole */}
      <div
        ref={scrollRef}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 md:-mx-6 md:gap-4 md:px-6"
      >
        {children}
      </div>
    </section>
  );
}
