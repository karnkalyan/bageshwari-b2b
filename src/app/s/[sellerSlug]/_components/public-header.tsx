"use client";

import Link from "next/link";
import { useState } from "react";
import { Boxes, ChevronDown, LockKeyhole, Menu, Search, ShoppingCart, X, User as UserIcon, LogOut, LayoutDashboard } from "lucide-react";
import { signOut } from "next-auth/react";

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
      <div className="site-container flex h-[74px] items-center gap-5">
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

        <form
          action={`${base}/products`}
          className="ml-auto hidden w-56 items-center rounded-xl border border-border bg-muted/50 px-3 lg:flex xl:ml-2"
        >
          <input
            name="search"
            aria-label="Search products"
            placeholder="Search products, parts..."
            className="h-10 min-w-0 flex-1 bg-transparent text-xs outline-none"
          />
          <Search className="h-4 w-4 text-slate-400" />
        </form>

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

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setOpen(false)}>
          <div
            className="ml-auto h-full w-[min(88vw,360px)] bg-card p-5 shadow-2xl overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="font-black uppercase text-foreground">{seller.tradingName}</div>
              <button aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form action={`${base}/products`} className="mb-5 flex items-center rounded-lg border bg-slate-50 px-3">
              <input name="search" className="h-11 flex-1 bg-transparent text-sm outline-none" placeholder="Search catalogue" />
              <Search className="h-4 w-4 text-slate-400" />
            </form>
            <nav className="space-y-1">
              {links.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  {label}
                  <ChevronDown className="h-3 w-3 -rotate-90" />
                </Link>
              ))}
            </nav>
            <div className="mt-6 grid gap-2 border-t pt-4">
              {isDealer ? (
                <>
                  <Link
                    href="/dealer/cart"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-3 text-center text-sm font-bold text-foreground"
                  >
                    <ShoppingCart className="h-4 w-4 text-red-600" /> Cart ({cartItemCount})
                  </Link>
                  <Link
                    href="/dealer/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-primary py-3 text-center text-sm font-bold text-white"
                  >
                    Dealer Portal Dashboard
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="rounded-lg border border-red-200 text-red-600 py-2.5 text-center text-sm font-bold hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </>
              ) : isStaff ? (
                <>
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-primary py-3 text-center text-sm font-bold text-white"
                  >
                    Staff Workspace
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="rounded-lg border border-red-200 text-red-600 py-2.5 text-center text-sm font-bold hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/dealer/login"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-primary py-3 text-center text-sm font-bold text-white"
                  >
                    Dealer Login
                  </Link>
                  <Link
                    href="/request-dealership"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-red-600 py-3 text-center text-sm font-bold text-white"
                  >
                    Request Dealership
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
