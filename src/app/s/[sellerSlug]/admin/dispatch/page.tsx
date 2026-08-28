import { prisma } from "@/lib/db";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Truck,
  CheckCircle2,
  PackageCheck,
  MapPin,
  Printer,
  Download,
  Tag,
  FileText,
  ShieldCheck,
  Send,
  Building2,
  Phone,
  User,
} from "lucide-react";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { Pagination } from "@/components/ui/pagination";
import { nextDocumentNumber } from "@/services/number-sequence.service";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";

interface DispatchPageProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DispatchPortalPage({ params, searchParams }: DispatchPageProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  const isAuthorized =
    hasRole(
      ctx,
      "SUPER_ADMIN",
      "PLATFORM_ADMIN",
      "SELLER_OWNER",
      "ADMIN",
      "STAFF",
      "DISPATCH_USER",
      "LOGISTICS_MANAGER",
      "WAREHOUSE_MANAGER",
      "ACCOUNTANT",
      "ACCOUNTS_MANAGER",
      "SALES_MANAGER"
    ) ||
    hasPermission(ctx, "shipment.dispatch") ||
    hasPermission(ctx, "packing.manage");

  if (!isAuthorized) {
    redirect("/admin");
  }

  // Server Action: Confirm Dispatch with Carrier and Delivery Challan
  async function confirmDispatchAction(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext(sellerSlug);
    const orderId = String(formData.get("orderId") || "");
    const transporter = String(formData.get("transporter") || "").trim() || "Dedicated Carrier";
    const driverName = String(formData.get("driverName") || "");
    const driverPhone = String(formData.get("driverPhone") || "");
    const vehicleNumber = String(formData.get("vehicleNumber") || "");
    const totalCartons = parseInt(String(formData.get("totalCartons") || "1"), 10) || 1;
    const totalWeight = parseFloat(String(formData.get("totalWeight") || "0")) || null;

    if (!orderId) return;

    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, sellerId: actionCtx.sellerId },
          include: { packages: true },
        });
        if (!order) throw new Error("Order not found");

        const challanNumber = await nextDocumentNumber(tx, actionCtx.sellerId, "CHALLAN", "CHL");
        const shipmentNumber = await nextDocumentNumber(tx, actionCtx.sellerId, "SHIPMENT", "SHP");

        // Create shipment record
        await tx.shipment.create({
          data: {
            sellerId: actionCtx.sellerId,
            orderId: order.id,
            shipmentNumber,
            challanNumber,
            status: "DISPATCHED",
            transporter,
            driverName: driverName || undefined,
            driverPhone: driverPhone || undefined,
            vehicleNumber: vehicleNumber || undefined,
            totalCartons,
            totalWeight: totalWeight ? totalWeight : 0,
            dispatchDate: new Date(),
          },
        });
      });

      // Advance Order Workflow to SHIPPED
      await executeOrderWorkflowAction({
        sellerId: actionCtx.sellerId,
        orderId,
        targetStatus: "SHIPPED",
        actor: {
          userId: actionCtx.userId,
          permissions: actionCtx.permissions,
          roles: actionCtx.roles,
        },
        reason: `Dispatched via ${transporter}. Vehicle: ${vehicleNumber || "Standard Delivery"}.`,
      });
    } catch (err) {
      console.error("Confirm dispatch action failed:", err);
    }

    revalidatePath(`/s/${sellerSlug}/admin/dispatch`);
  }

  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const shippedOrdersWhere: any = {
    sellerId: ctx.sellerId,
    status: { in: ["SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED"] },
  };

  const [readyToDispatchOrders, shippedOrders, totalShipped, carriers] = await Promise.all([
    prisma.order.findMany({
      where: {
        sellerId: ctx.sellerId,
        status: { in: ["PACKED_AND_LABELLED", "PACKED", "PAID", "CREDIT_APPROVED", "FINAL_INVOICE_ISSUED"] },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        dealer: {
          select: {
            tradingName: true,
            legalName: true,
            phone: true,
            addresses: { where: { isDefault: true }, take: 1 },
          },
        },
        packages: true,
        items: { select: { id: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        sellerId: ctx.sellerId,
        status: { in: ["SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED"] },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        dealer: {
          select: {
            tradingName: true,
            legalName: true,
            addresses: { where: { isDefault: true }, take: 1 },
          },
        },
        packages: true,
        shipments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      skip: offset,
      take: limit,
    }),
    prisma.order.count({ where: shippedOrdersWhere }),
    prisma.transportCompany.findMany({
      where: { sellerId: ctx.sellerId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
  ]);

  const totalPages = Math.ceil(totalShipped / limit);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div>
        <div className="section-kicker">Logistics & Dispatch Operations</div>
        <h1 className="text-2xl font-black text-foreground">Dispatch, Delivery Challans & Carrier Tracking</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Carrier assignment, carton manifest verification, printable Delivery Challans, and dealer dispatch notifications.
        </p>
      </div>

      {/* 1. ORDERS READY FOR DISPATCH */}
      <div className="glass-card overflow-hidden border-l-4 border-l-blue-500">
        <div className="bg-muted/40 p-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" />
              Orders Ready for Transport & Delivery Challan ({readyToDispatchOrders.length})
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Final tax invoices and packaging manifests ready. Assign carrier to generate challan and notify dealer.
            </div>
          </div>
        </div>

        <div>
          {readyToDispatchOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No orders waiting for dispatch at this time.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {readyToDispatchOrders.map((ord) => {
                const addr = ord.dealer?.addresses?.[0];
                const dest = addr ? `${addr.city || ""}, ${addr.district || ""}`.replace(/^,\s*/, "") : "Direct Destination";
                const cartonCount = ord.packages.length || 1;

                return (
                  <div key={ord.id} className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-foreground">{ord.orderNumber}</span>
                        <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px]">{ord.status}</Badge>
                        <span className="text-xs text-muted-foreground">• {ord.items.length} items ({cartonCount} cartons)</span>
                      </div>
                      <div className="font-semibold text-xs text-foreground">
                        {ord.dealer.tradingName || ord.dealer.legalName}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" /> Destination: {dest}
                      </div>
                    </div>

                    <form action={confirmDispatchAction} className="flex flex-wrap items-center gap-2 bg-card p-2.5 rounded-xl border border-border">
                      <input type="hidden" name="orderId" value={ord.id} />
                      <input type="hidden" name="totalCartons" value={cartonCount} />

                      <div className="w-40">
                        <Input
                          name="transporter"
                          placeholder="Carrier / Transporter"
                          defaultValue={carriers[0]?.name || "Direct Logistics Carrier"}
                          className="h-8 text-xs bg-background text-foreground"
                          required
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          name="vehicleNumber"
                          placeholder="Vehicle No (e.g. BA 2 KHA 4910)"
                          className="h-8 text-xs font-mono bg-background text-foreground"
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          name="driverName"
                          placeholder="Driver Name"
                          className="h-8 text-xs bg-background text-foreground"
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          name="driverPhone"
                          placeholder="Driver Phone"
                          className="h-8 text-xs bg-background text-foreground"
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          name="totalWeight"
                          placeholder="Weight kg"
                          type="number"
                          step="0.1"
                          className="h-8 text-xs bg-background text-foreground"
                        />
                      </div>

                      <Button
                        type="submit"
                        size="sm"
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 shadow-xs"
                      >
                        <Send className="h-3 w-3 mr-1" /> Confirm Dispatch
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. DISPATCHED & IN-TRANSIT ORDERS */}
      <div className="glass-card overflow-hidden">
        <div className="bg-muted/40 p-4 border-b border-border flex items-center justify-between">
          <div className="text-sm font-bold text-foreground">
            Dispatched & In-Transit Orders ({shippedOrders.length})
          </div>
          <span className="text-xs text-muted-foreground font-normal">Active Carrier Manifests</span>
        </div>
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Order & Challan No</th>
                  <th className="px-4 py-3">Dealer</th>
                  <th className="px-4 py-3">Carrier / Vehicle</th>
                  <th className="px-4 py-3">Cartons</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Documents & Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {shippedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No dispatched orders yet.
                    </td>
                  </tr>
                ) : (
                  shippedOrders.map((o) => {
                    const addr = o.dealer?.addresses?.[0];
                    const destination = addr ? `${addr.city || ""}, ${addr.district || ""}`.replace(/^,\s*/, "") : "Direct Destination";
                    const shipment = o.shipments[0];

                    return (
                      <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold font-mono text-foreground">{o.orderNumber}</div>
                          {shipment?.challanNumber && (
                            <div className="text-[10px] text-blue-500 font-mono font-bold">
                              Challan: {shipment.challanNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-foreground">{o.dealer?.tradingName || o.dealer?.legalName}</div>
                          <div className="text-[10px] text-muted-foreground">{destination}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-foreground">{shipment?.transporter || "Carrier"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {shipment?.vehicleNumber ? `Veh: ${shipment.vehicleNumber}` : "—"}
                            {shipment?.driverPhone ? ` • ${shipment.driverPhone}` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {shipment?.totalCartons || o.packages?.length || 1} Carton(s)
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            className={`text-[10px] ${
                              o.status === "COMPLETED" || o.status === "DELIVERED"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            }`}
                          >
                            {o.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Tax Invoice */}
                            <a
                              href={`/api/orders/${o.id}/documents/tax-invoice`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-indigo-500 transition-colors shadow-2xs"
                              title="Tax Invoice"
                            >
                              <ShieldCheck className="h-3 w-3" /> Invoice
                            </a>

                            {/* 2. Packaging List */}
                            <a
                              href={`/api/orders/${o.id}/documents/packing-list`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-emerald-500 transition-colors shadow-2xs"
                              title="Packing List"
                            >
                              <PackageCheck className="h-3 w-3" /> Packing List
                            </a>

                            {/* 3. Carton Labels */}
                            <a
                              href={`/api/orders/${o.id}/documents/package-labels`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-amber-500 transition-colors shadow-2xs"
                              title="Carton Labels"
                            >
                              <Tag className="h-3 w-3" /> Labels
                            </a>

                            {/* 4. Delivery Challan */}
                            <a
                              href={`/api/orders/${o.id}/documents/dispatch-challan`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-blue-500 transition-colors shadow-2xs"
                              title="Delivery Challan"
                            >
                              <Truck className="h-3 w-3" /> Challan
                            </a>

                            <Link href={`/admin/orders/${o.id}`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                                View
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t border-border bg-muted/20">
              <Pagination totalPages={totalPages} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
