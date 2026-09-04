import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, FileText, CreditCard, Truck, ShoppingBag, ArrowRight, Clock, CheckCircle2
} from "lucide-react";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";

interface DealerDashboardProps {
  params: Promise<{ sellerSlug: string }>;
}

export default async function DealerDashboardPage({ params }: DealerDashboardProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  // Find dealer profile for logged in user
  const membership = await prisma.userSellerMembership.findFirst({
    where: { userId: ctx.userId, sellerId: ctx.sellerId },
    include: {
      dealer: {
        include: { creditProfile: true },
      },
    },
  });

  const dealer = membership?.dealer;

  const dealerId = dealer?.id || ctx.dealerId;

  const [activeOrdersCount, proformaCount, recentOrders] = await Promise.all([
    prisma.order.count({
      where: {
        sellerId: ctx.sellerId,
        dealerId: dealerId || "NONE",
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    }),
    prisma.proformaInvoice.count({
      where: {
        sellerId: ctx.sellerId,
        order: { dealerId: dealerId || "NONE" },
      },
    }),
    prisma.order.findMany({
      where: {
        sellerId: ctx.sellerId,
        dealerId: dealerId || "NONE",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const creditLimit = Number(dealer?.creditProfile?.creditLimit || 1500000);
  const availableCredit = Number(dealer?.creditProfile?.availableCredit || 1500000);
  const currentOutstanding = Number(dealer?.creditProfile?.currentOutstanding || 0);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7 p-4 md:p-7">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-kicker">Authorized dealer</div><h1 className="text-2xl font-black text-[#0b2d55]">Dealer Portal Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-900">{dealer?.tradingName || ctx.sellerName}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dealer/orders/new">
            <Button size="sm" className="bg-[#0b2d55] text-white hover:bg-[#124177] font-bold">
              <ShoppingCart className="h-4 w-4 mr-1.5 text-emerald-400" />
              Create Sales Order
            </Button>
          </Link>
          <Link href={`/s/${sellerSlug}/dealer/products`}>
            <Button size="sm" variant="outline" className="text-xs">
              <ShoppingBag className="h-4 w-4 mr-1.5" />
              Browse Products
            </Button>
          </Link>
        </div>
      </div>

      {/* Credit & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Available Credit Limit</div>
              <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-emerald-900">{formatCurrency(availableCredit)}</div>
            <div className="text-xs text-slate-500 mt-1">Total Limit: {formatCurrency(creditLimit)}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active In-Flight Orders</div>
              <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">{activeOrdersCount}</div>
            <div className="text-xs text-blue-600 mt-1 font-medium">In processing workflow</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proforma Invoices</div>
              <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">{proformaCount}</div>
            <div className="text-xs text-indigo-600 mt-1 font-medium">Confirmed & Ready</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Balance Due</div>
              <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(currentOutstanding)}</div>
            <div className="text-xs text-slate-500 mt-1">30-day payment term</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Directory */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">My Recent Orders</CardTitle>
            <CardDescription className="text-xs">Real-time status updates from accounts & warehouse</CardDescription>
          </div>
          <Link href={`/s/${sellerSlug}/dealer/products`}>
            <Button variant="outline" size="sm" className="text-xs">Order More</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <ShoppingCart className="h-10 w-10 mx-auto text-slate-300" />
              <div className="font-semibold text-base">No Orders Placed Yet</div>
              <p className="text-xs">Start browsing the product catalogue to place your first bulk order with dealer prices.</p>
              <Link href={`/s/${sellerSlug}/dealer/products`}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white mt-2">Browse Catalogue</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y text-xs">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{order.orderNumber}</span>
                      <Badge variant="outline" className={`text-[10px] ${ORDER_STATUS_COLORS[order.status] || ""}`}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </div>
                    <div className="text-slate-500">Placed on {formatDate(order.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{formatCurrency(Number(order.grandTotal))}</div>
                    <div className="text-[10px] text-slate-400">VAT Included</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
