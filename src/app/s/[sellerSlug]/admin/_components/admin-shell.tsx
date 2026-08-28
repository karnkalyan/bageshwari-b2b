"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Boxes, ChevronLeft, ChevronRight, CircleUserRound, FileText, LayoutDashboard,
  LogOut, Menu, Package, Search, ShoppingCart, Store, Truck,
  Users, Warehouse, X, Shield, Settings, PanelLeftClose, PanelLeftOpen,
  Bell, Command, Sparkles
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

type AdminShellProps = {
  children: React.ReactNode;
  sellerSlug: string;
  sellerName: string;
  user: { name?: string | null; email?: string | null } | null | undefined;
  roles?: string[];
  permissions?: string[];
};

type NavItem = {
  label: string;
  segment: string;
  icon: any;
  color?: string;
  badge?: string;
  allowedRoles?: string[];
  allowedPermissions?: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const ALL_PRIVILEGED_ROLES = ["SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF"];

const navigationGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", segment: "", icon: LayoutDashboard, color: "text-blue-400" },
    ],
  },
  {
    label: "Sales & Orders",
    items: [
      {
        label: "Orders Pipeline",
        segment: "/orders",
        icon: ShoppingCart,
        color: "text-emerald-400",
        allowedRoles: [
          ...ALL_PRIVILEGED_ROLES,
          "SALESPERSON", "SALES_REP", "SALES_MANAGER",
          "ACCOUNTANT", "ACCOUNTS_MANAGER", "ACCOUNT_MANAGER",
          "DISPATCH_USER", "LOGISTICS_MANAGER", "WAREHOUSE_MANAGER",
        ],
        allowedPermissions: ["order.view", "order.submit", "order.review", "order.manage"],
      },
      {
        label: "Accounts & Invoices",
        segment: "/accounts",
        icon: FileText,
        color: "text-amber-400",
        allowedRoles: [
          ...ALL_PRIVILEGED_ROLES,
          "ACCOUNTANT", "ACCOUNTS_MANAGER", "ACCOUNT_MANAGER", "ACCOUNTS_USER", "FINANCE",
        ],
        allowedPermissions: ["invoice.generate", "payment.record", "order.revise", "credit.approve"],
      },
      {
        label: "Dispatch & Logistics",
        segment: "/dispatch",
        icon: Truck,
        color: "text-sky-400",
        allowedRoles: [
          ...ALL_PRIVILEGED_ROLES,
          "DISPATCH_USER", "LOGISTICS_MANAGER", "WAREHOUSE_MANAGER",
        ],
        allowedPermissions: ["shipment.dispatch", "packing.manage", "delivery.update"],
      },
    ],
  },
  {
    label: "Inventory & Fulfillment",
    items: [
      {
        label: "Products Catalog",
        segment: "/products",
        icon: Package,
        color: "text-violet-400",
        allowedRoles: [
          ...ALL_PRIVILEGED_ROLES,
          "PRODUCT_MANAGER", "SALESPERSON", "SALES_REP", "SALES_MANAGER",
          "ACCOUNTANT", "ACCOUNTS_MANAGER", "WAREHOUSE_MANAGER",
        ],
        allowedPermissions: ["product.manage", "product.view"],
      },
      {
        label: "Warehouse Operations",
        segment: "/warehouse",
        icon: Warehouse,
        color: "text-orange-400",
        allowedRoles: [
          ...ALL_PRIVILEGED_ROLES,
          "WAREHOUSE_MANAGER", "WAREHOUSE_USER", "WAREHOUSE_PICKER", "PACKING_USER",
          "ACCOUNTANT", "ACCOUNTS_MANAGER", "SALESPERSON", "SALES_REP", "SALES_MANAGER",
        ],
        allowedPermissions: ["picklist.generate", "picklist.complete", "inventory.manage"],
      },
    ],
  },
  {
    label: "Dealer Network",
    items: [
      {
        label: "Authorized Dealers",
        segment: "/dealers",
        icon: Users,
        color: "text-pink-400",
        allowedRoles: [
          ...ALL_PRIVILEGED_ROLES,
          "SALESPERSON", "SALES_REP", "SALES_MANAGER",
          "ACCOUNTANT", "ACCOUNTS_MANAGER", "ACCOUNT_MANAGER",
        ],
        allowedPermissions: ["dealer.manage", "dealer.view"],
      },
    ],
  },
  {
    label: "System Configuration",
    items: [
      {
        label: "Settings & Company Profile",
        segment: "/settings",
        icon: Settings,
        color: "text-slate-400",
        allowedRoles: [
          ...ALL_PRIVILEGED_ROLES,
          "ACCOUNTANT", "ACCOUNTS_MANAGER",
        ],
        allowedPermissions: ["seller.manage", "system.manage"],
      },
    ],
  },
];

function isItemVisible(item: NavItem, userRoles: string[], userPermissions: string[]): boolean {
  if (!item.allowedRoles && !item.allowedPermissions) return true;
  if (userRoles.some((r) => ALL_PRIVILEGED_ROLES.includes(r))) return true;
  if (item.allowedRoles && item.allowedRoles.some((r) => userRoles.includes(r))) return true;
  if (item.allowedPermissions && item.allowedPermissions.some((p) => userPermissions.includes(p))) return true;
  return false;
}

export function AdminShell({
  children,
  sellerSlug,
  sellerName,
  user,
  roles = [],
  permissions = [],
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const base = "/admin";

  // Persist collapsed state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved === "true") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar-collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const filteredGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isItemVisible(item, roles, permissions)),
    }))
    .filter((group) => group.items.length > 0);

  const current = filteredGroups
    .flatMap((group) => group.items)
    .find((item) => {
      const href = `${base}${item.segment}`;
      return item.segment ? pathname.startsWith(href) : pathname === base;
    });

  const primaryRole = roles[0]?.replace(/_/g, " ") || "Staff Member";
  const sidebarWidth = collapsed ? "w-[72px]" : "w-[260px]";
  const paddingLeft = collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]";

  const renderNavItem = (item: NavItem) => {
    const href = `${base}${item.segment}`;
    const active = item.segment ? pathname.startsWith(href) : pathname === href;
    const Icon = item.icon;

    return (
      <Link
        key={item.label}
        href={href}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
          collapsed && "justify-center px-0",
          active
            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/30"
            : "text-slate-300 hover:bg-white/10 hover:text-white dark:text-slate-400 dark:hover:text-white",
        )}
      >
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
          active ? "bg-white/20 text-white" : "bg-transparent",
        )}>
          <Icon className={cn("h-[18px] w-[18px]", active ? "text-white" : item.color || "text-slate-300")} />
        </span>
        {!collapsed && (
          <span className="sidebar-item-text flex-1 truncate font-medium">{item.label}</span>
        )}
        {!collapsed && active && (
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-glow" />
        )}
      </Link>
    );
  };

  const sidebarContent = (isMobile = false) => (
    <aside className={cn(
      "glass-sidebar flex h-full flex-col text-white sidebar-transition",
      isMobile ? "w-[280px]" : sidebarWidth,
    )}>
      {/* Brand Header */}
      <div className={cn(
        "flex h-[68px] items-center border-b border-white/10 px-4",
        collapsed && !isMobile && "justify-center px-2",
      )}>
        <Link href={base} className="flex items-center gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-950/40 transition-transform hover:scale-105">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 animate-fade-in">
              <div className="truncate text-sm font-black uppercase tracking-wide text-white">{sellerName}</div>
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-300">B2B Control Hub</div>
            </div>
          )}
        </Link>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-3 py-4">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            {(!collapsed || isMobile) && (
              <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">
                {group.label}
              </div>
            )}
            {collapsed && !isMobile && <div className="mb-1 h-px bg-white/10 mx-2" />}
            <div className="space-y-0.5">
              {group.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {/* Storefront link */}
        {(!collapsed || isMobile) ? (
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl bg-white/8 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/15 hover:text-white transition-all border border-white/5"
          >
            <Store className="h-4 w-4 text-red-400 shrink-0" />
            <span className="sidebar-item-text">View Public Storefront</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="flex justify-center rounded-xl bg-white/8 p-2.5 text-slate-300 hover:bg-white/15 hover:text-white transition-all border border-white/5"
            title="View Public Storefront"
          >
            <Store className="h-4 w-4 text-red-400" />
          </Link>
        )}

        {/* User Card */}
        <div className={cn(
          "flex items-center gap-3 rounded-xl bg-white/8 p-2.5 border border-white/5 transition-all",
          collapsed && !isMobile && "justify-center p-2",
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-md">
            {(user?.name || "A").charAt(0).toUpperCase()}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{user?.name || "Admin User"}</div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold uppercase tracking-wider truncate">
                <Shield className="h-2.5 w-2.5 shrink-0" />
                <span>{primaryRole}</span>
              </div>
            </div>
          )}
          {(!collapsed || isMobile) && (
            <button
              aria-label="Sign out"
              onClick={() => signOut({ callbackUrl: "/staff/login" })}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex transition-colors duration-200">
      {/* Desktop sidebar */}
      <div className={cn("fixed inset-y-0 left-0 z-50 hidden lg:block sidebar-transition", sidebarWidth)}>
        {sidebarContent()}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="h-full animate-slide-in-left" onClick={(e) => e.stopPropagation()}>
            {sidebarContent(true)}
          </div>
          <button
            aria-label="Close navigation"
            className="absolute right-4 top-4 rounded-full glass p-2.5 text-white shadow-xl"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Main content wrapper */}
      <div className={cn("min-w-0 flex-1 sidebar-transition", paddingLeft)}>
        {/* Sticky Top Navbar */}
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-xl md:px-7 shadow-xs">
          {/* Left section: Hamburger (Mobile) + Desktop Sidebar Expand/Collapse + Current Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu trigger */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground hover:bg-accent lg:hidden transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Desktop Collapse / Expand Toggle Button in Navbar */}
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex h-9 items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-2.5 text-xs font-semibold text-foreground hover:bg-accent hover:text-primary transition-all shadow-2xs"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <>
                  <PanelLeftOpen className="h-4 w-4 text-blue-500" />
                  <span className="text-[11px] font-bold">Expand</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-[11px] font-medium">Collapse</span>
                </>
              )}
            </button>

            <div className="h-5 w-px bg-border hidden sm:block" />

            {/* Breadcrumb / Title */}
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{sellerName}</div>
              <div className="truncate text-base font-extrabold text-foreground">{current?.label || "Admin Hub"}</div>
            </div>
          </div>

          {/* Right section: Search bar + Theme Toggle (Light/Dark) + Notification Bell */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="hidden w-56 md:w-72 items-center rounded-xl border border-border bg-muted/40 px-3 md:flex group transition-all focus-within:border-primary focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20">
              <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors shrink-0" />
              <input
                className="h-9 w-full bg-transparent px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Search orders, products, dealers..."
              />
              <kbd className="hidden rounded-md border border-border bg-muted/80 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground sm:inline-flex">
                ⌘K
              </kbd>
            </div>

            {/* Light / Dark Mode Toggle Button in Navbar */}
            <div className="flex items-center rounded-xl border border-border bg-muted/50 p-0.5">
              <ThemeToggle collapsed={false} />
            </div>

            {/* Notifications */}
            <NotificationBell />
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="animate-fade-in bg-background text-foreground">{children}</main>
      </div>
    </div>
  );
}
