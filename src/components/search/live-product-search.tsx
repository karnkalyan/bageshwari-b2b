"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X, Package, ArrowRight, Lock } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface SearchProductResult {
  id: string;
  name: string;
  sku: string;
  category?: { name: string; slug: string } | null;
  brand?: { name: string } | null;
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    mrp: number;
    dealerPrice?: number;
    availableQuantity?: number;
  }>;
  images?: Array<{ url?: string | null }>;
}

interface LiveProductSearchProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  isMobileModal?: boolean;
  onCloseMobile?: () => void;
  isDealer?: boolean;
}

export function LiveProductSearch({
  className,
  inputClassName,
  placeholder = "Search products, parts...",
  isMobileModal = false,
  onCloseMobile,
  isDealer = false,
}: LiveProductSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProductResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search on key up / typing
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(trimmed)}&pageSize=6`);
        if (res.ok) {
          const json = await res.json();
          const items: SearchProductResult[] = json?.data?.items || [];
          setResults(items);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Live product search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectProduct = (sku: string) => {
    setIsOpen(false);
    if (onCloseMobile) onCloseMobile();
    router.push(`/products/${sku}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsOpen(false);
    if (onCloseMobile) onCloseMobile();
    router.push(`/products?search=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        handleSelectProduct(results[selectedIndex].sku);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative flex items-center w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim()) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search products catalogue"
          autoComplete="off"
          className={cn(
            "w-full h-10 pl-10 pr-9 text-xs sm:text-sm bg-muted/60 hover:bg-muted/80 focus:bg-white rounded-xl border border-border focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all placeholder:text-muted-foreground",
            inputClassName
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </form>

      {/* Live Dropdown Results */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {isLoading && results.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
              <span>Searching products & parts...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
              <Package className="h-8 w-8 text-slate-300 mx-auto" />
              <div>No products found matching &ldquo;{query}&rdquo;</div>
              <button
                type="button"
                onClick={handleSubmit}
                className="text-xs text-red-600 font-bold hover:underline"
              >
                Search all catalogue products
              </button>
            </div>
          ) : (
            <div>
              <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                <span>Matching Products ({results.length})</span>
                <span className="text-[10px] text-slate-400">Live search</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {results.map((product, idx) => {
                  const variant = product.variants?.[0];
                  const mrp = Number(variant?.mrp || 0);
                  const dp = Number(variant?.dealerPrice || mrp);
                  const isSelected = selectedIndex === idx;

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product.sku)}
                      className={cn(
                        "p-3 flex items-center justify-between gap-3 cursor-pointer transition hover:bg-muted/70",
                        isSelected && "bg-muted font-bold"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-foreground truncate">
                            {product.name}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                              SKU: {product.sku}
                            </span>
                            {product.category && (
                              <span className="truncate">• {product.category.name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        {isDealer ? (
                          <>
                            <div className="text-[9px] text-slate-400 line-through">
                              {formatCurrency(mrp)}
                            </div>
                            <div className="text-xs font-black text-emerald-700">
                              {formatCurrency(dp)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-bold text-foreground">
                              {formatCurrency(mrp)}
                            </div>
                            <div className="text-[9px] text-amber-700 font-semibold flex items-center justify-end gap-0.5">
                              <Lock className="h-2.5 w-2.5" /> Dealer price
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View all button */}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full p-2.5 text-center text-xs font-bold text-red-600 hover:bg-red-50 border-t border-border flex items-center justify-center gap-1.5 transition"
              >
                <span>View all results for &ldquo;{query}&rdquo;</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
