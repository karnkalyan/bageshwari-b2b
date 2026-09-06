"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface LiveSearchInputProps {
  placeholder?: string;
  className?: string;
  paramName?: string;
  targetPath?: string;
  debounceMs?: number;
  autoFocus?: boolean;
}

export function LiveSearchInput({
  placeholder = "Search...",
  className = "w-full sm:w-96",
  paramName = "search",
  targetPath,
  debounceMs = 200,
  autoFocus = false,
}: LiveSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get(paramName) || "";

  const [query, setQuery] = useState(urlSearch);
  const [isPending, startTransition] = useTransition();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPushedSearchRef = useRef<string>(urlSearch);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state with URL only if the user is not actively typing/focused
  // and the URL was changed externally (e.g. back/forward, reset)
  useEffect(() => {
    const isFocused = document.activeElement === inputRef.current;
    if (!isFocused && urlSearch !== lastPushedSearchRef.current) {
      setQuery(urlSearch);
      lastPushedSearchRef.current = urlSearch;
    }
  }, [urlSearch]);

  const pushSearch = (val: string) => {
    const trimmed = val.trim();
    lastPushedSearchRef.current = trimmed;

    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set(paramName, trimmed);
    } else {
      params.delete(paramName);
    }
    // Reset page pagination on new search
    if (params.has("page")) {
      params.delete("page");
    }

    const destPath = targetPath || pathname;
    const newUrl = params.toString() ? `${destPath}?${params.toString()}` : destPath;
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

    // Realtime keyup search with debounce
    debounceTimerRef.current = setTimeout(() => {
      pushSearch(nextVal);
    }, debounceMs);
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
    inputRef.current?.focus();
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
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="pl-9 pr-8 h-9 text-xs bg-white text-slate-900 border-slate-200 focus-visible:ring-1"
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

// Re-export for compatibility
export { LiveSearchInput as DealerLiveSearch };
