import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { formatCurrency, formatDate, formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, ShieldCheck, Truck, ArrowLeft, Download, ExternalLink,
  CheckCircle2, Clock, PackageCheck, AlertCircle, Phone, MapPin, Receipt, History
} from "lucide-react";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";
import { DealerOrderActions } from "./dealer-order-actions";

interface DealerOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealerOrderPage({ params }: DealerOrderPageProps) {
  const ctx = await getTenantContext("bageshwari", "/dealer/login");
  if (!ctx.dealerId) redirect("/dealer/login");

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: {
      sellerId: ctx.sellerId,
      dealerId: ctx.dealerId,
      OR: [{ id }, { orderNumber: id }],
    },
    include: {
      dealer: {
        include: {
          creditProfile: true,
          addresses: { where: { isDefault: true }, take: 1 },
        },
      },
      items: {
        include: {
          product: { select: { name: true, sku: true, unitCode: true } },
          variant: { select: { mrp: true } },
        },
      },
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { items: true },
      },
      proformaInvoices: { orderBy: { createdAt: "desc" } },
      finalInvoices: { orderBy: { createdAt: "desc" } },
      shipments: {
        orderBy: { createdAt: "desc" },
        include: { transportCompany: true, driver: true, vehicle: true, packages: true },
      },
      payments: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  const proforma = order.proformaInvoices[0];
  const finalInvoice = order.finalInvoices[0];
  const shipment = order.shipments[0];
  const latestRevision = order.revisions[0];

  const workflowSteps = [
    { title: "Order Placed", done: true },
    { title: "Accounts Review", done: !["DRAFT", "PENDING_ACCOUNTS_REVIEW"].includes(order.status) },
    { title: "Payment & Proforma", done: !["DRAFT", "PENDING_ACCOUNTS_REVIEW", "WAITING_FOR_DEALER_CONFIRMATION"].includes(order.status) },
    { title: "Warehouse Picking", done: ["PICK_LIST_COMPLETED", "FINAL_INVOICE_ISSUED", "PAID", "PACKED", "PACKED_AND_LABELLED", "SHIPPED", "COMPLETED"].includes(order.status) },
    { title: "Final Invoice", done: ["FINAL_INVOICE_ISSUED", "PAID", "PACKED", "PACKED_AND_LABELLED", "SHIPPED", "COMPLETED"].includes(order.status) },
    { title: "Dispatched", done: ["SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED"].includes(order.status) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 md:p-8">
      {/* Back Button */}
      <div>
        <Link href="/dealer/orders" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-[#092f5c]">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to All Orders
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#092f5c]">{order.orderNumber}</h1>
            <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-bold ${ORDER_STATUS_COLORS[order.status] || ""}`}>
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Submitted on {formatDate(order.createdAt)} • Source: {order.source}
          </p>
        </div>

        {/* Quick PDF Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sales Order */}
          <a
            href={`/api/orders/${order.id}/documents/sales-order?download=1`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
          >
            <Download className="h-3.5 w-3.5" /> Sales Order PDF
          </a>

          {/* Proforma Invoice PDF */}
          {proforma ? (
            <a
              href={`/api/orders/${order.id}/documents/proforma`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 transition"
            >
              <FileText className="h-3.5 w-3.5" /> View Proforma (PDF)
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
              <FileText className="h-3.5 w-3.5" /> Proforma (Pending)
            </span>
          )}

          {/* Final Tax Invoice PDF */}
          {finalInvoice && (
            <a
              href={`/api/orders/${order.id}/documents/final-invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-cyan-300 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 transition"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Tax Invoice (PDF)
            </a>
          )}

          {/* Delivery Challan PDF */}
          {shipment && (
            <a
              href={`/api/orders/${order.id}/documents/dispatch-challan`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 transition"
            >
              <Truck className="h-3.5 w-3.5" /> Delivery Challan (PDF)
            </a>
          )}
        </div>
      </div>

      {/* Workflow Progress Tracker */}
      <div className="bg-white rounded-xl border p-6 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Order Pipeline Progression</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {workflowSteps.map((step, idx) => (
            <div
              key={step.title}
              className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                step.done
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 font-bold"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-slate-300 shrink-0" />
              )}
              <span className="text-xs">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dealer Confirmation & Payment Terms Widget */}
      <DealerOrderActions
        orderId={order.id}
        orderNumber={order.orderNumber}
        orderStatus={order.status}
        grandTotal={Number(order.grandTotal)}
        creditLimit={order.dealer?.creditProfile ? Number(order.dealer.creditProfile.creditLimit) : 500000}
        availableCredit={order.dealer?.creditProfile ? Number(order.dealer.creditProfile.availableCredit) : 500000}
        creditPeriodDays={order.dealer?.creditProfile?.creditPeriodDays || 30}
        proforma={proforma ? {
          id: proforma.id,
          proformaNumber: proforma.proformaNumber,
          grandTotal: Number(proforma.grandTotal),
          status: proforma.status,
        } : null}
        latestRevisionRemarks={latestRevision?.generalRemarks}
        hasSubmittedPayment={order.payments.length > 0}
      />

      {/* Main Grid: Left Items + Right Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Order Items & Revisions */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold">Ordered Products ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold">
                    <tr>
                      <th className="px-4 py-3">Product SKU & Name</th>
                      <th className="px-4 py-3 text-center">Quantity</th>
                      <th className="px-4 py-3 text-right">Dealer Rate</th>
                      <th className="px-4 py-3 text-right">Line Total</th>
                      <th className="px-4 py-3">Accountant Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          <div className="text-[10px] text-slate-400">SKU: {item.sku}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-blue-900">
                          {Number(item.approvedQuantity ?? item.originalQuantity)} {item.product?.unitCode || "Pcs."}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                          {formatCurrency(Number(item.dealerPrice))}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-900">
                          {formatCurrency(Number(item.lineTotal))}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                          {item.accountsRemarks || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Bill Breakdown & Shipping Address */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold">Billing Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>VAT (13%):</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Number(order.taxTotal))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Freight & Delivery:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Number(order.freightTotal))}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t">
                <span>Grand Total:</span>
                <span className="text-emerald-700">{formatCurrency(Number(order.grandTotal))}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold">Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2 text-slate-600">
              <div className="font-bold text-slate-900">{order.dealer?.tradingName || order.dealer?.legalName}</div>
              <div>{order.dealer?.addresses[0]?.addressLine1 || "Head Office Commercial Complex"}</div>
              <div>{order.dealer?.addresses[0]?.district || "Banke"}, {order.dealer?.addresses[0]?.province || "Lumbini"}</div>
              <div className="text-slate-500 pt-1">Contact: {order.dealer?.contactName} ({order.dealer?.phone || "N/A"})</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
