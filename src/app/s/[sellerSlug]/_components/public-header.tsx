"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Boxes, ChevronDown, LockKeyhole, Menu, Search, ShoppingCart, X, User as UserIcon, LogOut, LayoutDashboard } from "lucide-react";
import { signOut } from "next-auth/react";
import { LiveProductSearch } from "@/components/search/live-product-search";

type PublicHeaderProps = {
  seller: { tradingName: string; phone?: string | null; email?: string | null };
  sellerSlug: string;
  user?: { name?: string | null; email?: string | null } | null;
  isDealer?: boolean;
  isStaff?: boolean;
  cartItemCount?: number;
};

export function PublicHeader({
  seller,
  sellerSlug,
  user,
  isDealer = false,
  isStaff = false,
  cartItemCount = 0,
}: PublicHeaderProps) {
  const [open, setOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const base = "";
  const links = [
    ["Home", base || "/"],
    ["Products", `${base}/products`],
    ["Categories", `${base}/products`],
    ["Dealer network", `${base}#dealer-network`],
    ["How it works", `${base}#how-it-works`],
    ["About", `${base}#about`],
    ["Contact", `${base}#contact`],
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
      <div className="site-container flex h-[74px] items-center gap-3 sm:gap-5">
        <Link href={base || "/"} className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-red-500 text-red-500">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <div className="text-lg font-black uppercase leading-none tracking-tight text-foreground">
              {seller.tradingName}
            </div>
            <div className="mt-1 text-[9px] font-extrabold uppercase tracking-[.26em] text-red-500">
              Authorized B2B dealer commerce
            </div>
          </div>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 xl:flex">
          {links.map(([label, href], index) => (
            <Link
              key={label}
              href={href}
              className={`rounded-md px-2.5 py-2 text-[12px] font-bold transition hover:bg-slate-50 hover:text-red-600 ${
                index === 0 ? "text-red-600" : "text-muted-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop Live Search with Keyup Autocomplete */}
        <div className="ml-auto hidden w-64 lg:block xl:ml-2">
          <LiveProductSearch isDealer={isDealer} />
        </div>

        {/* Mobile Quick Search Button */}
        <button
          type="button"
          aria-label="Toggle mobile search"
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="ml-auto rounded-lg border border-border p-2 text-foreground hover:bg-muted lg:hidden"
        >
          {mobileSearchOpen ? <X className="h-4 w-4 text-red-600" /> : <Search className="h-4 w-4" />}
        </button>

        {isDealer ? (
          <>
            <Link
              href="/dealer/cart"
              aria-label="Dealer Cart"
              className="relative flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-bold text-foreground hover:bg-accent transition-all"
            >
              <ShoppingCart className="h-4 w-4 text-red-600" />
              <span className="hidden md:inline">Cart</span>
              {cartItemCount > 0 && (
                <span className="grid h-4 min-w-4 px-1 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                  {cartItemCount}
                </span>
              )}
            </Link>
            <Link
              href="/dealer/dashboard"
              className="hidden items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-primary/80 md:flex"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dealer Portal
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden items-center gap-1 text-xs text-slate-500 hover:text-red-600 md:flex font-semibold"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : isStaff ? (
          <>
            <Link
              href="/admin/dashboard"
              className="hidden items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-primary/80 md:flex"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Staff Workspace
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden items-center gap-1 text-xs text-slate-500 hover:text-red-600 md:flex font-semibold"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Link
              href="/dealer/login"
              className="hidden items-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-primary/80 md:flex"
            >
              <LockKeyhole className="h-4 w-4" /> Dealer Login
            </Link>
            <Link
              href="/request-dealership"
              className="hidden rounded-lg bg-red-600 px-4 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-red-700 lg:block"
            >
              Request Dealership
            </Link>
          </>
        )}

        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-slate-200 p-2.5 xl:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Expanding Live Search Bar */}
      {mobileSearchOpen && (
        <div className="border-t border-border bg-card/95 p-3 backdrop-blur-xl lg:hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="site-container">
            <LiveProductSearch
              isDealer={isDealer}
              onCloseMobile={() => setMobileSearchOpen(false)}
              placeholder="Live search tractors, spare parts, SKU..."
            />
          </div>
        </div>
      )}

      {/* Fullscreen Mobile Drawer (rendered via React Portal to prevent CSS containing block issues) */}
      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-slate-950/65 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          >
            <div
              className="relative h-full h-[100dvh] w-[min(88vw,350px)] bg-card border-l border-border p-5 shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between border-b border-border pb-4 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-red-500 text-red-500">
                    <Boxes className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black uppercase text-foreground truncate text-sm">
                      {seller.tradingName}
                    </div>
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-red-500">
                      Authorized B2B
                    </div>
                  </div>
                </div>
                <button
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Live Search inside Mobile Menu Drawer */}
              <div className="mb-5 shrink-0">
                <LiveProductSearch
                  isDealer={isDealer}
                  onCloseMobile={() => setOpen(false)}
                  placeholder="Search catalogue..."
                />
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1 flex-1 overflow-y-auto">
                {links.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold text-foreground hover:bg-muted transition"
                  >
                    <span>{label}</span>
                    <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-muted-foreground" />
                  </Link>
                ))}
              </nav>

              {/* Portal Actions / Login Footer */}
              <div className="mt-5 grid gap-2 border-t border-border pt-4 shrink-0">
                {isDealer ? (
                  <>
                    <Link
                      href="/dealer/cart"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 py-3 text-center text-sm font-bold text-foreground hover:bg-muted transition"
                    >
                      <ShoppingCart className="h-4 w-4 text-red-600" /> Cart ({cartItemCount})
                    </Link>
                    <Link
                      href="/dealer/dashboard"
                      onClick={() => setOpen(false)}
                      className="rounded-xl bg-primary py-3 text-center text-sm font-bold text-white hover:bg-primary/90 transition shadow-sm"
                    >
                      Dealer Portal Dashboard
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="rounded-xl border border-red-200 text-red-600 py-2.5 text-center text-sm font-bold hover:bg-red-50 transition"
                    >
                      Sign Out
                    </button>
                  </>
                ) : isStaff ? (
                  <>
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setOpen(false)}
                      className="rounded-xl bg-primary py-3 text-center text-sm font-bold text-white hover:bg-primary/90 transition shadow-sm"
                    >
                      Staff Workspace
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="rounded-xl border border-red-200 text-red-600 py-2.5 text-center text-sm font-bold hover:bg-red-50 transition"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dealer/login"
                      onClick={() => setOpen(false)}
                      className="rounded-xl bg-primary py-3 text-center text-sm font-bold text-white hover:bg-primary/90 transition shadow-sm"
                    >
                      Dealer Login
                    </Link>
                    <Link
                      href="/request-dealership"
                      onClick={() => setOpen(false)}
                      className="rounded-xl bg-red-600 py-3 text-center text-sm font-bold text-white hover:bg-red-700 transition shadow-sm"
                    >
                      Request Dealership
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
