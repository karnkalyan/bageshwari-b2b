"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Boxes, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";

export type PortalNavItem = { label: string; href: string };

export function PortalShell({
  title,
  user,
  items,
  children,
}: {
  title: string;
  user?: { name?: string | null; email?: string | null } | null;
  items: PortalNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navigation = (
    <aside className="flex h-full w-64 flex-col bg-[#072d57] text-white">
      <Link href="/" className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-600">
          <Boxes className="h-5 w-5" />
        </span>
        <span>
          <strong className="block text-sm uppercase">Bageshwari Tractors</strong>
          <small className="text-[9px] uppercase tracking-[.16em] text-blue-200">{title}</small>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "block rounded-lg px-4 py-3 text-xs font-bold text-blue-100/80 hover:bg-white/10 hover:text-white",
              pathname === item.href && "bg-[#1268d3] text-white"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="truncate text-xs font-bold">{user?.name}</div>
        <div className="truncate text-[10px] text-blue-200/70">{user?.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: window.location.origin + "/staff/login" })}
          className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-100"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb] lg:flex">
      <div className="fixed inset-y-0 left-0 z-50 hidden lg:block">{navigation}</div>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-64" onClick={(event) => event.stopPropagation()}>
            {navigation}
          </div>
          <button
            className="absolute right-4 top-4 rounded-full bg-white p-2"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className="min-w-0 flex-1 lg:pl-64">
        <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-7">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button onClick={() => setOpen(true)} className="rounded-lg border p-2 lg:hidden shrink-0" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 truncate">Operations workspace</div>
              <h1 className="text-base sm:text-lg font-black text-[#092f5c] truncate">{title}</h1>
            </div>
          </div>
          <div className="shrink-0">
            <NotificationBell />
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
