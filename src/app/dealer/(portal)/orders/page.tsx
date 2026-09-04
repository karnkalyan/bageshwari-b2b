import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, ArrowRight, Package } from "lucide-react";

export default async function DealerOrdersPage() {
  const ctx = await getTenantContext("bageshwari", "/dealer/login");
  if (!ctx.dealerId) redirect("/dealer/login");

  const orders = await prisma.order.findMany({
    where: { sellerId: ctx.sellerId, dealerId: ctx.dealerId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="section-kicker">Authorized Dealership</div>
          <h1 className="text-2xl font-black text-[#092f5c]">My Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track real-time progress through Accounts review, Proforma, Warehouse picking & Dispatch
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dealer/orders/new">
            <Button className="bg-[#0b2d55] hover:bg-[#124177] text-white font-bold text-xs h-9 shadow-xs flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Create Sales Order
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" size="sm" className="text-xs h-9">
              <ShoppingCart className="h-3.5 w-3.5 mr-1 text-red-600" /> Browse Catalogue
            </Button>
          </Link>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs space-y-3">
          <Package className="h-12 w-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-[#092f5c]">No orders placed yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You can create a new sales order with your exclusive dealer pricing or browse the product catalogue.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/dealer/orders/new">
              <Button className="bg-[#0b2d55] text-white font-bold text-xs">
                <Plus className="h-4 w-4 mr-1" /> Create Your First Sales Order
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/dealer/orders/${order.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-slate-50/70 transition gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-[#092f5c]">{order.orderNumber}</strong>
                    <Badge variant="outline" className={`text-[10px] ${ORDER_STATUS_COLORS[order.status] || ""}`}>
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500">Placed on {formatDate(order.createdAt)}</div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <strong className="text-sm font-bold text-slate-900 block tabular-nums">
                      {formatCurrency(Number(order.grandTotal))}
                    </strong>
                    <span className="text-[10px] text-slate-400">13% VAT included</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
