import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Boxes, FileText, Package, ShoppingCart, TrendingUp, Truck, UserPlus, Users, Warehouse } from "lucide-react";

export default async function AdminDashboardPage({ params }: { params: Promise<{ sellerSlug: string }> }) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);
  const [orderCount, dealers, products, lowStock, pendingApplications, recentOrders, statusRows, sales] = await Promise.all([
    prisma.order.count({ where: { sellerId: ctx.sellerId } }),
    prisma.dealer.count({ where: { sellerId: ctx.sellerId, status: "ACTIVE" } }),
    prisma.product.count({ where: { sellerId: ctx.sellerId, status: "ACTIVE" } }),
    prisma.inventory.count({ where: { sellerId: ctx.sellerId, availableQuantity: { lte: prisma.inventory.fields.reorderLevel } } }),
    prisma.dealerApplication.count({ where: { sellerId: ctx.sellerId, status: "SUBMITTED" } }),
    prisma.order.findMany({ where: { sellerId: ctx.sellerId }, orderBy: { createdAt: "desc" }, take: 6, include: { dealer: { select: { tradingName: true, code: true } } } }),
    prisma.order.groupBy({ by: ["status"], where: { sellerId: ctx.sellerId }, _count: { _all: true }, orderBy: { _count: { status: "desc" } }, take: 5 }),
    prisma.order.aggregate({ where: { sellerId: ctx.sellerId, status: { notIn: ["DRAFT", "CANCELLED"] } }, _sum: { grandTotal: true } }),
  ]);
  const totalSales = Number(sales._sum.grandTotal || 0);
  const maxOrder = Math.max(...recentOrders.map((order) => Number(order.grandTotal)), 1);
  const base = `/admin`;

  const kpis: [React.ElementType, string, string, string, string][] = [
    [ShoppingCart, "Total orders", orderCount.toLocaleString(), "bg-blue-500/10 dark:bg-blue-500/20", "text-blue-500"],
    [TrendingUp, "Order value", formatCurrency(totalSales), "bg-emerald-500/10 dark:bg-emerald-500/20", "text-emerald-500"],
    [Users, "Active dealers", dealers.toLocaleString(), "bg-violet-500/10 dark:bg-violet-500/20", "text-violet-500"],
    [Package, "Products", products.toLocaleString(), "bg-amber-500/10 dark:bg-amber-500/20", "text-amber-500"],
    [AlertTriangle, "Low stock", lowStock.toLocaleString(), "bg-red-500/10 dark:bg-red-500/20", "text-red-500"],
    [FileText, "Dealer applications", pendingApplications.toLocaleString(), "bg-cyan-500/10 dark:bg-cyan-500/20", "text-cyan-500"],
  ];

  const quickActions: [React.ElementType, string, string, string][] = [
    [ShoppingCart, "Orders", "/orders", "text-blue-500"],
    [UserPlus, "Dealers", "/dealers", "text-pink-500"],
    [Package, "Products", "/products", "text-violet-500"],
    [Warehouse, "Warehouse", "/warehouse", "text-orange-500"],
    [FileText, "Accounts", "/accounts", "text-amber-500"],
    [Truck, "Dispatch", "/dispatch", "text-sky-500"],
  ];

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5 p-4 md:p-7">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="section-kicker">Operations overview</div>
          <h1 className="mt-1 text-2xl font-black text-foreground">Good day, {ctx.sellerName}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Live seller activity, fulfilment queues and dealer performance.</p>
        </div>
        <Link
          href={`${base}/orders`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-xs font-black text-white shadow-lg shadow-blue-600/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          Manage orders <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 stagger-children">
        {kpis.map(([Icon, label, value, bgTone, iconColor]) => (
          <div key={label} className="glass-card p-4">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${bgTone}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 truncate text-xl font-black text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
        {/* Order value chart */}
        <section className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-foreground">Recent order value</h2>
              <p className="text-[10px] text-muted-foreground">Latest orders in the seller workspace</p>
            </div>
            <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-[9px] font-bold text-blue-500 dark:bg-blue-500/20">Live data</span>
          </div>
          <div className="mt-6 flex h-56 items-end gap-3 border-b border-l border-border px-4 pt-4">
            {recentOrders.slice().reverse().map((order) => (
              <div key={order.id} className="group flex h-full flex-1 flex-col justify-end">
                <div
                  className="relative rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition hover:from-red-600 hover:to-red-400"
                  style={{ height: `${Math.max(12, Number(order.grandTotal) / maxOrder * 88)}%` }}
                >
                  <span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[8px] font-bold text-muted-foreground group-hover:block">
                    {formatCurrency(Number(order.grandTotal))}
                  </span>
                </div>
                <div className="mt-2 truncate text-center text-[8px] font-bold text-muted-foreground">
                  {order.orderNumber.replace("ORD-", "")}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Order status distribution */}
        <section className="glass-card overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="text-sm font-black text-foreground">Order status</h2>
            <p className="text-[10px] text-muted-foreground">Current workflow distribution</p>
          </div>
          <div className="space-y-4 p-5">
            {statusRows.length ? statusRows.map((row, index) => (
              <div key={row.status}>
                <div className="mb-1.5 flex items-center justify-between text-[10px]">
                  <span className="font-bold text-muted-foreground">{ORDER_STATUS_LABELS[row.status] || row.status}</span>
                  <span className="font-black text-foreground">{row._count._all}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={index === 0 ? "h-full bg-blue-500 rounded-full" : index === 1 ? "h-full bg-emerald-500 rounded-full" : index === 2 ? "h-full bg-amber-500 rounded-full" : "h-full bg-violet-500 rounded-full"}
                    style={{ width: `${Math.max(8, row._count._all / Math.max(orderCount, 1) * 100)}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No order activity yet</div>
            )}
          </div>
        </section>
      </div>

      {/* Recent orders + Quick actions */}
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
        {/* Recent orders table */}
        <section className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-foreground">Recent orders</h2>
              <p className="text-[10px] text-muted-foreground">Newest dealer purchase activity</p>
            </div>
            <Link href={`${base}/orders`} className="text-[10px] font-black text-blue-500 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-[11px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Dealer</th>
                  <th className="px-5 py-3">Value</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-5 py-3">
                      <Link href={`${base}/orders/${order.id}`} className="font-black text-blue-500 hover:underline">{order.orderNumber}</Link>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-foreground">{order.dealer.tradingName}</div>
                      <div className="text-[9px] text-muted-foreground">{order.dealer.code}</div>
                    </td>
                    <td className="px-5 py-3 font-black text-foreground">{formatCurrency(Number(order.grandTotal))}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-[9px] font-bold text-blue-500 dark:bg-blue-500/20">
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick actions */}
        <section className="glass-card p-5">
          <h2 className="text-sm font-black text-foreground">Quick actions</h2>
          <p className="text-[10px] text-muted-foreground">Open common operational workspaces</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {quickActions.map(([Icon, label, href, color]) => (
              <Link
                key={label}
                href={`${base}${href}`}
                className="group rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/30 hover:bg-accent hover:-translate-y-0.5 hover:shadow-md"
              >
                <Icon className={`mx-auto h-5 w-5 ${color} transition-transform group-hover:scale-110`} />
                <div className="mt-2 text-[10px] font-black text-foreground">{label}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
