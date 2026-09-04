"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SlidersHorizontal,
  X,
  Search,
  Check,
  RotateCcw,
  Tag,
  Layers,
} from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

interface BrandItem {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  categories: CategoryItem[];
  brands: BrandItem[];
  categorySlug?: string;
  brandSlug?: string;
  search?: string;
  totalCount: number;
  baseUrl?: string;
}

export function ProductFilters({
  categories,
  brands,
  categorySlug = "",
  brandSlug = "",
  search = "",
  totalCount,
  baseUrl = "/products",
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(search);
  const [drawerSearch, setDrawerSearch] = useState(search);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  // Calculate active filter count
  const activeFiltersCount =
    (categorySlug ? 1 : 0) + (brandSlug ? 1 : 0) + (search ? 1 : 0);

  const selectedCategory = categories.find((c) => c.slug === categorySlug);
  const selectedBrand = brands.find((b) => b.slug === brandSlug);

  // Helper to build URL with updated params
  const buildUrl = (updates: {
    category?: string | null;
    brand?: string | null;
    search?: string | null;
    page?: string | null;
  }) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");

    if (updates.category !== undefined) {
      if (updates.category) params.set("category", updates.category);
      else params.delete("category");
    }

    if (updates.brand !== undefined) {
      if (updates.brand) params.set("brand", updates.brand);
      else params.delete("brand");
    }

    if (updates.search !== undefined) {
      if (updates.search) params.set("search", updates.search);
      else params.delete("search");
    }

    // Always reset to page 1 on filter changes
    params.delete("page");

    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

  const applyUrl = (url: string) => {
    startTransition(() => {
      router.push(url);
    });
  };

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyUrl(buildUrl({ search: localSearch.trim() || null }));
  };

  const handleDrawerSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyUrl(buildUrl({ search: drawerSearch.trim() || null }));
  };

  const handleSelectCategory = (slug: string | null) => {
    const nextUrl = buildUrl({ category: slug });
    setIsDrawerOpen(false);
    applyUrl(nextUrl);
  };

  const handleSelectBrand = (slug: string | null) => {
    const nextUrl = buildUrl({ brand: slug });
    setIsDrawerOpen(false);
    applyUrl(nextUrl);
  };

  const handleClearAll = () => {
    setLocalSearch("");
    setDrawerSearch("");
    setIsDrawerOpen(false);
    applyUrl(baseUrl);
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 1. MOBILE CONTROLS & FILTER BAR (Hidden on lg screens)    */}
      {/* ========================================================= */}
      <div className="lg:hidden space-y-3 mb-4">
        {/* Top Action Row: Search Input + Filter Trigger Button */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <form onSubmit={handleMobileSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search products, SKU..."
              className="h-10 pl-9 pr-8 text-xs rounded-xl bg-white border-slate-200 shadow-2xs focus-visible:ring-1 focus-visible:ring-primary"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch("");
                  applyUrl(buildUrl({ search: null }));
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {/* Filter Button */}
          <Button
            type="button"
            onClick={() => {
              setDrawerSearch(search);
              setIsDrawerOpen(true);
            }}
            className={`h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs transition-all ${
              activeFiltersCount > 0
                ? "bg-[#0b2d55] text-white hover:bg-[#124177]"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold text-white">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Active Filter Chips Row */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Active:</span>

            {/* Category Chip */}
            {categorySlug && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px] shrink-0">
                <Layers className="h-3 w-3 text-blue-600" />
                <span>{selectedCategory?.name || categorySlug}</span>
                <button
                  type="button"
                  onClick={() => applyUrl(buildUrl({ category: null }))}
                  className="ml-0.5 rounded-full hover:bg-blue-200/60 p-0.5 text-blue-700"
                  aria-label="Remove category filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Brand Chip */}
            {brandSlug && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] shrink-0">
                <Tag className="h-3 w-3 text-emerald-600" />
                <span>{selectedBrand?.name || brandSlug}</span>
                <button
                  type="button"
                  onClick={() => applyUrl(buildUrl({ brand: null }))}
                  className="ml-0.5 rounded-full hover:bg-emerald-200/60 p-0.5 text-emerald-700"
                  aria-label="Remove brand filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Search Chip */}
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px] shrink-0">
                <Search className="h-3 w-3 text-amber-600" />
                <span className="truncate max-w-[120px]">"{search}"</span>
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch("");
                    applyUrl(buildUrl({ search: null }));
                  }}
                  className="ml-0.5 rounded-full hover:bg-amber-200/60 p-0.5 text-amber-700"
                  aria-label="Remove search filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Reset All Button */}
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline px-1.5 py-1 shrink-0"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. MOBILE FILTER DRAWER / SHEET (On Click Only)          */}
      {/* ========================================================= */}
      {mounted &&
        isDrawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] lg:hidden flex flex-col justify-end">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
              onClick={() => setIsDrawerOpen(false)}
              aria-hidden="true"
            />

          {/* Slide-up Bottom Sheet */}
          <div className="relative z-50 w-full max-h-[85vh] rounded-t-3xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle */}
            <div className="pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Sheet Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#0b2d55]" />
                <h3 className="text-base font-extrabold text-slate-900">Filter Products</h3>
                {activeFiltersCount > 0 && (
                  <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">
                    {activeFiltersCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  aria-label="Close filter drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Filter Content */}
            <div className="overflow-y-auto px-5 py-4 space-y-6 flex-1">
              {/* Drawer Search */}
              <form onSubmit={handleDrawerSearchSubmit} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder="Search SKU, name, description..."
                    className="h-10 pl-9 pr-8 text-xs rounded-xl bg-slate-50 border-slate-200"
                  />
                  {drawerSearch && (
                    <button
                      type="button"
                      onClick={() => setDrawerSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </form>

              {/* Categories Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                    Categories ({categories.length})
                  </label>
                  {categorySlug && (
                    <button
                      type="button"
                      onClick={() => handleSelectCategory(null)}
                      className="text-[11px] text-blue-600 font-semibold hover:underline"
                    >
                      All
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {/* All Categories Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory(null)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition text-left ${
                      !categorySlug
                        ? "bg-[#0b2d55] text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-slate-100 font-medium"
                    }`}
                  >
                    <span>All Categories</span>
                    {!categorySlug && <Check className="h-4 w-4 text-white" />}
                  </button>

                  {/* Individual Categories */}
                  {categories.map((cat) => {
                    const isSelected = categorySlug === cat.slug;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.slug)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition text-left ${
                          isSelected
                            ? "bg-[#0b2d55] text-white font-bold shadow-xs"
                            : "text-slate-700 hover:bg-slate-100 font-medium"
                        }`}
                      >
                        <span className="truncate pr-2">{cat.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {cat._count?.products || 0}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brands Section */}
              {brands.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-emerald-600" />
                      Brands ({brands.length})
                    </label>
                    {brandSlug && (
                      <button
                        type="button"
                        onClick={() => handleSelectBrand(null)}
                        className="text-[11px] text-emerald-600 font-semibold hover:underline"
                      >
                        All
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {/* All Brands Option */}
                    <button
                      type="button"
                      onClick={() => handleSelectBrand(null)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition text-left ${
                        !brandSlug
                          ? "bg-[#0b2d55] text-white font-bold shadow-xs"
                          : "text-slate-700 hover:bg-slate-100 font-medium"
                      }`}
                    >
                      <span>All Brands</span>
                      {!brandSlug && <Check className="h-4 w-4 text-white" />}
                    </button>

                    {/* Individual Brands */}
                    {brands.map((b) => {
                      const isSelected = brandSlug === b.slug;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBrand(b.slug)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition text-left ${
                            isSelected
                              ? "bg-[#0b2d55] text-white font-bold shadow-xs"
                              : "text-slate-700 hover:bg-slate-100 font-medium"
                          }`}
                        >
                          <span className="truncate">{b.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Sheet Bottom Action */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/90 flex gap-2 shrink-0">
              {activeFiltersCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearAll}
                  className="flex-1 h-11 text-xs font-bold rounded-xl"
                >
                  Clear All
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  if (drawerSearch !== search) {
                    applyUrl(buildUrl({ search: drawerSearch.trim() || null }));
                  }
                  setIsDrawerOpen(false);
                }}
                className="flex-1 h-11 text-xs font-extrabold bg-[#0b2d55] hover:bg-[#124177] text-white rounded-xl shadow-md"
              >
                View {totalCount} Products
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 3. DESKTOP SIDEBAR CARD (Hidden on mobile, block on lg)   */}
      {/* ========================================================= */}
      <div className="hidden lg:block space-y-6">
        <Card className="sticky top-24 border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-slate-900">
                <SlidersHorizontal className="h-4 w-4 text-[#0b2d55]" />
                Filter Products
              </h3>
              {(categorySlug || brandSlug || search) && (
                <Link
                  href={baseUrl}
                  className="text-xs text-red-600 hover:text-red-700 hover:underline font-bold flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Link>
              )}
            </div>

            {/* Desktop Search */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyUrl(buildUrl({ search: localSearch.trim() || null }));
              }}
              className="space-y-1.5"
            >
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Search SKU, name..."
                  className="pl-9 pr-8 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
                />
                {localSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSearch("");
                      applyUrl(buildUrl({ search: null }));
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </form>

            {/* Desktop Categories */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Categories
                </label>
                {categorySlug && (
                  <button
                    type="button"
                    onClick={() => applyUrl(buildUrl({ category: null }))}
                    className="text-[10px] text-primary hover:underline font-semibold"
                  >
                    All
                  </button>
                )}
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto pr-1 text-xs">
                <Link
                  href={buildUrl({ category: null })}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
                    !categorySlug
                      ? "font-extrabold text-[#0b2d55] bg-blue-50/80"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>All Categories</span>
                  {!categorySlug && <Check className="h-3.5 w-3.5 text-[#0b2d55]" />}
                </Link>

                {categories.map((cat) => {
                  const isSelected = categorySlug === cat.slug;
                  return (
                    <Link
                      key={cat.id}
                      href={buildUrl({ category: cat.slug })}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
                        isSelected
                          ? "font-extrabold text-[#0b2d55] bg-blue-50/80"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="truncate pr-2">{cat.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isSelected
                            ? "bg-blue-200/70 text-blue-900"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {cat._count?.products || 0}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Desktop Brands */}
            {brands.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Brands
                  </label>
                  {brandSlug && (
                    <button
                      type="button"
                      onClick={() => applyUrl(buildUrl({ brand: null }))}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      All
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-52 overflow-y-auto pr-1 text-xs">
                  <Link
                    href={buildUrl({ brand: null })}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
                      !brandSlug
                        ? "font-extrabold text-[#0b2d55] bg-blue-50/80"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>All Brands</span>
                    {!brandSlug && <Check className="h-3.5 w-3.5 text-[#0b2d55]" />}
                  </Link>

                  {brands.map((b) => {
                    const isSelected = brandSlug === b.slug;
                    return (
                      <Link
                        key={b.id}
                        href={buildUrl({ brand: b.slug })}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
                          isSelected
                            ? "font-extrabold text-[#0b2d55] bg-blue-50/80"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate">{b.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#0b2d55]" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
