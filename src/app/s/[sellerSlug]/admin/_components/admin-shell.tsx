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
  Bell, Command, UserCog, KeyRound, ShieldAlert
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
      { label: "Dashboard", segment: "", icon: LayoutDashboard, color: "text-blue-500" },
    ],
  },
  {
    label: "Sales & Orders",
    items: [
      {
        label: "Orders Pipeline",
        segment: "/orders",
        icon: ShoppingCart,
        color: "text-emerald-500",
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
        color: "text-amber-500",
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
        color: "text-sky-500",
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
        color: "text-violet-500",
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
        color: "text-orange-500",
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
        color: "text-pink-500",
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
    label: "User & Access Management",
    items: [
      {
        label: "Staff & Users",
        segment: "/users",
        icon: UserCog,
        color: "text-indigo-500",
        allowedRoles: [...ALL_PRIVILEGED_ROLES],
        allowedPermissions: ["system.manage", "seller.manage"],
      },
      {
        label: "Roles & Permissions",
        segment: "/roles",
        icon: KeyRound,
        color: "text-cyan-500",
        allowedRoles: [...ALL_PRIVILEGED_ROLES],
        allowedPermissions: ["system.manage", "seller.manage"],
      },
    ],
  },
  {
    label: "System Configuration",
    items: [
      {
        label: "Company Profile & VAT",
        segment: "/settings",
        icon: Settings,
        color: "text-slate-500 dark:text-slate-400",
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
  const sidebarWidth = collapsed ? "w-[68px]" : "w-[260px]";
  const paddingLeft = collapsed ? "lg:pl-[68px]" : "lg:pl-[260px]";

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
          "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
          collapsed && "justify-center px-0",
          active
            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
            : "text-foreground/75 hover:bg-accent hover:text-foreground",
        )}
      >
        <span className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
          active ? "bg-white/20 text-white" : "bg-transparent",
        )}>
          <Icon className={cn("h-4 w-4", active ? "text-primary-foreground" : item.color || "text-muted-foreground")} />
        </span>
        {!collapsed && (
          <span className="sidebar-item-text flex-1 truncate">{item.label}</span>
        )}
      </Link>
    );
  };

  const sidebarContent = (isMobile = false) => (
    <aside className={cn(
      "glass-sidebar flex h-full flex-col text-foreground sidebar-transition",
      isMobile ? "w-[280px]" : sidebarWidth,
    )}>
      {/* Brand Header */}
      <div className={cn(
        "flex h-[64px] items-center border-b border-border px-4",
        collapsed && !isMobile && "justify-center px-2",
      )}>
        <Link href={base} className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-xs text-white font-bold">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 animate-fade-in">
              <div className="truncate text-xs font-black uppercase tracking-wider text-foreground">{sellerName}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">B2B Management</div>
            </div>
          )}
        </Link>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-2.5 py-3">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            {(!collapsed || isMobile) && (
              <div className="mb-1.5 px-2.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </div>
            )}
            {collapsed && !isMobile && <div className="mb-1 h-px bg-border/50 mx-1" />}
            <div className="space-y-0.5">
              {group.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom User Area */}
      <div className="border-t border-border p-2.5 space-y-1.5">
        {(!collapsed || isMobile) ? (
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
          >
            <Store className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span className="sidebar-item-text">View Storefront</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="flex justify-center rounded-lg bg-muted/50 p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            title="View Storefront"
          >
            <Store className="h-3.5 w-3.5 text-red-500" />
          </Link>
        )}

        <div className={cn(
          "flex items-center gap-2.5 rounded-xl bg-card p-2 border border-border transition-all",
          collapsed && !isMobile && "justify-center p-1.5",
        )}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-2xs">
            {(user?.name || "A").charAt(0).toUpperCase()}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-foreground">{user?.name || "Admin User"}</div>
              <div className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider truncate">
                <Shield className="h-2.5 w-2.5 shrink-0" />
                <span>{primaryRole}</span>
              </div>
            </div>
          )}
          {(!collapsed || isMobile) && (
            <button
              aria-label="Sign out"
              onClick={() => signOut({ callbackUrl: window.location.origin + "/staff/login" })}
              className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
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
            className="absolute right-4 top-4 rounded-full bg-card border border-border p-2 text-foreground shadow-lg"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main content wrapper */}
      <div className={cn("min-w-0 flex-1 sidebar-transition", paddingLeft)}>
        {/* Sticky Top Navbar */}
        <header className="sticky top-0 z-40 flex h-[64px] items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md md:px-7">
          {/* Left section: Hamburger + Desktop Collapse/Expand + Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu trigger */}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-foreground hover:bg-accent lg:hidden transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Desktop Collapse / Expand Toggle Button in Navbar */}
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 text-xs font-semibold text-foreground hover:bg-accent transition-all shadow-2xs"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <>
                  <PanelLeftOpen className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-bold">Expand</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-medium">Collapse</span>
                </>
              )}
            </button>

            <div className="h-4 w-px bg-border hidden sm:block" />

            {/* Breadcrumb / Title */}
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{sellerName}</div>
              <div className="truncate text-sm md:text-base font-extrabold text-foreground">{current?.label || "Admin Hub"}</div>
            </div>
          </div>

          {/* Right section: Search bar + Theme Toggle + Notifications */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="hidden w-52 md:w-64 items-center rounded-lg border border-border bg-muted/40 px-2.5 md:flex group transition-all focus-within:border-primary focus-within:bg-card focus-within:ring-1 focus-within:ring-primary/20">
              <Search className="h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors shrink-0" />
              <input
                className="h-8 w-full bg-transparent px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Search orders, products, dealers..."
              />
              <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.2 text-[9px] font-semibold text-muted-foreground sm:inline-flex">
                ⌘K
              </kbd>
            </div>

            {/* High-Contrast Light / Dark Mode Toggle in Navbar */}
            <ThemeToggle collapsed={false} />

            {/* Notifications */}
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <main className="animate-fade-in bg-background text-foreground min-h-[calc(100vh-64px)]">{children}</main>
      </div>
    </div>
  );
}
