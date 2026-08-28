import { prisma } from "@/lib/db";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, CheckCircle2, FileText, Warehouse, Truck, Clock, ShieldCheck,
  AlertTriangle, Receipt, CreditCard, ChevronRight, XCircle, Download, ExternalLink,
  PackageCheck, Printer, Tag, History, Edit3, UserCheck
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";
import { AdminOrderActions } from "./admin-order-actions";

interface OrderDetailsProps {
  params: Promise<{ sellerSlug: string; id: string }>;
}

export default async function AdminOrderDetailPage({ params }: OrderDetailsProps) {
  const { sellerSlug, id } = await params;
  const ctx = await getTenantContext(sellerSlug);

  const [rawOrder, warehouseStaff] = await Promise.all([
    prisma.order.findFirst({
      where: {
        sellerId: ctx.sellerId,
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
          include: { items: true, createdBy: { select: { name: true, email: true } } },
        },
        proformaInvoices: { orderBy: { createdAt: "desc" } },
        pickLists: {
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
            exceptions: true,
            assignedTo: { select: { id: true, name: true, email: true } },
          },
        },
        finalInvoices: { orderBy: { createdAt: "desc" }, include: { items: true } },
        packages: { orderBy: { packageNumber: "asc" } },
        shipments: {
          orderBy: { createdAt: "desc" },
          include: { transportCompany: true, driver: true, vehicle: true, packages: true },
        },
        payments: { orderBy: { createdAt: "desc" } },
        creditApprovals: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.userRole.findMany({
      where: {
        sellerId: ctx.sellerId,
        role: { code: { in: ["WAREHOUSE_USER", "WAREHOUSE_PICKER", "WAREHOUSE_MANAGER", "PACKING_USER"] } },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  if (!rawOrder) notFound();

  // Role-Based Authorization Checks
  const isPrivileged = hasRole(ctx, "SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF");
  const isAccounts = isPrivileged || hasRole(ctx, "ACCOUNTANT", "ACCOUNTS_MANAGER", "FINANCE") || hasPermission(ctx, "order.revise") || hasPermission(ctx, "invoice.generate");
  const isWarehouse = isPrivileged || hasRole(ctx, "WAREHOUSE_MANAGER", "WAREHOUSE_USER", "WAREHOUSE_PICKER") || hasPermission(ctx, "picklist.complete");
  const isDispatch = isPrivileged || hasRole(ctx, "DISPATCH_USER", "LOGISTICS_MANAGER") || hasPermission(ctx, "shipment.dispatch");
  const isSales = isPrivileged || hasRole(ctx, "SALES_REP", "SALES_MANAGER") || hasPermission(ctx, "order.submit");

  // Handle standard step progression Server Action
  async function advanceWorkflowAction(formData: FormData) {
    "use server";
    const rawTarget = formData.get("nextStatus");
    const assignedWarehouseUserId = formData.get("assignedWarehouseUserId");
    if (typeof rawTarget !== "string" || !Object.values(OrderStatus).includes(rawTarget as OrderStatus)) return;
    const actionContext = await getTenantContext(sellerSlug);
    try {
      await executeOrderWorkflowAction({
        sellerId: actionContext.sellerId,
        orderId: rawOrder!.id,
        targetStatus: rawTarget as OrderStatus,
        assignedWarehouseUserId: typeof assignedWarehouseUserId === "string" && assignedWarehouseUserId ? assignedWarehouseUserId : undefined,
        actor: { userId: actionContext.userId, permissions: actionContext.permissions, roles: actionContext.roles },
        reason: "Workflow action from operations portal",
      });
    } catch (err: any) {
      console.warn("Advance workflow action failed:", err?.message);
    }
    redirect(`/s/${sellerSlug}/admin/orders/${rawOrder!.id}`);
  }

  // Convert raw Prisma objects with Decimal / complex types into pure serializable JSON primitives
  const order = {
    id: rawOrder.id,
    orderNumber: rawOrder.orderNumber,
    source: rawOrder.source,
    status: rawOrder.status,
    currencyCode: rawOrder.currencyCode,
    subtotal: Number(rawOrder.subtotal),
    discountTotal: Number(rawOrder.discountTotal),
    taxTotal: Number(rawOrder.taxTotal),
    freightTotal: Number(rawOrder.freightTotal),
    grandTotal: Number(rawOrder.grandTotal),
    dealerNotes: rawOrder.dealerNotes,
    accountsNotes: rawOrder.accountsNotes,
    salespersonNotes: rawOrder.salespersonNotes,
    createdAt: rawOrder.createdAt,
    updatedAt: rawOrder.updatedAt,
    purchaseOrderNumber: rawOrder.purchaseOrderNumber,
    dealer: {
      id: rawOrder.dealer.id,
      code: rawOrder.dealer.code,
      legalName: rawOrder.dealer.legalName,
      tradingName: rawOrder.dealer.tradingName,
      taxNumber: rawOrder.dealer.taxNumber,
      contactName: rawOrder.dealer.contactName,
      phone: rawOrder.dealer.phone,
      email: rawOrder.dealer.email,
      creditProfile: rawOrder.dealer.creditProfile
        ? {
            creditLimit: Number(rawOrder.dealer.creditProfile.creditLimit),
            availableCredit: Number(rawOrder.dealer.creditProfile.availableCredit),
            creditPeriodDays: rawOrder.dealer.creditProfile.creditPeriodDays,
          }
        : null,
    },
    items: rawOrder.items.map((it) => ({
      id: it.id,
      sku: it.sku,
      productName: it.productName,
      variantName: it.variantName,
      status: it.status,
      originalQuantity: Number(it.originalQuantity),
      approvedQuantity: it.approvedQuantity !== null ? Number(it.approvedQuantity) : null,
      pickedQuantity: it.pickedQuantity !== null ? Number(it.pickedQuantity) : null,
      dealerPrice: Number(it.dealerPrice),
      discountAmount: it.discountAmount !== null ? Number(it.discountAmount) : null,
      taxAmount: Number(it.taxAmount),
      lineTotal: Number(it.lineTotal),
      accountsRemarks: it.accountsRemarks,
      product: it.product
        ? {
            name: it.product.name,
            sku: it.product.sku,
            unitCode: it.product.unitCode || "PCS",
          }
        : null,
    })),
    revisions: rawOrder.revisions.map((rev) => ({
      id: rev.id,
      version: rev.version,
      status: rev.status,
      generalRemarks: rev.generalRemarks,
      createdAt: rev.createdAt,
      items: rev.items.map((ri) => ({
        id: ri.id,
        orderItemId: ri.orderItemId,
        changeType: ri.changeType,
        previousQuantity: Number(ri.previousQuantity),
        revisedQuantity: Number(ri.revisedQuantity),
      })),
    })),
    proformaInvoices: rawOrder.proformaInvoices.map((pi) => ({
      id: pi.id,
      proformaNumber: pi.proformaNumber,
      status: pi.status,
      subtotal: Number(pi.subtotal),
      taxTotal: Number(pi.taxTotal),
      grandTotal: Number(pi.grandTotal),
      issueDate: pi.issueDate,
    })),
    pickLists: rawOrder.pickLists.map((pl) => ({
      id: pl.id,
      pickListNumber: pl.pickListNumber,
      status: pl.status,
      assignedTo: pl.assignedTo ? { id: pl.assignedTo.id, name: pl.assignedTo.name, email: pl.assignedTo.email } : null,
      createdAt: pl.createdAt,
      items: pl.items.map((pi) => ({
        id: pi.id,
        sku: pi.sku,
        rackLocation: pi.rackLocation,
        binLocation: pi.binLocation,
        approvedQuantity: Number(pi.approvedQuantity),
        pickedQuantity: Number(pi.pickedQuantity),
      })),
    })),
    finalInvoices: rawOrder.finalInvoices.map((fi) => ({
      id: fi.id,
      invoiceNumber: fi.invoiceNumber,
      status: fi.status,
      issueDate: fi.issueDate,
      subtotal: Number(fi.subtotal),
      taxTotal: Number(fi.taxTotal),
      freightTotal: Number(fi.freightTotal),
      grandTotal: Number(fi.grandTotal),
    })),
    packages: rawOrder.packages.map((pkg) => ({
      id: pkg.id,
      packageNumber: pkg.packageNumber,
      packageType: pkg.packageType,
      weight: pkg.weight ? Number(pkg.weight) : 0,
      length: pkg.length ? Number(pkg.length) : null,
      width: pkg.width ? Number(pkg.width) : null,
      height: pkg.height ? Number(pkg.height) : null,
      status: pkg.status,
      barcodeData: pkg.barcodeData,
      handlingInstructions: pkg.handlingInstructions,
      createdAt: pkg.createdAt,
    })),
    shipments: rawOrder.shipments.map((shp) => ({
      id: shp.id,
      shipmentNumber: shp.shipmentNumber,
      challanNumber: shp.challanNumber,
      trackingNumber: shp.trackingNumber,
      status: shp.status,
      transporter: shp.transporter,
      driverName: shp.driverName,
      driverPhone: shp.driverPhone,
      vehicleNumber: shp.vehicleNumber,
      totalCartons: shp.totalCartons,
      totalWeight: shp.totalWeight ? Number(shp.totalWeight) : null,
      createdAt: shp.createdAt,
    })),
    payments: rawOrder.payments.map((pmt) => ({
      id: pmt.id,
      paymentNumber: pmt.paymentNumber,
      method: pmt.method,
      status: pmt.status,
      amount: Number(pmt.amount),
      transactionRef: pmt.transactionRef,
      remarks: pmt.remarks,
      createdAt: pmt.createdAt,
    })),
    creditApprovals: rawOrder.creditApprovals.map((ca) => ({
      id: ca.id,
      status: ca.status,
      approvedAmount: Number(ca.approvedAmount),
      createdAt: ca.createdAt,
    })),
    statusHistory: rawOrder.statusHistory.map((sh) => ({
      id: sh.id,
      fromStatus: sh.fromStatus,
      toStatus: sh.toStatus,
      remarks: sh.remarks,
      createdAt: sh.createdAt,
    })),
  };

  const proforma = order.proformaInvoices[0];
  const pickList = order.pickLists[0];
  const finalInvoice = order.finalInvoices[0];

  const isPaymentConfirmed =
    order.payments.some((p) => p.status === "CONFIRMED") ||
    order.creditApprovals.some((ca) => ca.status === "APPROVED") ||
    [
      "PROFORMA_INVOICE_CONFIRMED",
      "READY_FOR_WAREHOUSE",
      "PICK_LIST_GENERATED",
      "PICKING_IN_PROGRESS",
      "PARTIALLY_PICKED",
      "PICKING_COMPLETED",
      "PICK_LIST_COMPLETED",
      "FINAL_INVOICE_ISSUED",
      "PACKING_IN_PROGRESS",
      "PACKED",
      "PACKED_AND_LABELLED",
      "SHIPPED",
      "IN_TRANSIT",
      "PARTIALLY_DELIVERED",
      "DELIVERED",
      "COMPLETED",
    ].includes(order.status);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7 p-4 md:p-7">
      {/* Navigation */}
      <div className="space-y-4">
        <Link
          href="/admin/orders"
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Orders Directory
        </Link>

        {/* Order Header & Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-xl border shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-[#0b2d55]">{order.orderNumber}</h1>
              <Badge variant="outline" className={`text-xs ${ORDER_STATUS_COLORS[order.status] || ""}`}>
                {ORDER_STATUS_LABELS[order.status] || order.status}
              </Badge>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Created on {formatDate(order.createdAt)} • Source: {order.source} • Dealer: {order.dealer.tradingName || order.dealer.legalName}
            </div>
          </div>

          {/* Interactive Actions (Modify / Revise / Confirm Payment / Role-based Workflow Buttons) */}
          <div className="flex flex-wrap items-center gap-2">
            <AdminOrderActions
              order={{
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                grandTotal: order.grandTotal,
                dealer: {
                  tradingName: order.dealer.tradingName,
                  legalName: order.dealer.legalName,
                  code: order.dealer.code,
                  creditProfile: order.dealer.creditProfile
                    ? {
                        availableCredit: order.dealer.creditProfile.availableCredit,
                      }
                    : null,
                },
                items: order.items.map((it) => ({
                  id: it.id,
                  sku: it.sku,
                  productName: it.productName,
                  product: it.product,
                  originalQuantity: it.originalQuantity,
                  approvedQuantity: it.approvedQuantity,
                  dealerPrice: it.dealerPrice,
                  discountAmount: it.discountAmount,
                  accountsRemarks: it.accountsRemarks,
                })),
              }}
              sellerSlug={sellerSlug}
              userRoles={ctx.roles}
              userPermissions={ctx.permissions}
            />

            {/* DRAFT -> Submit for Accounts Review */}
            {order.status === "DRAFT" && (isSales || isPrivileged) && (
              <form action={advanceWorkflowAction}>
                <input type="hidden" name="nextStatus" value="PENDING_ACCOUNTS_REVIEW" />
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">Submit for Accounts Review</Button>
              </form>
            )}

            {/* PENDING_ACCOUNTS_REVIEW -> Send to Dealer Confirmation */}
            {order.status === "PENDING_ACCOUNTS_REVIEW" && (isAccounts || isPrivileged) && (
              <form action={advanceWorkflowAction}>
                <input type="hidden" name="nextStatus" value="WAITING_FOR_DEALER_CONFIRMATION" />
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Send to Dealer Confirmation</Button>
              </form>
            )}

            {/* WAITING_FOR_DEALER_CONFIRMATION -> Confirm Final Order */}
            {order.status === "WAITING_FOR_DEALER_CONFIRMATION" && (isAccounts || isSales || isPrivileged) && (
              <form action={advanceWorkflowAction}>
                <input type="hidden" name="nextStatus" value="FINAL_ORDER_CONFIRMED" />
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirm Final Order</Button>
              </form>
            )}

            {/* FINAL_ORDER_CONFIRMED -> Generate Proforma */}
            {order.status === "FINAL_ORDER_CONFIRMED" && (isAccounts || isPrivileged) && (
              <form action={advanceWorkflowAction}>
                <input type="hidden" name="nextStatus" value="PROFORMA_INVOICE_GENERATED" />
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Generate Proforma Invoice</Button>
              </form>
            )}

            {/* PROFORMA_INVOICE_GENERATED -> When Payment is Pending, show warning / indicator */}
            {order.status === "PROFORMA_INVOICE_GENERATED" && !isPaymentConfirmed && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                <CreditCard className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Awaiting Payment / Credit Confirmation</span>
              </div>
            )}

            {/* PROFORMA_INVOICE_CONFIRMED -> Send to Warehouse & Select Assigned Warehouse User (Only after payment is confirmed) */}
            {(order.status === "PROFORMA_INVOICE_CONFIRMED" || (order.status === "PROFORMA_INVOICE_GENERATED" && isPaymentConfirmed)) && (isAccounts || isPrivileged) && (
              <form action={advanceWorkflowAction} className="flex items-center gap-1.5">
                <input type="hidden" name="nextStatus" value="READY_FOR_WAREHOUSE" />
                {warehouseStaff.length > 0 && (
                  <select
                    name="assignedWarehouseUserId"
                    defaultValue=""
                    className="h-8 text-xs border rounded-lg px-2 bg-purple-50 text-purple-950 font-semibold border-purple-300"
                  >
                    <option value="">Assign Warehouse User...</option>
                    {warehouseStaff.map((ws) => (
                      <option key={ws.user.id} value={ws.user.id}>
                        {ws.user.name || ws.user.email} (Warehouse)
                      </option>
                    ))}
                  </select>
                )}
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                  Release & Send to Warehouse
                </Button>
              </form>
            )}

            {/* READY_FOR_WAREHOUSE -> Complete Pick List */}
            {order.status === "READY_FOR_WAREHOUSE" && (isWarehouse || isPrivileged) && (
              <form action={advanceWorkflowAction}>
                <input type="hidden" name="nextStatus" value="PICK_LIST_COMPLETED" />
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold">Complete Pick List</Button>
              </form>
            )}

            {/* PICK_LIST_COMPLETED -> Issue Final Tax Invoice */}
            {order.status === "PICK_LIST_COMPLETED" && (isAccounts || isPrivileged) && (
              <form action={advanceWorkflowAction}>
                <input type="hidden" name="nextStatus" value="FINAL_INVOICE_ISSUED" />
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold">Issue Final Tax Invoice</Button>
              </form>
            )}

            {/* FINAL_INVOICE_ISSUED -> Dispatch Shipment */}
            {order.status === "FINAL_INVOICE_ISSUED" && (isDispatch || isPrivileged) && (
              <form action={advanceWorkflowAction}>
                <input type="hidden" name="nextStatus" value="SHIPPED" />
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">Dispatch Shipment</Button>
              </form>
            )}

            {/* SHIPPED -> Mark Order Delivered */}
            {order.status === "SHIPPED" && (isDispatch || isPrivileged) && (
              <form action={advanceWorkflowAction}>
                <input type="hidden" name="nextStatus" value="COMPLETED" />
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Mark Order Delivered</Button>
              </form>
            )}
          </div>
        </div>

        {/* Commercial Document Download Toolbar */}
        <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Printable Commercial Documents</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sales Order */}
            <a
              href={`/api/orders/${order.id}/documents/sales-order`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <FileText className="h-3.5 w-3.5" /> Sales Order
            </a>

            {/* Proforma Invoice: Only active if Proforma exists */}
            {proforma ? (
              <a
                href={`/api/orders/${order.id}/documents/proforma`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-900/90 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 transition"
              >
                <FileText className="h-3.5 w-3.5" /> Proforma (PI)
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed">
                <FileText className="h-3.5 w-3.5" /> Proforma (Pending)
              </span>
            )}

            {/* Pick List: Only active after payment confirmed AND picklist exists */}
            {isPaymentConfirmed && pickList ? (
              <a
                href={`/api/orders/${order.id}/documents/pick-list`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-900/90 hover:bg-teal-800 text-teal-200 border border-teal-700 transition"
              >
                <Warehouse className="h-3.5 w-3.5" /> Pick List
              </a>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed"
                title={!isPaymentConfirmed ? "Available after payment confirmation" : "Pick list pending warehouse release"}
              >
                <Warehouse className="h-3.5 w-3.5" /> Pick List {!isPaymentConfirmed ? "(Locked - Payment Required)" : "(Pending)"}
              </span>
            )}

            {/* VAT Tax Invoice: Only active if Final Invoice exists */}
            {finalInvoice ? (
              <a
                href={`/api/orders/${order.id}/documents/final-invoice`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-900/90 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 transition"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> VAT Tax Invoice
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed">
                <ShieldCheck className="h-3.5 w-3.5" /> Tax Invoice (Pending)
              </span>
            )}

            {/* Dedicated Packaging List (Carton Manifest): Only active after payment confirmed AND released to warehouse */}
            {isPaymentConfirmed && (order.packages.length > 0 || ![
              "DRAFT",
              "PENDING_ACCOUNTS_REVIEW",
              "ACCOUNTS_REVIEW_IN_PROGRESS",
              "WAITING_FOR_DEALER_CONFIRMATION",
              "DEALER_CHANGE_REQUESTED",
              "FINAL_ORDER_CONFIRMED",
              "PROFORMA_INVOICE_GENERATED",
              "PROFORMA_INVOICE_CONFIRMED",
            ].includes(order.status)) ? (
              <a
                href={`/api/orders/${order.id}/documents/packing-list`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 transition"
              >
                <PackageCheck className="h-3.5 w-3.5" /> Packaging List ({order.packages.length > 0 ? order.packages.length : "Auto"})
              </a>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed"
                title={!isPaymentConfirmed ? "Available after payment confirmation and warehouse release" : "Packaging pending"}
              >
                <PackageCheck className="h-3.5 w-3.5" /> Packaging List {!isPaymentConfirmed ? "(Locked - Payment Required)" : "(Pending)"}
              </span>
            )}

            {/* Carton Labels: Only active after payment confirmed and packages packed */}
            {isPaymentConfirmed && order.packages.length > 0 ? (
              <a
                href={`/api/orders/${order.id}/documents/package-labels`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-900/90 hover:bg-amber-800 text-amber-200 border border-amber-700 transition"
              >
                <Tag className="h-3.5 w-3.5" /> Carton Labels ({order.packages.length})
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed">
                <Tag className="h-3.5 w-3.5" /> Labels {!isPaymentConfirmed ? "(Locked)" : "(Pending)"}
              </span>
            )}

            {/* Delivery Challan: Only active after payment confirmed and shipment created */}
            {isPaymentConfirmed && order.shipments.length > 0 ? (
              <a
                href={`/api/orders/${order.id}/documents/dispatch-challan`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-900/90 hover:bg-blue-800 text-blue-200 border border-blue-700 transition"
              >
                <Truck className="h-3.5 w-3.5" /> Delivery Challan
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed">
                <Truck className="h-3.5 w-3.5" /> Challan {!isPaymentConfirmed ? "(Locked)" : "(Pending)"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Order Items & Sub-documents */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="items">
            <TabsList className="bg-white border rounded-xl p-1 shadow-xs">
              <TabsTrigger value="items">Order Items ({order.items.length})</TabsTrigger>
              <TabsTrigger value="revisions">Revisions ({order.revisions.length})</TabsTrigger>
              <TabsTrigger value="proforma">Proforma Invoice</TabsTrigger>
              <TabsTrigger value="picklist">Pick List</TabsTrigger>
              <TabsTrigger value="invoice">Final Tax Invoice</TabsTrigger>
              <TabsTrigger value="logistics">Cartons & Packaging ({order.packages.length})</TabsTrigger>
            </TabsList>

            {/* Items Tab */}
            <TabsContent value="items" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold">
                        <tr>
                          <th className="px-4 py-3">Product SKU & Name</th>
                          <th className="px-4 py-3 text-right">Requested</th>
                          <th className="px-4 py-3 text-right">Approved</th>
                          <th className="px-4 py-3 text-right">Dealer Price</th>
                          <th className="px-4 py-3 text-right">Line Total</th>
                          <th className="px-4 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-700">
                        {order.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              <div>{item.productName}</div>
                              <div className="text-[10px] text-slate-400">SKU: {item.sku}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-500">{item.originalQuantity}</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-700">
                              {item.approvedQuantity ?? item.originalQuantity} {item.product?.unitCode || "PCS"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(item.dealerPrice)}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(item.lineTotal)}</td>
                            <td className="px-4 py-3 text-slate-500 text-[11px]">
                              {item.accountsRemarks || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Order Totals Summary */}
                  <div className="p-6 bg-slate-50 border-t space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>VAT Tax (13%)</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(order.taxTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Freight & Logistics</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(order.freightTotal)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t">
                      <span>Grand Total</span>
                      <span>{formatCurrency(order.grandTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Revisions Tab */}
            <TabsContent value="revisions" className="mt-4">
              <Card>
                <CardContent className="p-6 space-y-4 text-xs">
                  {order.revisions.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      No accountant revisions created yet for this order.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {order.revisions.map((rev) => (
                        <div key={rev.id} className="p-4 border rounded-xl bg-slate-50/60 space-y-3">
                          <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-2">
                              <History className="h-4 w-4 text-amber-600" />
                              <span className="font-bold text-slate-900">Revision #{rev.version}</span>
                              <span className="text-slate-400">• {formatDateTime(rev.createdAt)}</span>
                            </div>
                            <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300">
                              {rev.status}
                            </Badge>
                          </div>
                          {rev.generalRemarks && (
                            <div className="text-slate-700">
                              <span className="font-semibold">Remarks:</span> {rev.generalRemarks}
                            </div>
                          )}
                          <div className="divide-y border rounded-lg bg-white overflow-hidden">
                            {rev.items.map((item) => (
                              <div key={item.id} className="p-2.5 flex justify-between items-center text-[11px]">
                                <div>
                                  <span className="font-bold text-slate-800">Item #{item.orderItemId.slice(-6)}</span>
                                  <span className="text-slate-500 ml-2">({item.changeType})</span>
                                </div>
                                <div className="space-x-3">
                                  <span className="text-slate-400 line-through">Prev: {item.previousQuantity}</span>
                                  <span className="font-bold text-emerald-700">Rev: {item.revisedQuantity}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Proforma Tab */}
            <TabsContent value="proforma" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {proforma ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div>
                          <div className="font-bold text-base text-slate-900">{proforma.proformaNumber}</div>
                          <div className="text-slate-500">Issued on {formatDate(proforma.issueDate)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-indigo-200">
                            {proforma.status}
                          </Badge>
                          <a
                            href={`/api/orders/${order.id}/documents/proforma`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white"
                          >
                            <Download className="h-3.5 w-3.5" /> Download Proforma (PDF)
                          </a>
                        </div>
                      </div>
                      <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1">
                        <div className="font-bold text-indigo-950 text-sm">Proforma Amount: {formatCurrency(proforma.grandTotal)}</div>
                        <p className="text-[11px] text-slate-600">Includes 13% VAT estimation and approved commercial pricing.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                      <FileText className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                      <div className="font-semibold text-slate-700">Proforma Invoice Pending</div>
                      <p className="text-[11px] text-slate-400">
                        Proforma Invoice will be generated and issued by Accounts once the order is confirmed.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* PickList Tab */}
            <TabsContent value="picklist" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {!isPaymentConfirmed ? (
                    <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                      <CreditCard className="h-8 w-8 mx-auto text-amber-500 mb-1" />
                      <div className="font-bold text-sm text-slate-800">Awaiting Payment Confirmation</div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Pick list generation and warehouse operations are locked until payment or dealer credit is confirmed by accounts.
                      </p>
                    </div>
                  ) : pickList ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div>
                          <div className="font-bold text-base text-slate-900">{pickList.pickListNumber}</div>
                          <div className="text-slate-500">
                            Created on {formatDateTime(pickList.createdAt)}
                            {pickList.assignedTo && ` • Assigned to: ${pickList.assignedTo.name || pickList.assignedTo.email}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-teal-700 bg-teal-50 border-teal-200">{pickList.status}</Badge>
                          <a
                            href={`/api/orders/${order.id}/documents/pick-list`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white"
                          >
                            <Printer className="h-3.5 w-3.5" /> Print Pick List (PDF)
                          </a>
                        </div>
                      </div>
                      <div className="divide-y border rounded-lg overflow-hidden">
                        {pickList.items.map((pi) => (
                          <div key={pi.id} className="p-3 flex justify-between">
                            <div>
                              <span className="font-bold text-slate-900">{pi.sku}</span>
                              <span className="text-slate-500 ml-2">(Loc: {pi.rackLocation || "R-01"} / {pi.binLocation || "B-01"})</span>
                            </div>
                            <span className="font-semibold text-teal-800">{pi.pickedQuantity} / {pi.approvedQuantity} units picked</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                      <Warehouse className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                      <div className="font-semibold text-slate-700">Pick List Pending</div>
                      <p className="text-[11px] text-slate-400">
                        Pick list will be generated upon releasing order to the warehouse.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Final Invoice Tab */}
            <TabsContent value="invoice" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {finalInvoice ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div>
                          <div className="font-bold text-base text-slate-900">{finalInvoice.invoiceNumber}</div>
                          <div className="text-slate-500">VAT Tax Invoice issued on {formatDate(finalInvoice.issueDate)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-cyan-700 bg-cyan-50 border-cyan-200">{finalInvoice.status}</Badge>
                          <a
                            href={`/api/orders/${order.id}/documents/final-invoice`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white"
                          >
                            <Download className="h-3.5 w-3.5" /> Download Tax Invoice (PDF)
                          </a>
                        </div>
                      </div>
                      <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg text-cyan-900 space-y-1">
                        <div className="font-bold text-sm">Final Tax Invoice Amount: {formatCurrency(finalInvoice.grandTotal)}</div>
                        <div className="text-[11px] text-cyan-700">Subtotal: {formatCurrency(finalInvoice.subtotal)} • 13% VAT: {formatCurrency(finalInvoice.taxTotal)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                      <ShieldCheck className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                      <div className="font-semibold text-slate-700">Final Tax Invoice Pending</div>
                      <p className="text-[11px] text-slate-400">
                        Final Tax Invoice will be issued post warehouse picking completion.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logistics & Packaging Tab */}
            <TabsContent value="logistics" className="mt-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  {!isPaymentConfirmed ? (
                    <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                      <CreditCard className="h-8 w-8 mx-auto text-amber-500 mb-1" />
                      <div className="font-bold text-sm text-slate-800">Packaging & Challan Locked</div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Packaging list, carton labels, and delivery challan will be generated after payment confirmation and warehouse release.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between border-b pb-3">
                        <div>
                          <div className="font-bold text-base text-slate-900">Carton Packages & Logistics Manifest</div>
                          <div className="text-xs text-slate-500">Total Packages: {order.packages.length} Cartons</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`/api/orders/${order.id}/documents/packing-list`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white"
                          >
                            <PackageCheck className="h-3.5 w-3.5" /> Print Packaging List
                          </a>
                          {order.packages.length > 0 && (
                            <a
                              href={`/api/orders/${order.id}/documents/package-labels`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <Tag className="h-3.5 w-3.5" /> Print Carton Labels (PDF)
                            </a>
                          )}
                          {order.shipments.length > 0 && (
                            <a
                              href={`/api/orders/${order.id}/documents/dispatch-challan`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Truck className="h-3.5 w-3.5" /> Print Challan (PDF)
                            </a>
                          )}
                        </div>
                      </div>

                      {order.packages.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          No packages packed yet. Generating packaging list will create default carton manifest.
                        </div>
                      ) : (
                        <div className="divide-y border rounded-lg overflow-hidden text-xs">
                          {order.packages.map((pkg, idx) => (
                            <div key={pkg.id} className="p-3 flex items-center justify-between">
                              <div>
                                <div className="font-bold text-slate-900">{pkg.packageNumber} (Box {idx + 1} of {order.packages.length})</div>
                                <div className="text-slate-500">
                                  Weight: {pkg.weight} KG • Type: {pkg.packageType}
                                  {pkg.length && ` • Dim: ${pkg.length}×${pkg.width}×${pkg.height} cm`}
                                </div>
                                {pkg.handlingInstructions && (
                                  <div className="text-[11px] text-amber-700 font-medium mt-0.5">{pkg.handlingInstructions}</div>
                                )}
                              </div>
                              <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                                {pkg.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Col: Dealer Info, Payment Details & Audit Trail */}
        <div className="space-y-6">
          {/* Dealer Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Dealer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <div className="font-bold text-slate-900">{order.dealer.tradingName || order.dealer.legalName}</div>
                <div className="text-slate-500">Code: {order.dealer.code}</div>
              </div>
              <div className="pt-2 border-t space-y-1">
                <div className="text-slate-500">Contact: {order.dealer.contactName}</div>
                <div className="text-slate-500">Phone: {order.dealer.phone || "N/A"}</div>
                <div className="text-slate-500">Email: {order.dealer.email || "N/A"}</div>
                <div className="text-slate-500">PAN / VAT: <span className="font-bold text-slate-900">{order.dealer.taxNumber || "N/A"}</span></div>
              </div>
              {order.dealer.creditProfile && (
                <div className="p-3 bg-slate-50 rounded-lg border space-y-1 pt-2">
                  <div className="font-semibold text-slate-900">Credit Profile</div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Credit Limit:</span>
                    <span className="font-bold">{formatCurrency(order.dealer.creditProfile.creditLimit)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Available:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(order.dealer.creditProfile.availableCredit)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment & Credit Records */}
          {(order.payments.length > 0 || order.creditApprovals.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" /> Payment & Credit Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {order.payments.map((pmt) => (
                  <div key={pmt.id} className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                    <div className="flex justify-between font-bold text-emerald-950">
                      <span>{pmt.method} ({pmt.paymentNumber})</span>
                      <span>{formatCurrency(pmt.amount)}</span>
                    </div>
                    <div className="text-[11px] text-emerald-800 mt-0.5">Ref: {pmt.transactionRef || "N/A"}</div>
                    {pmt.remarks && <div className="text-[10px] text-slate-500 mt-1">{pmt.remarks}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Workflow Audit Trail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Audit & Status Log</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4 text-xs">
                {order.statusHistory.map((hist, i) => (
                  <div key={hist.id} className="flex gap-3 relative">
                    {i < order.statusHistory.length - 1 && (
                      <div className="absolute left-2.5 top-6 bottom-0 w-px bg-slate-200" />
                    )}
                    <div className="h-5 w-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 z-10">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{ORDER_STATUS_LABELS[hist.toStatus] || hist.toStatus}</div>
                      <div className="text-[10px] text-slate-400">{formatDateTime(hist.createdAt)}</div>
                      {hist.remarks && <div className="text-[11px] text-slate-600 mt-0.5">{hist.remarks}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
