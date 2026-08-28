import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, Filter, Eye, Plus, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";

interface OrdersPageProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}

export default async function AdminOrdersPage({ params, searchParams }: OrdersPageProps) {
  const { sellerSlug } = await params;
  const query = await searchParams;
  const ctx = await getTenantContext(sellerSlug);

  const statusFilter = query.status || "";
  const search = query.search || "";

  const where: any = { sellerId: ctx.sellerId };

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { dealer: { tradingName: { contains: search } } },
      { dealer: { code: { contains: search } } },
    ];
  }

  const currentPage = parseInt(query.page || "1", 10);
  const pageSize = 20;

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        dealer: { select: { tradingName: true, code: true, contactName: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where })
  ]);

  const baseUrl = `/admin/orders`;

  const statusTabs = [
    { label: "All Orders", status: "" },
    { label: "Accounts Review", status: "PENDING_ACCOUNTS_REVIEW" },
    { label: "Awaiting Confirmation", status: "WAITING_FOR_DEALER_CONFIRMATION" },
    { label: "Confirmed", status: "FINAL_ORDER_CONFIRMED" },
    { label: "Proforma Generated", status: "PROFORMA_INVOICE_GENERATED" },
    { label: "Ready Warehouse", status: "READY_FOR_WAREHOUSE" },
    { label: "Shipped", status: "SHIPPED" },
    { label: "Completed", status: "COMPLETED" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-kicker">Sales Operations</div>
          <h1 className="text-2xl font-black text-foreground">B2B Orders Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage complete 20-step B2B order lifecycle
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/admin/orders/new`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold shadow-xs">
              <Plus className="h-4 w-4" /> Create Sales Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        {statusTabs.map((tab) => {
          const isActive = (statusFilter || "") === tab.status;
          const href = tab.status
            ? `${baseUrl}?status=${tab.status}${search ? `&search=${encodeURIComponent(search)}` : ""}`
            : `${baseUrl}${search ? `?search=${encodeURIComponent(search)}` : ""}`;

          return (
            <Link key={tab.label} href={href}>
              <Badge
                variant="outline"
                className={`cursor-pointer px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border-border"
                }`}
              >
                {tab.label}
              </Badge>
            </Link>
          );
        })}
      </div>

      {/* Search form */}
      <div className="glass-card p-4">
        <form action={baseUrl} method="GET" className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              defaultValue={search}
              placeholder="Search order no, dealer..."
              className="pl-9 h-9 text-xs bg-background text-foreground border-border"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs border border-border">
            Search
          </Button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Dealer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Grand Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No orders found matching this filter.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold font-mono text-blue-500">
                      <Link href={`/admin/orders/${ord.id}`} className="hover:underline">
                        {ord.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{ord.dealer.tradingName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{ord.dealer.code} • {ord.dealer.contactName}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium">{ord._count.items} product(s)</td>
                    <td className="px-4 py-3.5 font-bold text-foreground font-mono">
                      {formatCurrency(Number(ord.grandTotal))}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold">
                        {ORDER_STATUS_LABELS[ord.status] || ord.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{formatDate(ord.createdAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/admin/orders/${ord.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs font-semibold border-border">
                          View Order
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination totalPages={Math.ceil(totalCount / pageSize)} />
      </div>
    </div>
  );
}
