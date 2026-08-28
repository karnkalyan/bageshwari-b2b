import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  FileText,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  Warehouse,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Send,
  PackageCheck,
  CreditCard,
  Building2,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage({ params }: { params: Promise<{ sellerSlug: string }> }) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  const [
    orderCount,
    dealers,
    products,
    lowStock,
    pendingApplications,
    recentOrders,
    statusRows,
    sales,
    proformaCount,
    finalInvoiceCount,
    shipmentCount,
    packageCount,
    recentShipments,
    recentApplications,
    topDealers,
  ] = await Promise.all([
    prisma.order.count({ where: { sellerId: ctx.sellerId } }),
    prisma.dealer.count({ where: { sellerId: ctx.sellerId, status: "ACTIVE" } }),
    prisma.product.count({ where: { sellerId: ctx.sellerId, status: "ACTIVE" } }),
    prisma.inventory.count({
      where: { sellerId: ctx.sellerId, availableQuantity: { lte: prisma.inventory.fields.reorderLevel } },
    }),
    prisma.dealerApplication.count({ where: { sellerId: ctx.sellerId, status: "SUBMITTED" } }),
    prisma.order.findMany({
      where: { sellerId: ctx.sellerId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { dealer: { select: { tradingName: true, code: true } } },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { sellerId: ctx.sellerId },
      _count: { _all: true },
      orderBy: { _count: { status: "desc" } },
    }),
    prisma.order.aggregate({
      where: { sellerId: ctx.sellerId, status: { notIn: ["DRAFT", "CANCELLED"] } },
      _sum: { grandTotal: true },
    }),
    prisma.proformaInvoice.count({ where: { sellerId: ctx.sellerId } }),
    prisma.finalInvoice.count({ where: { sellerId: ctx.sellerId } }),
    prisma.shipment.count({ where: { sellerId: ctx.sellerId } }),
    prisma.package.count({ where: { sellerId: ctx.sellerId } }),
    prisma.shipment.findMany({
      where: { sellerId: ctx.sellerId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { order: { include: { dealer: { select: { tradingName: true } } } } },
    }),
    prisma.dealerApplication.findMany({
      where: { sellerId: ctx.sellerId, status: "SUBMITTED" },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.dealer.findMany({
      where: { sellerId: ctx.sellerId, status: "ACTIVE" },
      include: {
        _count: { select: { orders: true } },
      },
      take: 5,
    }),
  ]);

  const totalSales = Number(sales._sum.grandTotal || 0);
  const maxOrder = Math.max(...recentOrders.map((order) => Number(order.grandTotal)), 1);
  const base = `/admin`;

  const kpis = [
    { icon: ShoppingCart, label: "Total Orders", value: orderCount.toLocaleString(), color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: TrendingUp, label: "Net Revenue", value: formatCurrency(totalSales), color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: FileText, label: "Proforma Invoices", value: proformaCount.toLocaleString(), color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: ShieldCheck, label: "VAT Invoices", value: finalInvoiceCount.toLocaleString(), color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { icon: Truck, label: "Dispatches", value: shipmentCount.toLocaleString(), color: "text-sky-500", bg: "bg-sky-500/10" },
    { icon: PackageCheck, label: "Cartons Packed", value: packageCount.toLocaleString(), color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { icon: Users, label: "Active Dealers", value: dealers.toLocaleString(), color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: UserPlus, label: "Dealer Requests", value: pendingApplications.toLocaleString(), color: "text-pink-500", bg: "bg-pink-500/10" },
    { icon: Package, label: "Products Catalog", value: products.toLocaleString(), color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: AlertTriangle, label: "Low Stock Alerts", value: lowStock.toLocaleString(), color: "text-red-500", bg: "bg-red-500/10" },
  ];

  const quickActions = [
    { icon: ShoppingCart, label: "Orders Pipeline", href: "/orders", color: "text-blue-500", desc: "View & confirm orders" },
    { icon: FileText, label: "Accounts Review", href: "/accounts", color: "text-amber-500", desc: "Proformas & Tax Invoices" },
    { icon: Warehouse, label: "Warehouse Picking", href: "/warehouse", color: "text-orange-500", desc: "Pick lists & Packaging" },
    { icon: Truck, label: "Dispatch Logistics", href: "/dispatch", color: "text-sky-500", desc: "Delivery challans & tracking" },
    { icon: Users, label: "Dealer Network", href: "/dealers", color: "text-pink-500", desc: "Accounts & Credit limits" },
    { icon: Package, label: "Product Catalog", href: "/products", color: "text-violet-500", desc: "Manage SKUs & pricing" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-6 p-4 md:p-7">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="section-kicker">Enterprise Overview</div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            {ctx.sellerName} Operations Hub
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Real-time pipeline monitoring, fulfillment queues, accounts review, and carrier logistics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`${base}/orders`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <ShoppingCart className="h-4 w-4" /> Manage Orders
          </Link>
          <Link
            href={`${base}/settings`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-accent transition-all shadow-2xs"
          >
            Settings & VAT
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 stagger-children">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="glass-card p-4 transition-all">
              <div className="flex items-center justify-between">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${k.bg}`}>
                  <Icon className={`h-4 w-4 ${k.color}`} />
                </div>
              </div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-1 truncate text-xl font-black text-foreground">{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts & Pipeline Section */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_.9fr]">
        {/* Order Revenue Bar Visualizer */}
        <section className="glass-card p-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Recent Order Values & Velocity
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Distribution of latest transaction volume</p>
            </div>
            <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-500">Live Feed</span>
          </div>

          <div className="mt-6 flex h-60 items-end gap-3 border-b border-l border-border px-4 pt-4">
            {recentOrders.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No orders recorded</div>
            ) : (
              recentOrders.slice().reverse().map((order) => (
                <div key={order.id} className="group flex h-full flex-1 flex-col justify-end">
                  <div
                    className="relative rounded-t-lg bg-gradient-to-t from-blue-600 via-blue-500 to-indigo-400 transition hover:from-red-600 hover:to-red-400"
                    style={{ height: `${Math.max(15, (Number(order.grandTotal) / maxOrder) * 88)}%` }}
                  >
                    <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-card border border-border px-2 py-0.5 text-[9px] font-bold text-foreground shadow-md group-hover:block z-10">
                      {formatCurrency(Number(order.grandTotal))}
                    </span>
                  </div>
                  <div className="mt-2 truncate text-center text-[9px] font-bold text-muted-foreground">
                    {order.orderNumber.replace("ORD-", "")}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Workflow Distribution */}
        <section className="glass-card p-5">
          <div className="border-b border-border pb-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Boxes className="h-4 w-4 text-blue-500" /> Order Workflow Pipeline
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active stage breakdown across entire order funnel</p>
          </div>

          <div className="space-y-3.5 mt-5">
            {statusRows.length ? (
              statusRows.map((row, index) => {
                const pct = Math.round((row._count._all / Math.max(orderCount, 1)) * 100);
                const colors = [
                  "bg-blue-500",
                  "bg-emerald-500",
                  "bg-amber-500",
                  "bg-purple-500",
                  "bg-cyan-500",
                  "bg-rose-500",
                ];
                const barColor = colors[index % colors.length];

                return (
                  <div key={row.status}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{ORDER_STATUS_LABELS[row.status] || row.status}</span>
                      <span className="font-mono font-bold text-muted-foreground">
                        {row._count._all} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.max(6, pct)}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No active pipeline stages</div>
            )}
          </div>
        </section>
      </div>

      {/* Orders & Logistics Double Row */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Recent Orders List */}
        <section className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-500" /> Recent Dealer Orders
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Latest purchase submissions</p>
            </div>
            <Link href={`${base}/orders`} className="text-xs font-bold text-blue-500 hover:underline">
              View All Orders &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Dealer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`${base}/orders/${order.id}`} className="font-bold text-blue-500 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{order.dealer.tradingName}</div>
                      <div className="text-[10px] text-muted-foreground">{order.dealer.code}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {formatCurrency(Number(order.grandTotal))}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px]">
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Dispatches & Shipments */}
        <section className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Truck className="h-4 w-4 text-sky-500" /> Active Dispatches & Challans
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Carrier manifests and delivery tracking</p>
            </div>
            <Link href={`${base}/dispatch`} className="text-xs font-bold text-sky-500 hover:underline">
              Logistics Portal &rarr;
            </Link>
          </div>

          <div className="divide-y divide-border text-xs">
            {recentShipments.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground">No recent shipments recorded.</div>
            ) : (
              recentShipments.map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <span>{s.shipmentNumber}</span>
                      {s.challanNumber && (
                        <span className="text-[10px] font-mono font-semibold text-blue-500">
                          Challan: {s.challanNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">
                      {s.order.dealer.tradingName} • Carrier: {s.transporter || "Carrier"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-sky-500/10 text-sky-500 border border-sky-500/20 text-[10px]">
                      {s.status}
                    </Badge>
                    <a
                      href={`/api/orders/${s.orderId}/documents/dispatch-challan`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent text-sky-500 transition-colors shadow-2xs"
                      title="View Challan PDF"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Dealer Network & Applications Row */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Dealership Applications Queue */}
        <section className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-pink-500" /> Pending Dealer Applications ({pendingApplications})
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Review, approve, or request documents</p>
            </div>
            <Link href={`${base}/dealers`} className="text-xs font-bold text-pink-500 hover:underline">
              Dealers Portal &rarr;
            </Link>
          </div>

          <div className="divide-y divide-border text-xs">
            {recentApplications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No pending dealership applications.</div>
            ) : (
              recentApplications.map((app) => (
                <div key={app.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <div className="font-bold text-foreground">{app.businessName}</div>
                    <div className="text-muted-foreground text-[11px]">
                      {app.contactName} • {app.phone} • {app.city}
                    </div>
                  </div>
                  <Link href={`${base}/dealers`}>
                    <Button size="sm" className="h-8 text-xs bg-pink-600 hover:bg-pink-700 text-white font-bold px-3">
                      Review <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Operations Launchpad */}
        <section className="glass-card p-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground">Operational Workspaces</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Fast navigation to core business modules</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {quickActions.map((qa) => {
              const ActionIcon = qa.icon;
              return (
                <Link
                  key={qa.label}
                  href={`${base}${qa.href}`}
                  className="group rounded-xl border border-border bg-card p-3.5 transition-all hover:border-primary/40 hover:bg-accent hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ActionIcon className={`h-5 w-5 ${qa.color} transition-transform group-hover:scale-110`} />
                  <div className="mt-2.5 text-xs font-bold text-foreground">{qa.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{qa.desc}</div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
