import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, FileText, CreditCard, Truck, ShoppingBag, ArrowRight, Clock,
  CheckCircle2, PackageCheck, AlertCircle, Phone, Store, ChevronRight, Boxes
} from "lucide-react";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";

interface DealerDashboardProps {
  params: Promise<{ sellerSlug: string }>;
}

function getOrderWorkflowStage(status: string): { stepIndex: number; label: string } {
  if (["SHIPPED", "IN_TRANSIT", "PARTIALLY_DELIVERED", "DELIVERED", "COMPLETED"].includes(status)) {
    return { stepIndex: 3, label: "Dispatched" };
  }
  if (["PACKED", "PACKED_AND_LABELLED"].includes(status)) {
    return { stepIndex: 2, label: "Packed" };
  }
  if ([
    "READY_FOR_WAREHOUSE", "PICK_LIST_GENERATED", "PICKING_IN_PROGRESS",
    "PARTIALLY_PICKED", "PICKING_COMPLETED", "PACKING_IN_PROGRESS", "FINAL_INVOICE_ISSUED"
  ].includes(status)) {
    return { stepIndex: 1, label: "Under Packing" };
  }
  return { stepIndex: 0, label: "Order Placed" };
}

const STEPPER_STAGES = [
  { key: "placed", label: "Order Placed" },
  { key: "packing", label: "Under Packing" },
  { key: "packed", label: "Packed" },
  { key: "dispatched", label: "Dispatched" },
];

export default async function DealerDashboardPage({ params }: DealerDashboardProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  // Find dealer profile for logged in user
  const membership = await prisma.userSellerMembership.findFirst({
    where: { userId: ctx.userId, sellerId: ctx.sellerId },
    include: {
      dealer: {
        include: {
          creditProfile: true,
          addresses: { where: { isDefault: true }, take: 1 },
          dealerGroup: true,
          pricingGroup: true,
        },
      },
    },
  });

  const dealer = membership?.dealer || (ctx.dealerId ? await prisma.dealer.findUnique({
    where: { id: ctx.dealerId },
    include: {
      creditProfile: true,
      addresses: { where: { isDefault: true }, take: 1 },
      dealerGroup: true,
      pricingGroup: true,
    },
  }) : null);

  const dealerId = dealer?.id || ctx.dealerId;

  const [activeOrdersCount, proformaCount, recentOrders, inFlightOrders] = await Promise.all([
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
    prisma.order.findMany({
      where: {
        sellerId: ctx.sellerId,
        dealerId: dealerId || "NONE",
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        shipments: {
          include: {
            transportCompany: true,
            vehicle: true,
            packages: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const creditLimit = Number(dealer?.creditProfile?.creditLimit || 1500000);
  const availableCredit = Number(dealer?.creditProfile?.availableCredit || 1500000);
  const currentOutstanding = Number(dealer?.creditProfile?.currentOutstanding || 0);

  const creditUsedPercent = creditLimit > 0
    ? Math.min(100, Math.max(0, Math.round((currentOutstanding / creditLimit) * 100)))
    : 0;
  const creditAvailPercent = creditLimit > 0
    ? Math.min(100, Math.max(0, 100 - creditUsedPercent))
    : 100;

  const primaryAddress = dealer?.addresses?.[0];
  const dealerCity = primaryAddress?.city || "Nepalgunj";
  const dealerProvince = primaryAddress?.province || "Lumbini";

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-3.5 sm:p-6 md:p-8">
      {/* Top Header Card: Distributor Hub (Matches Mobile Reference) */}
      <div className="rounded-2xl bg-gradient-to-r from-[#07254a] via-[#093264] to-[#0a3d7c] p-4 sm:p-6 text-white shadow-md">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-blue-200">
            Distributor Hub
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-white shadow-xs">
            {dealer?.pricingGroup?.name || dealer?.dealerGroup?.name || "TIER A"} • CREDIT: {formatCurrency(availableCredit)}
          </span>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight text-white">
              {dealer?.tradingName || dealer?.legalName || ctx.sellerName}
            </h1>
            <p className="mt-0.5 text-xs text-blue-200/80">
              {dealerCity}, {dealerProvince}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold text-blue-100">
              ID: {dealer?.code || "DLR-001"}
            </span>
          </div>
        </div>
      </div>

      {/* KPI 4-Card Grid (Matches Mobile Reference 2x2 on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Outstanding Dues */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Outstanding Dues
          </div>
          <div className="mt-1.5 text-lg sm:text-xl font-black text-slate-900 tabular-nums">
            {formatCurrency(currentOutstanding)}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            {currentOutstanding > 0 ? "30-day payment term" : "Zero dues pending"}
          </div>
        </div>

        {/* Card 2: Available Credit with Progress Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Available Credit
          </div>
          <div className="mt-1.5 text-lg sm:text-xl font-black text-emerald-700 tabular-nums">
            {formatCurrency(availableCredit)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            (Total Limit: {formatCurrency(creditLimit)})
          </div>
          {/* Progress Bar (Utilized vs Available) */}
          <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              style={{ width: `${creditUsedPercent}%` }}
              className="bg-[#0b2d55] transition-all"
              title={`Used: ${creditUsedPercent}%`}
            />
            <div
              style={{ width: `${creditAvailPercent}%` }}
              className="bg-emerald-500 transition-all"
              title={`Available: ${creditAvailPercent}%`}
            />
          </div>
        </div>

        {/* Card 3: Active Orders */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Active In-Flight Orders
          </div>
          <div className="mt-1.5 text-lg sm:text-xl font-black text-[#0b2d55] tabular-nums">
            {activeOrdersCount}
          </div>
          <div className="mt-1 text-[11px] font-medium text-blue-600">
            In processing workflow
          </div>
        </div>

        {/* Card 4: Proforma Invoices */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Proforma Invoices
          </div>
          <div className="mt-1.5 text-lg sm:text-xl font-black text-indigo-950 tabular-nums">
            {proformaCount}
          </div>
          <div className="mt-1 text-[11px] font-medium text-indigo-600">
            Confirmed &amp; Ready
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid (Matches Reference 6-Button Mobile Grid) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* 1. Catalog */}
        <Link
          href="/dealer/products"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-center shadow-xs transition hover:border-slate-300 hover:bg-slate-50/80 active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-bold text-slate-800">Order Catalogue</span>
        </Link>

        {/* 2. Past Orders */}
        <Link
          href="/dealer/orders"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-center shadow-xs transition hover:border-slate-300 hover:bg-slate-50/80 active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
            <FileText className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-bold text-slate-800">Past Orders</span>
        </Link>

        {/* 3. Pay Outstandings (Highlighted action) */}
        <Link
          href="/dealer/invoices"
          className="flex flex-col items-center justify-center rounded-xl border-2 border-blue-200 bg-blue-50/80 p-3 sm:p-4 text-center shadow-xs transition hover:bg-blue-100/80 active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-200/70 text-blue-950">
            <CreditCard className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-black text-blue-950 uppercase tracking-tight">
            Pay Outstandings
          </span>
        </Link>

        {/* 4. Track Shipments */}
        <Link
          href="/dealer/shipments"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-center shadow-xs transition hover:border-slate-300 hover:bg-slate-50/80 active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
            <Truck className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-bold text-slate-800">Track Shipments</span>
        </Link>

        {/* 5. Direct Bulk Order */}
        <Link
          href="/dealer/orders/new"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-center shadow-xs transition hover:border-slate-300 hover:bg-slate-50/80 active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-bold text-slate-800">Direct Order</span>
        </Link>

        {/* 6. Help & Support */}
        <a
          href="tel:+9779858020000"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-center shadow-xs transition hover:border-slate-300 hover:bg-slate-50/80 active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
            <Phone className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-bold text-slate-800">Help &amp; Support</span>
        </a>
      </div>

      {/* ACTIVE SHIPMENTS & IN-FLIGHT TRACKING (Matches Reference Green-Circled Stepper) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Active Shipments &amp; In-Flight Orders ({inFlightOrders.length})
          </h2>
          <Link
            href="/dealer/shipments"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
          >
            View Shipments
          </Link>
        </div>

        {inFlightOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-2">
            <Truck className="h-8 w-8 mx-auto text-slate-300" />
            <div className="font-semibold text-slate-700">No active shipments in transit</div>
            <p className="text-slate-400">
              Place a new sales order from the catalogue to track live packing and dispatch.
            </p>
            <Link href="/dealer/products">
              <Button size="sm" className="mt-2 bg-[#0b2d55] text-white hover:bg-[#124177]">
                Order Catalogue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {inFlightOrders.map((order) => {
              const stage = getOrderWorkflowStage(order.status);
              const latestShipment = order.shipments?.[0];
              const carrierName = latestShipment?.transportCompany?.name || latestShipment?.transporter || "Logistics Express";
              const vehicleNum = latestShipment?.vehicle?.vehicleNumber || latestShipment?.vehicleNumber;

              return (
                <div key={order.id} className="py-4 first:pt-3 last:pb-1 space-y-3.5">
                  {/* Order Ref & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/dealer/orders/${order.id}`}
                      className="font-bold text-sm text-[#0b2d55] hover:text-blue-600 transition truncate"
                    >
                      Order #{order.orderNumber} • {formatCurrency(Number(order.grandTotal))}
                    </Link>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        ORDER_STATUS_COLORS[order.status] || "bg-blue-50 text-blue-800 border-blue-200"
                      }`}
                    >
                      {stage.label}
                    </Badge>
                  </div>

                  {/* Horizontal 4-Stage Stepper (Order Placed —— Under Packing —— Packed —— Dispatched) */}
                  <div className="relative py-2 px-1">
                    {/* Connecting Bar */}
                    <div className="absolute top-[18px] left-[10%] right-[10%] h-1 rounded-full bg-slate-200 -z-0">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${(stage.stepIndex / (STEPPER_STAGES.length - 1)) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Stepper Nodes */}
                    <div className="grid grid-cols-4 relative z-10 text-center">
                      {STEPPER_STAGES.map((s, idx) => {
                        const isDone = idx < stage.stepIndex;
                        const isCurrent = idx === stage.stepIndex;

                        return (
                          <div key={s.key} className="flex flex-col items-center">
                            {/* Circle Node */}
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                                isDone
                                  ? "bg-emerald-500 text-white shadow-xs"
                                  : isCurrent
                                    ? "border-2 border-emerald-600 bg-white ring-4 ring-emerald-100"
                                    : "bg-slate-200 text-transparent"
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : isCurrent ? (
                                <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                              ) : null}
                            </div>

                            {/* Label */}
                            <div
                              className={`mt-2 text-[10px] sm:text-[11px] leading-tight transition-colors ${
                                isCurrent
                                  ? "font-black text-slate-900"
                                  : isDone
                                    ? "font-semibold text-emerald-800"
                                    : "text-slate-400 font-medium"
                              }`}
                            >
                              {s.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Carrier and Vehicle Info Line */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <div>
                      <span className="font-semibold text-slate-700">Carrier:</span> {carrierName}
                      {vehicleNum && (
                        <span className="ml-2">
                          • <span className="font-semibold text-slate-700">Vehicle:</span> {vehicleNum}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/dealer/orders/${order.id}`}
                      className="font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition"
                    >
                      Track Details <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Credit Status Alert Banner (Matches Mobile Screenshot Notice) */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 sm:p-4 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="truncate text-amber-950 font-medium">
            <span className="font-bold">Available Credit:</span> {formatCurrency(availableCredit)} approved for fast order dispatch.
          </span>
        </div>
        <Link
          href="/dealer/invoices"
          className="shrink-0 font-bold uppercase tracking-wider text-amber-900 hover:underline text-[11px]"
        >
          View Invoices
        </Link>
      </div>

      {/* Recent Orders Directory */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
              Recent Orders Directory
            </CardTitle>
            <CardDescription className="text-xs">
              Live status from accounts review and warehouse fulfillment
            </CardDescription>
          </div>
          <Link href="/dealer/orders">
            <Button variant="ghost" size="sm" className="text-xs font-bold text-blue-600 hover:text-blue-800">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No orders placed yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentOrders.map((order) => {
                const isDraft = order.status === "DRAFT";
                return (
                  <Link
                    key={order.id}
                    href={`/dealer/orders/${order.id}`}
                    className="group p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {order.orderNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isDraft
                              ? "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                              : ORDER_STATUS_COLORS[order.status] || ""
                          }`}
                        >
                          {isDraft ? "Draft Order" : ORDER_STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {isDraft ? "Draft created on" : "Placed on"} {formatDate(order.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-slate-900 tabular-nums">
                          {formatCurrency(Number(order.grandTotal))}
                        </div>
                        <div className="text-[10px] text-slate-400">VAT Included</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
