"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Boxes, CircleUserRound, FileText, LayoutDashboard, LogOut, Menu, Search, ShoppingBag, ShoppingCart, Store, Truck, WalletCards, X } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface DealerShellProps {
  sellerSlug: string;
  sellerName: string;
  user: { name?: string | null; email?: string | null } | null | undefined;
  children: React.ReactNode;
}

export function DealerShell({ sellerSlug, sellerName, user, children }: DealerShellProps) {
  const [open, setOpen] = useState(false);
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
    <aside className="flex h-full w-[240px] flex-col bg-[#072d57] text-white">
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-600"><Boxes className="h-5 w-5" /></div>
        <div className="min-w-0"><div className="truncate text-sm font-black uppercase">{sellerName}</div><div className="text-[9px] font-bold uppercase tracking-[.17em] text-blue-200">Authorized dealer</div></div>
      </div>
      <nav className="flex-1 space-y-1 p-3 pt-6">
        {links.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-xs font-semibold transition", active ? "bg-[#1268d3] text-white shadow" : "text-blue-100/80 hover:bg-white/10 hover:text-white")}><item.icon className="h-4 w-4" />{item.label}</Link>;
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link href="/" className="mb-3 flex items-center justify-between rounded-lg bg-white/8 px-3 py-2.5 text-xs font-semibold"><span className="flex items-center gap-2"><Store className="h-4 w-4 text-red-400" />Storefront</span><ArrowUpRight className="h-3.5 w-3.5" /></Link>
        <div className="flex items-center gap-2 rounded-xl bg-[#052546] p-3"><CircleUserRound className="h-7 w-7 text-blue-200" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{user?.name || "Dealer User"}</div><div className="truncate text-[9px] text-blue-200/70">{user?.email}</div></div><button aria-label="Sign out" onClick={() => signOut({ callbackUrl: window.location.origin + "/dealer/login" })}><LogOut className="h-4 w-4 text-blue-200" /></button></div>
      </div>
    </aside>
  );

  return <div className="min-h-screen bg-[#f4f7fb] lg:flex">
    <div className="fixed inset-y-0 left-0 z-50 hidden lg:block">{sidebar}</div>
    {open && <div className="fixed inset-0 z-50 bg-slate-950/60 lg:hidden" onClick={() => setOpen(false)}><div className="h-full w-[240px]" onClick={(event) => event.stopPropagation()}>{sidebar}</div><button className="absolute right-4 top-4 rounded-full bg-white p-2" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>}
    <div className="min-w-0 flex-1 lg:pl-[240px]">
      <header className="sticky top-0 z-40 flex h-[72px] items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7">
        <button className="rounded-lg border p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[.18em] text-red-600">Bageshwari B2B</div>
          <div className="text-lg font-extrabold text-[#0b2d55]">Dealer Portal</div>
        </div>
        <div className="ml-auto hidden w-full max-w-sm items-center rounded-lg border bg-slate-50 px-3 md:flex">
          <Search className="h-4 w-4 text-slate-400" />
          <input className="h-10 w-full bg-transparent px-2 text-xs outline-none" placeholder="Search catalogue and orders" />
        </div>
        <NotificationBell />
      </header>
      <main>{children}</main>
    </div>
  </div>;
}
