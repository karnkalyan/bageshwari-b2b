"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DealerLiveSearchProps {
  placeholder?: string;
  className?: string;
}

export function DealerLiveSearch({
  placeholder = "Search SKU, bearing number, or name...",
  className = "w-full sm:w-96",
}: DealerLiveSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";

  const [query, setQuery] = useState(urlSearch);
  const [isPending, startTransition] = useTransition();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMount = useRef(true);

  // Sync state with URL if URL changes externally
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setQuery(urlSearch);
  }, [urlSearch]);

  const pushSearch = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = val.trim();
    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }
    // Reset pagination to page 1 when search term changes
    if (params.has("page")) {
      params.delete("page");
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setQuery(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce keyup searching so user gets live results while typing
    debounceTimerRef.current = setTimeout(() => {
      pushSearch(nextVal);
    }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      pushSearch(query);
    }
  };

  const handleClear = () => {
    setQuery("");
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    pushSearch("");
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-muted-foreground">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </div>

      <Input
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-9 pr-8 h-9 text-xs bg-white focus-visible:ring-1"
      />

      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
