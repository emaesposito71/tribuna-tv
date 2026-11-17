"use client";

/**
 * Barra di ricerca e filtri per categoria (chips scrollabili orizzontali),
 * in stile NOW TV: campo scuro, chips attive bianche.
 */

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="relative w-full md:max-w-md">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-10 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-white/25 focus:bg-white/[0.09] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Cancella la ricerca"
          className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface CategoryChipsProps {
  categories: string[];
  selected: string | null;
  onSelect: (c: string | null) => void;
  counts?: Record<string, number>;
}

export function CategoryChips({ categories, selected, onSelect, counts }: CategoryChipsProps) {
  const all = ["Tutti", ...categories];
  return (
    <div
      role="tablist"
      aria-label="Filtra per categoria"
      className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 py-1 md:-mx-6 md:px-6"
    >
      {all.map((cat) => {
        const active = cat === "Tutti" ? selected === null : selected === cat;
        const count = cat === "Tutti" ? undefined : counts?.[cat];
        return (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(cat === "Tutti" ? null : cat)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-all",
              active
                ? "bg-white text-black shadow-[0_2px_14px_rgba(255,255,255,0.18)]"
                : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground",
            )}
          >
            {cat}
            {count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] font-bold",
                  active ? "bg-black/15 text-black" : "bg-white/[0.08] text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
