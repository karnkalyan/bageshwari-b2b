import { prisma } from "@/lib/db";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Package,
  Printer,
  Download,
  UserCheck,
  Clock,
  Shield,
  CheckCheck,
  PackageCheck,
  Truck,
  Tag,
  FileText,
} from "lucide-react";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { Pagination } from "@/components/ui/pagination";
import { sendWorkflowNotification } from "@/services/notification.service";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";

interface WarehousePageProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WarehousePortalPage({ params, searchParams }: WarehousePageProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  const isManager = hasRole(
    ctx,
    "SUPER_ADMIN",
    "PLATFORM_ADMIN",
    "SELLER_OWNER",
    "ADMIN",
    "STAFF",
    "WAREHOUSE_MANAGER",
    "ACCOUNTANT",
    "ACCOUNTS_MANAGER",
    "SALESPERSON",
    "SALES_REP",
    "SALES_MANAGER"
  );

  const isWarehouseUser = hasRole(
    ctx,
    "WAREHOUSE_USER",
    "WAREHOUSE_PICKER",
    "PACKING_USER"
  );

  const isAuthorized =
    isManager ||
    isWarehouseUser ||
    hasPermission(ctx, "picklist.complete") ||
    hasPermission(ctx, "picklist.generate");

  if (!isAuthorized) {
    redirect("/admin");
  }

  // PickList Query Filtering:
  const pickListWhere: any = { sellerId: ctx.sellerId };
  if (!isManager) {
    pickListWhere.OR = [
      { assignedToId: ctx.userId },
      { pickerId: ctx.userId },
      { assignedToId: null },
      { pickerId: null },
    ];
  }

  const readyOrdersWhere: any = { sellerId: ctx.sellerId, status: "READY_FOR_WAREHOUSE" };

  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const [pickLists, totalPickLists, readyOrders, warehouseStaff] = await Promise.all([
    prisma.pickList.findMany({
      where: pickListWhere,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          include: {
            dealer: { select: { tradingName: true, legalName: true } },
            packages: { select: { id: true, packageNumber: true } },
            shipments: { select: { id: true, challanNumber: true } },
          },
        },
        items: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        picker: { select: { id: true, name: true, email: true } },
        completedBy: { select: { id: true, name: true } },
      },
      skip: offset,
      take: limit,
    }),
    prisma.pickList.count({ where: pickListWhere }),
    prisma.order.findMany({
      where: readyOrdersWhere,
      include: {
        dealer: { select: { tradingName: true, legalName: true } },
        items: { select: { id: true, productName: true, sku: true, originalQuantity: true, approvedQuantity: true } },
      },
    }),
    prisma.userRole.findMany({
      where: {
        sellerId: ctx.sellerId,
        role: {
          code: {
            in: [
              "WAREHOUSE_USER",
              "WAREHOUSE_PICKER",
              "WAREHOUSE_MANAGER",
              "PACKING_USER",
              "STAFF",
              "ADMIN",
            ],
          },
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalPickLists / limit);

  // Server Action: Complete Picking
  async function completePickListAction(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext(sellerSlug);
    const pickListId = String(formData.get("pickListId") || "");
    const orderId = String(formData.get("orderId") || "");
    if (!pickListId || !orderId) return;

    try {
      await prisma.$transaction(async (tx) => {
        const pl = await tx.pickList.findFirst({
          where: { id: pickListId, sellerId: actionCtx.sellerId },
          include: { items: true },
        });
        if (!pl) throw new Error("Pick list not found");

        for (const itm of pl.items) {
          await tx.pickListItem.update({
            where: { id: itm.id },
            data: { pickedQuantity: itm.approvedQuantity },
          });
        }

        await tx.pickList.update({
          where: { id: pickListId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            completedById: actionCtx.userId,
          },
        });
      });

      await executeOrderWorkflowAction({
        sellerId: actionCtx.sellerId,
        orderId,
        targetStatus: "PICKING_COMPLETED",
        actor: {
          userId: actionCtx.userId,
          permissions: actionCtx.permissions,
          roles: actionCtx.roles,
        },
        reason: "Warehouse picker verified and completed pick list manifest",
      });
    } catch (err) {
      console.warn("Complete pick list action failed:", err);
    }

    revalidatePath(`/s/${sellerSlug}/admin/warehouse`);
  }

  // Server Action: Assign Picker
  async function assignPickerAction(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext(sellerSlug);
    const pickListId = String(formData.get("pickListId") || "");
    const assignedUserId = String(formData.get("assignedUserId") || "");
    if (!pickListId || !assignedUserId) return;

    try {
      await prisma.pickList.update({
        where: { id: pickListId, sellerId: actionCtx.sellerId },
        data: {
          assignedToId: assignedUserId,
          pickerId: assignedUserId,
          status: "ASSIGNED",
        },
      });

      const user = await prisma.user.findUnique({
        where: { id: assignedUserId },
        select: { name: true, email: true },
      });

      await sendWorkflowNotification({
        sellerId: actionCtx.sellerId,
        title: "Pick List Assigned to You",
        message: `You have been assigned to fulfill Pick List ${pickListId}.`,
        targetRoles: ["WAREHOUSE_USER", "WAREHOUSE_PICKER"],
      });
    } catch (err) {
      console.warn("Assign picker action failed:", err);
    }

    revalidatePath(`/s/${sellerSlug}/admin/warehouse`);
  }

  // Server Action: Start Picking on Ready Order
  async function startPickingAction(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext(sellerSlug);
    const orderId = String(formData.get("orderId") || "");
    const assignedWarehouseUserId = String(formData.get("assignedWarehouseUserId") || "");
    if (!orderId) return;

    try {
      await executeOrderWorkflowAction({
        sellerId: actionCtx.sellerId,
        orderId,
        targetStatus: "READY_FOR_WAREHOUSE",
        assignedWarehouseUserId: assignedWarehouseUserId || undefined,
        actor: {
          userId: actionCtx.userId,
          permissions: actionCtx.permissions,
          roles: actionCtx.roles,
        },
        reason: "Warehouse initiated picking",
      });
    } catch (err) {
      console.warn("Start picking action failed:", err);
    }

    revalidatePath(`/s/${sellerSlug}/admin/warehouse`);
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-kicker">Fulfillment Operations</div>
          <h1 className="text-2xl font-black text-foreground">Warehouse Fulfillment, Packaging & Dispatch</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick list assignment, packaging manifest, carton labels, delivery challans, and picking queue.
          </p>
        </div>

        {/* View Scope Badge */}
        <div>
          {isManager ? (
            <Badge className="bg-purple-500/10 text-purple-500 border border-purple-500/20 font-bold px-3 py-1 text-xs flex items-center gap-1.5 shadow-2xs">
              <Shield className="h-3.5 w-3.5" />
              Manager Mode: Viewing All Warehouse Orders & Staff
            </Badge>
          ) : (
            <Badge className="bg-teal-500/10 text-teal-500 border border-teal-500/20 font-bold px-3 py-1 text-xs flex items-center gap-1.5 shadow-2xs">
              <UserCheck className="h-3.5 w-3.5" />
              Picker Mode: Viewing Only Assigned Pick Lists
            </Badge>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">Ready for Fulfillment</span>
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Warehouse className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground mt-3">{readyOrders.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Released orders awaiting picking assignment</div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-teal-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-500 uppercase tracking-wider">
              {isManager ? "Active Pick Lists" : "My Assigned Pick Lists"}
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10">
              <CheckCircle2 className="h-5 w-5 text-teal-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground mt-3">{pickLists.length}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {pickLists.filter((p) => p.status === "COMPLETED").length} completed •{" "}
            {pickLists.filter((p) => p.status !== "COMPLETED").length} in progress
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Packaging & Logistics</span>
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <PackageCheck className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground mt-3">
            {pickLists.reduce((sum, p) => sum + (p.order?.packages?.length || 0), 0)} Cartons
          </div>
          <div className="text-xs text-muted-foreground mt-1">Total packed cartons ready for challan & transport</div>
        </div>
      </div>

      {/* Ready Orders Queue (Awaiting Picking / Assignment) */}
      {isManager && readyOrders.length > 0 && (
        <div className="glass-card overflow-hidden border-l-4 border-l-purple-500">
          <div className="p-4 border-b border-border font-bold text-sm bg-muted/40 text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-purple-500" />
              <span>Orders Released to Warehouse ({readyOrders.length})</span>
            </div>
            <span className="text-xs text-muted-foreground font-normal">Ready to assign picker & generate pick sheet</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Order No</th>
                  <th className="px-4 py-3">Dealer</th>
                  <th className="px-4 py-3">Items Count</th>
                  <th className="px-4 py-3">Assign Warehouse Picker</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {readyOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">{ord.orderNumber}</td>
                    <td className="px-4 py-3.5">{ord.dealer.tradingName || ord.dealer.legalName}</td>
                    <td className="px-4 py-3.5">{ord.items.length} product(s)</td>
                    <td className="px-4 py-3.5">
                      <form action={startPickingAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="orderId" value={ord.id} />
                        {warehouseStaff.length > 0 ? (
                          <select
                            name="assignedWarehouseUserId"
                            defaultValue=""
                            className="h-8 text-xs border border-border rounded-lg px-2 bg-card text-foreground font-medium outline-none"
                            required
                          >
                            <option value="" disabled>Choose Warehouse User...</option>
                            {warehouseStaff.map((ws) => (
                              <option key={ws.user.id} value={ws.user.id}>
                                {ws.user.name || ws.user.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-muted-foreground text-xs">Default Picker</span>
                        )}
                        <Button type="submit" size="sm" className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3">
                          Assign & Generate
                        </Button>
                      </form>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/admin/orders/${ord.id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs border-border">View Order</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pick Lists & Packaging Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border font-bold text-sm bg-muted/40 text-foreground flex items-center justify-between">
          <span>{isManager ? "All Warehouse Pick Lists & Logistics Manifests" : "Pick Lists Assigned to You"}</span>
          <span className="text-xs text-muted-foreground font-normal">Total: {totalPickLists}</span>
        </div>

        {pickLists.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <Warehouse className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <div className="font-bold text-foreground text-sm">No Pick Lists Assigned</div>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {isManager
                ? "No pick lists have been generated for released orders yet."
                : "You do not have any pick lists assigned at the moment. Pick lists assigned by your warehouse manager will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Pick List No</th>
                  <th className="px-4 py-3">Order No</th>
                  <th className="px-4 py-3">Dealer</th>
                  <th className="px-4 py-3">Assigned Picker</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Printable Documents & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {pickLists.map((pl) => {
                  const isAssignedToCurrent =
                    pl.assignedToId === ctx.userId || pl.pickerId === ctx.userId;
                  const canComplete =
                    pl.status !== "COMPLETED" && (isManager || isAssignedToCurrent);

                  return (
                    <tr key={pl.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                        {pl.pickListNumber}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-blue-500">
                        {pl.order?.orderNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        {pl.order?.dealer?.tradingName || pl.order?.dealer?.legalName}
                      </td>
                      <td className="px-4 py-3.5">
                        {pl.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              {pl.assignedTo.name || pl.assignedTo.email}
                            </span>
                            {isAssignedToCurrent && (
                              <Badge variant="outline" className="text-[9px] bg-teal-500/10 text-teal-500 border-teal-500/20">
                                You
                              </Badge>
                            )}
                          </div>
                        ) : isManager && warehouseStaff.length > 0 ? (
                          <form action={assignPickerAction} className="flex items-center gap-1">
                            <input type="hidden" name="pickListId" value={pl.id} />
                            <select
                              name="assignedUserId"
                              defaultValue=""
                              className="h-8 text-xs border border-border rounded-lg px-2 bg-card text-foreground font-medium outline-none"
                              required
                            >
                              <option value="" disabled>
                                Assign Picker...
                              </option>
                              {warehouseStaff.map((ws) => (
                                <option key={ws.user.id} value={ws.user.id}>
                                  {ws.user.name || ws.user.email}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" size="sm" className="h-8 text-xs px-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold">
                              Assign
                            </Button>
                          </form>
                        ) : (
                          <span className="text-amber-500 font-medium text-[11px] flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-foreground">
                        {pl.items.length} item(s)
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          className={`text-[10px] font-bold ${
                            pl.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : pl.status === "ASSIGNED"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}
                        >
                          {pl.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {/* 1. Printable Pick Sheet */}
                          <a
                            href={`/api/orders/${pl.orderId}/documents/pick-list`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-foreground shadow-2xs transition-colors"
                            title="Print Picking Sheet with Rack Locations"
                          >
                            <Printer className="h-3 w-3 text-teal-500" /> Pick Sheet
                          </a>

                          {/* 2. Printable Packaging List (Carton Manifest) */}
                          <a
                            href={`/api/orders/${pl.orderId}/documents/packing-list`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-emerald-500 shadow-2xs transition-colors"
                            title="Print Detailed Packaging List & Carton Manifest"
                          >
                            <PackageCheck className="h-3 w-3 text-emerald-500" /> Packaging List
                          </a>

                          {/* 3. Carton Labels */}
                          <a
                            href={`/api/orders/${pl.orderId}/documents/package-labels`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-amber-500 shadow-2xs transition-colors"
                            title="Print Carton Labels for all packages"
                          >
                            <Tag className="h-3 w-3 text-amber-500" /> Labels
                          </a>

                          {/* 4. Delivery Challan */}
                          <a
                            href={`/api/orders/${pl.orderId}/documents/dispatch-challan`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-blue-500 shadow-2xs transition-colors"
                            title="Print Delivery Challan"
                          >
                            <Truck className="h-3 w-3 text-blue-500" /> Challan
                          </a>

                          {/* 5. Complete Picking Action */}
                          {canComplete && (
                            <form action={completePickListAction}>
                              <input type="hidden" name="pickListId" value={pl.id} />
                              <input type="hidden" name="orderId" value={pl.orderId} />
                              <Button
                                type="submit"
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Complete Picking
                              </Button>
                            </form>
                          )}

                          {/* 6. View Order Details */}
                          <Link href={`/admin/orders/${pl.orderId}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-border">
                              Order
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border bg-muted/20">
            <Pagination totalPages={totalPages} />
          </div>
        )}
      </div>
    </div>
  );
}
