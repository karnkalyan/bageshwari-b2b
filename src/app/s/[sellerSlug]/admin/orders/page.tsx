import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, Filter, Eye, Plus, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";

interface OrdersPageProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<{ status?: string; search?: string }>;
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

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      dealer: { select: { tradingName: true, code: true, contactName: true } },
      _count: { select: { items: true } },
    },
  });

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
          <div className="section-kicker">Sales operations</div>
          <h1 className="text-2xl font-black text-[#0b2d55]">B2B Orders Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage complete 20-step B2B order lifecycle
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/admin/orders/new`}>
            <Button className="bg-[#0f4c81] hover:bg-[#0b3860] text-white gap-2 font-bold shadow-xs">
              <Plus className="h-4 w-4" /> Create Sales Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
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
                    ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-2xs"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </Badge>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <form action={baseUrl} method="GET" className="flex items-center gap-2 w-full sm:w-80">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search}
                placeholder="Search order no, dealer..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold">
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
              <tbody className="divide-y text-slate-700">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No orders found matching this filter.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-bold font-mono text-slate-900">{ord.orderNumber}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{ord.dealer.tradingName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{ord.dealer.code} • {ord.dealer.contactName}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium">{ord._count.items} product(s)</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 font-mono">
                        {formatCurrency(Number(ord.grandTotal))}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {ord.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{formatDate(ord.createdAt)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/orders/${ord.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs font-semibold">
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
        </CardContent>
      </Card>
    </div>
  );
}
