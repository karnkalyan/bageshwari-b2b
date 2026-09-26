"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Boxes, CircleUserRound, FileText, KeyRound, LayoutDashboard, LogOut, Menu, Search, ShoppingBag, ShoppingCart, Store, Truck, WalletCards, X } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { LiveSearchInput } from "@/components/search/live-search-input";
import { DealerChangePasswordDialog } from "@/components/auth/dealer-change-password-dialog";

interface DealerShellProps {
  sellerSlug: string;
  sellerName: string;
  user: { name?: string | null; email?: string | null } | null | undefined;
  children: React.ReactNode;
}

export function DealerShell({ sellerSlug, sellerName, user, children }: DealerShellProps) {
  const [open, setOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const pathname = usePathname();
  const base = "/dealer";
  const links = [
    { label: "Dealer dashboard", href: `${base}/dashboard`, icon: LayoutDashboard, exact: true },
    { label: "Order catalogue", href: `${base}/products`, icon: ShoppingBag },
    { label: "Cart / draft", href: `${base}/cart`, icon: ShoppingCart },
    { label: "Orders", href: `${base}/orders`, icon: FileText },
    { label: "Invoices", href: `${base}/invoices`, icon: WalletCards },
    { label: "Shipments", href: `${base}/shipments`, icon: Truck },
  ];

  const sidebar = (
    <aside className="flex h-full w-[240px] flex-col bg-[#072d57] text-white overflow-y-auto">
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5 shrink-0">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-600"><Boxes className="h-5 w-5" /></div>
        <div className="min-w-0"><div className="truncate text-sm font-black uppercase">{sellerName}</div><div className="text-[9px] font-bold uppercase tracking-[.17em] text-blue-200">Authorized dealer</div></div>
      </div>
      <nav className="flex-1 space-y-1 p-3 pt-6">
        {links.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-xs font-semibold transition", active ? "bg-[#1268d3] text-white shadow" : "text-blue-100/80 hover:bg-white/10 hover:text-white")}><item.icon className="h-4 w-4" />{item.label}</Link>;
        })}
      </nav>
      <div className="border-t border-white/10 p-3 pb-24 lg:pb-3 shrink-0">
        <div className="flex items-center gap-2 rounded-xl bg-[#052546] p-3">
          <CircleUserRound className="h-7 w-7 text-blue-200" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold">{user?.name || "Dealer User"}</div>
            <div className="truncate text-[9px] text-blue-200/70">{user?.email}</div>
          </div>
          <button
            type="button"
            aria-label="Change Password"
            title="Change Password"
            onClick={() => setShowChangePassword(true)}
            className="p-1 rounded-md text-blue-200/80 hover:text-white hover:bg-white/10 transition"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => signOut({ callbackUrl: window.location.origin + "/dealer/login" })}
            className="p-1 rounded-md text-blue-200/80 hover:text-white hover:bg-white/10 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <DealerChangePasswordDialog
          open={showChangePassword}
          onOpenChange={setShowChangePassword}
          defaultEmail={user?.email || ""}
          isLoggedIn={true}
        />
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb] lg:flex">
      <div className="fixed inset-y-0 left-0 z-50 hidden lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-[240px] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            {sidebar}
          </div>
          <button
            className="absolute right-4 top-4 rounded-full bg-white p-2 shadow-md"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className="min-w-0 flex-1 lg:pl-[240px]">
        <header className="sticky top-0 z-40 flex h-[68px] sm:h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-3.5 sm:px-6">
          {/* Left: Mobile Hamburger & Dealer Portal Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 transition shrink-0 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[.18em] text-red-600 truncate">Bageshwari B2B</div>
              <div className="text-base sm:text-lg font-black text-[#0b2d55] truncate">Dealer Portal</div>
            </div>
          </div>

          {/* Right: Live Search Box (desktop) & Notification Bell */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <LiveSearchInput
              placeholder="Search catalogue..."
              className="hidden md:block w-52 lg:w-64"
              targetPath="/dealer/products"
            />
            <NotificationBell />
          </div>
        </header>
        <main className="pb-24 lg:pb-0">{children}</main>

        {/* Mobile App Bottom Navigation Bar */}
        <nav className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md py-1.5 px-1 text-[10px] text-slate-500 shadow-lg lg:hidden">
          {[
            { label: "Dashboard", href: "/dealer/dashboard", icon: LayoutDashboard, exact: true },
            { label: "Catalog", href: "/dealer/products", icon: ShoppingBag },
            { label: "Quick Order", href: "/dealer/orders/new", icon: Store },
            { label: "Cart", href: "/dealer/cart", icon: ShoppingCart },
            { label: "Orders", href: "/dealer/orders", icon: FileText },
          ].map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors min-w-[44px]",
                  active ? "text-[#0b2d55] font-black" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <div className={cn("p-1 rounded-full", active ? "bg-blue-50 text-[#0b2d55]" : "")}>
                  <item.icon className={cn("h-4 w-4", active ? "text-[#0b2d55]" : "text-slate-500")} />
                </div>
                <span className="leading-tight">{item.label}</span>
              </Link>
            );
          })}
          {/* Logout Button in Bottom Navbar */}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: window.location.origin + "/dealer/login" })}
            className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors min-w-[44px] text-slate-500 hover:text-red-600"
          >
            <div className="p-1 rounded-full">
              <LogOut className="h-4 w-4" />
            </div>
            <span className="leading-tight">Logout</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
