import { prisma } from "@/lib/db";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { nextDocumentNumber } from "@/services/number-sequence.service";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";

interface DispatchPageProps {
  params: Promise<{ sellerSlug: string }>;
}

export default async function DispatchPortalPage({ params }: DispatchPageProps) {
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
    const transporter = String(formData.get("transporter") || "Bageshwari Dedicated Fleet");
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

        // Create or update shipment
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

      // Advance Order Workflow to SHIPPED and trigger dealer notifications
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

  const [readyToDispatchOrders, shippedOrders] = await Promise.all([
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
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div>
        <div className="section-kicker">Logistics & Dispatch Operations</div>
        <h1 className="text-2xl font-black text-[#0b2d55]">Dispatch, Delivery Challans & Carrier Tracking</h1>
        <p className="text-sm text-slate-500 mt-1">
          Carrier assignment, carton manifest verification, printable Delivery Challans, and dealer dispatch notifications.
        </p>
      </div>

      {/* 1. ORDERS READY FOR DISPATCH */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50/70 border-b pb-3">
          <CardTitle className="text-sm font-bold text-[#0b2d55] flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-700" />
            Orders Ready for Transport & Delivery Challan ({readyToDispatchOrders.length})
          </CardTitle>
          <CardDescription className="text-xs text-blue-900/70">
            Final tax invoices and packaging manifests ready. Assign carrier to generate challan and notify dealer.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {readyToDispatchOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No orders waiting for dispatch at this time.
            </div>
          ) : (
            <div className="divide-y">
              {readyToDispatchOrders.map((ord) => {
                const addr = ord.dealer?.addresses?.[0];
                const dest = addr ? `${addr.city || ""}, ${addr.district || ""}` : "Nepalgunj";
                const cartonCount = ord.packages.length || 1;

                return (
                  <div key={ord.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">{ord.orderNumber}</span>
                        <Badge className="bg-blue-100 text-blue-800 text-[10px]">{ord.status}</Badge>
                        <span className="text-xs text-slate-500">• {ord.items.length} items ({cartonCount} cartons)</span>
                      </div>
                      <div className="font-semibold text-xs text-slate-800">
                        {ord.dealer.tradingName || ord.dealer.legalName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" /> Destination: {dest}
                      </div>
                    </div>

                    <form action={confirmDispatchAction} className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-lg border">
                      <input type="hidden" name="orderId" value={ord.id} />
                      <input type="hidden" name="totalCartons" value={cartonCount} />

                      <div className="w-36">
                        <Input
                          name="transporter"
                          placeholder="Carrier / Transporter"
                          defaultValue="Sundar Transport"
                          className="h-8 text-xs"
                          required
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          name="vehicleNumber"
                          placeholder="Vehicle No (e.g. BA 2 KHA 4910)"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          name="driverName"
                          placeholder="Driver Name"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          name="driverPhone"
                          placeholder="Driver Phone"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          name="totalWeight"
                          placeholder="Weight kg"
                          type="number"
                          step="0.1"
                          className="h-8 text-xs"
                        />
                      </div>

                      <Button
                        type="submit"
                        size="sm"
                        className="h-8 text-xs bg-blue-700 hover:bg-blue-800 text-white font-bold px-3 shadow-xs"
                      >
                        <Send className="h-3 w-3 mr-1" /> Confirm Dispatch
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. DISPATCHED & IN-TRANSIT ORDERS */}
      <Card>
        <CardHeader className="bg-slate-50 border-b pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>Dispatched & In-Transit Orders ({shippedOrders.length})</span>
            <span className="text-xs text-slate-500 font-normal">Active Carrier Manifests</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Order & Challan No</th>
                  <th className="px-4 py-3">Dealer</th>
                  <th className="px-4 py-3">Carrier / Vehicle</th>
                  <th className="px-4 py-3">Cartons</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Documents & Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {shippedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      No dispatched orders yet.
                    </td>
                  </tr>
                ) : (
                  shippedOrders.map((o) => {
                    const addr = o.dealer?.addresses?.[0];
                    const destination = addr ? `${addr.city || ""}, ${addr.district || ""}` : "Nepalgunj";
                    const shipment = o.shipments[0];

                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold font-mono text-slate-900">{o.orderNumber}</div>
                          {shipment?.challanNumber && (
                            <div className="text-[10px] text-blue-700 font-mono font-bold">
                              Challan: {shipment.challanNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{o.dealer?.tradingName || o.dealer?.legalName}</div>
                          <div className="text-[10px] text-slate-400">{destination}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-800">{shipment?.transporter || "Dedicated Fleet"}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {shipment?.vehicleNumber ? `Veh: ${shipment.vehicleNumber}` : "—"}
                            {shipment?.driverPhone ? ` • ${shipment.driverPhone}` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium">
                          {shipment?.totalCartons || o.packages?.length || 1} Carton(s)
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            className={`text-[10px] ${
                              o.status === "COMPLETED" || o.status === "DELIVERED"
                                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                : "bg-blue-100 text-blue-900 border-blue-300"
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
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200 shadow-2xs"
                              title="Tax Invoice"
                            >
                              <ShieldCheck className="h-3 w-3" /> Invoice
                            </a>

                            {/* 2. Packaging List */}
                            <a
                              href={`/api/orders/${o.id}/documents/packing-list`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border bg-white hover:bg-slate-50 text-emerald-700 border-emerald-200 shadow-2xs"
                              title="Packing List"
                            >
                              <PackageCheck className="h-3 w-3" /> Packing List
                            </a>

                            {/* 3. Carton Labels */}
                            <a
                              href={`/api/orders/${o.id}/documents/package-labels`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border bg-white hover:bg-slate-50 text-amber-700 border-amber-200 shadow-2xs"
                              title="Carton Labels"
                            >
                              <Tag className="h-3 w-3" /> Labels
                            </a>

                            {/* 4. Delivery Challan */}
                            <a
                              href={`/api/orders/${o.id}/documents/dispatch-challan`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border bg-white hover:bg-slate-50 text-blue-700 border-blue-200 shadow-2xs"
                              title="Delivery Challan"
                            >
                              <Truck className="h-3 w-3" /> Challan
                            </a>

                            <Link href={`/admin/orders/${o.id}`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs">
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
        </CardContent>
      </Card>
    </div>
  );
}
