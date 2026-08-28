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
  Bell, Command,
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
    label: "Sales & orders",
    items: [
      {
        label: "Orders",
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
        label: "Accounts & invoices",
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
    label: "Catalogue",
    items: [
      {
        label: "Products",
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
        label: "Warehouse & Fulfillment",
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
    label: "Dealer management",
    items: [
      {
        label: "Dealers",
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
    label: "Configuration",
    items: [
      {
        label: "Settings",
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
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

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
            ? "bg-gradient-to-r from-blue-600/90 to-blue-500/80 text-white shadow-lg shadow-blue-900/30"
            : "text-white/60 hover:bg-white/8 hover:text-white",
        )}
      >
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
          active ? "bg-white/15" : "bg-transparent",
        )}>
          <Icon className={cn("h-[18px] w-[18px]", active ? "text-white" : item.color || "text-white/60")} />
        </span>
        {!collapsed && (
          <span className="sidebar-item-text flex-1 truncate">{item.label}</span>
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
      {/* Logo */}
      <div className={cn(
        "flex h-[68px] items-center border-b border-white/8 px-4",
        collapsed && !isMobile && "justify-center px-2",
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-950/40 transition-transform hover:scale-105">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 animate-fade-in">
              <div className="truncate text-sm font-black uppercase tracking-wide">{sellerName}</div>
              <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-blue-300/80">B2B Platform</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-3 py-4">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            {(!collapsed || isMobile) && (
              <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[.18em] text-white/30">
                {group.label}
              </div>
            )}
            {collapsed && !isMobile && <div className="mb-1 h-px bg-white/8 mx-2" />}
            <div className="space-y-0.5">
              {group.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/8 p-3 space-y-2">
        {/* Theme toggle */}
        <div className={cn("flex justify-center", !collapsed || isMobile ? "px-1" : "")}>
          <ThemeToggle collapsed={collapsed && !isMobile} />
        </div>

        {/* Storefront link */}
        {(!collapsed || isMobile) ? (
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl bg-white/6 px-3 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/12 hover:text-white transition-all"
          >
            <Store className="h-4 w-4 text-red-400 shrink-0" />
            <span className="sidebar-item-text">View storefront</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="flex justify-center rounded-xl bg-white/6 p-2.5 text-white/60 hover:bg-white/12 hover:text-white transition-all"
            title="View storefront"
          >
            <Store className="h-4 w-4 text-red-400" />
          </Link>
        )}

        {/* User profile */}
        <div className={cn(
          "flex items-center gap-3 rounded-xl bg-white/5 p-2.5 transition-all",
          collapsed && !isMobile && "justify-center p-2",
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-lg">
            {(user?.name || "A").charAt(0).toUpperCase()}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white/90">{user?.name || "Admin User"}</div>
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
              className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-medium text-white/40 hover:bg-white/8 hover:text-white/70 transition-all"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <div className={cn("fixed inset-y-0 left-0 z-50 hidden lg:block sidebar-transition", sidebarWidth)}>
        {sidebarContent()}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="h-full animate-slide-in-left" onClick={(e) => e.stopPropagation()}>
            {sidebarContent(true)}
          </div>
          <button
            aria-label="Close navigation"
            className="absolute right-4 top-4 rounded-full glass p-2.5 text-white"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className={cn("min-w-0 flex-1 sidebar-transition", paddingLeft)}>
        {/* Top header bar */}
        <header className="sticky top-0 z-40 flex h-[64px] items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
          {/* Mobile menu button */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent lg:hidden transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Page title */}
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{sellerName}</div>
            <div className="truncate text-lg font-extrabold text-foreground">{current?.label || "Admin"}</div>
          </div>

          {/* Search bar */}
          <div className="ml-auto hidden w-full max-w-sm items-center rounded-xl border border-border bg-card/60 backdrop-blur-sm px-3 md:flex group transition-all focus-within:border-ring focus-within:shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
            <input
              className="h-9 w-full bg-transparent px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
              placeholder="Search orders, dealers, products..."
            />
            <kbd className="hidden rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
              ⌘K
            </kbd>
          </div>

          {/* Notifications */}
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
