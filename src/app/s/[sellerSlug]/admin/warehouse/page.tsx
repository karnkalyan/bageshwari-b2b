import { prisma } from "@/lib/db";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { sendWorkflowNotification } from "@/services/notification.service";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";

interface WarehousePageProps {
  params: Promise<{ sellerSlug: string }>;
}

export default async function WarehousePortalPage({ params }: WarehousePageProps) {
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
  // Managers and Sales/Accounts see ALL picklists. Warehouse users see assigned & unassigned picklists.
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

  const [pickLists, readyOrders, warehouseStaff] = await Promise.all([
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
    }),
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
              "SUPER_ADMIN",
            ],
          },
        },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  // Server Action: Manager assigns pick list to a warehouse picker
  async function assignPickerAction(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext(sellerSlug);
    const pickListId = String(formData.get("pickListId") || "");
    const targetUserId = String(formData.get("assignedUserId") || "");
    if (!pickListId || !targetUserId) return;

    const pl = await prisma.pickList.update({
      where: { id: pickListId, sellerId: actionCtx.sellerId },
      data: {
        assignedToId: targetUserId,
        pickerId: targetUserId,
        status: "ASSIGNED",
      },
      include: { order: true },
    });

    // Send notification to the assigned picker
    await sendWorkflowNotification({
      sellerId: actionCtx.sellerId,
      targetUserIds: [targetUserId],
      title: `Pick List Assigned: ${pl.pickListNumber}`,
      message: `You have been assigned to pick Order ${pl.order.orderNumber}. Rack/bin locations ready.`,
      linkUrl: `/s/${sellerSlug}/admin/warehouse`,
      excludeUserId: actionCtx.userId,
    });

    revalidatePath(`/s/${sellerSlug}/admin/warehouse`);
  }

  // Server Action: Complete Picking
  async function completePickListAction(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext(sellerSlug);
    const pickListId = String(formData.get("pickListId") || "");
    const orderId = String(formData.get("orderId") || "");
    if (!pickListId || !orderId) return;

    try {
      await executeOrderWorkflowAction({
        sellerId: actionCtx.sellerId,
        orderId,
        targetStatus: "PICK_LIST_COMPLETED",
        actor: {
          userId: actionCtx.userId,
          permissions: actionCtx.permissions,
          roles: actionCtx.roles,
        },
        reason: "Picking completed by assigned warehouse user",
      });
    } catch (err) {
      console.warn("Complete pick list action failed:", err);
    }

    revalidatePath(`/s/${sellerSlug}/admin/warehouse`);
  }

  // Server Action: Start Picking on Ready Order & Assign Picker
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
          <div className="section-kicker">Fulfillment operations</div>
          <h1 className="text-2xl font-black text-[#0b2d55]">Warehouse Fulfillment, Packaging & Dispatch</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pick list assignment, packaging manifest, carton labels, delivery challans, and picking queue.
          </p>
        </div>

        {/* View Scope Badge */}
        <div>
          {isManager ? (
            <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-bold px-3 py-1 text-xs flex items-center gap-1.5 shadow-2xs">
              <Shield className="h-3.5 w-3.5 text-purple-700" />
              Manager Mode: Viewing All Warehouse Orders & Staff
            </Badge>
          ) : (
            <Badge className="bg-teal-100 text-teal-900 border-teal-300 font-bold px-3 py-1 text-xs flex items-center gap-1.5 shadow-2xs">
              <UserCheck className="h-3.5 w-3.5 text-teal-700" />
              Picker Mode: Viewing Only Assigned Pick Lists
            </Badge>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-purple-200 bg-purple-50/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-800 uppercase">Ready for Fulfillment</span>
              <Warehouse className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900 mt-2">{readyOrders.length}</div>
            <div className="text-xs text-purple-700 mt-1">Released orders awaiting picking assignment</div>
          </CardContent>
        </Card>

        <Card className="border-teal-200 bg-teal-50/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-800 uppercase">
                {isManager ? "Assigned & Active Pick Lists" : "My Assigned Pick Lists"}
              </span>
              <CheckCircle2 className="h-5 w-5 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-teal-900 mt-2">{pickLists.length}</div>
            <div className="text-xs text-teal-700 mt-1">
              {pickLists.filter((p) => p.status === "COMPLETED").length} completed •{" "}
              {pickLists.filter((p) => p.status !== "COMPLETED").length} in progress
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase">Packaging & Logistics</span>
              <PackageCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-2">
              {pickLists.reduce((sum, p) => sum + (p.order?.packages?.length || 0), 0)} Cartons
            </div>
            <div className="text-xs text-emerald-700 mt-1">Total packed cartons ready for challan & transport</div>
          </CardContent>
        </Card>
      </div>

      {/* Ready Orders Queue (Awaiting Picking / Assignment) */}
      {isManager && readyOrders.length > 0 && (
        <Card className="border-purple-200">
          <CardContent className="p-0">
            <div className="p-4 border-b font-bold text-sm bg-purple-50/70 text-purple-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-purple-700" />
                <span>Orders Released to Warehouse ({readyOrders.length})</span>
              </div>
              <span className="text-xs text-purple-700 font-normal">Ready to assign picker & generate pick sheet</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold">
                  <tr>
                    <th className="px-4 py-3">Order No</th>
                    <th className="px-4 py-3">Dealer</th>
                    <th className="px-4 py-3">Items Count</th>
                    <th className="px-4 py-3">Assign Warehouse Picker</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {readyOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                      <td className="px-4 py-3.5">{ord.dealer.tradingName || ord.dealer.legalName}</td>
                      <td className="px-4 py-3.5">{ord.items.length} product(s)</td>
                      <td className="px-4 py-3.5">
                        <form action={startPickingAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="orderId" value={ord.id} />
                          {warehouseStaff.length > 0 ? (
                            <select
                              name="assignedWarehouseUserId"
                              defaultValue=""
                              className="h-7 text-xs border rounded-md px-1.5 bg-white text-slate-700 font-medium"
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
                            <span className="text-slate-400 text-xs">Default Picker</span>
                          )}
                          <Button type="submit" size="sm" className="h-7 text-[11px] bg-purple-700 hover:bg-purple-800 text-white font-semibold">
                            Generate Pick Sheet & Assign
                          </Button>
                        </form>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/orders/${ord.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs">View Order</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pick Lists & Packaging Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b font-bold text-sm bg-slate-50 flex items-center justify-between">
            <span>{isManager ? "All Warehouse Pick Lists & Logistics Manifests" : "Pick Lists Assigned to You"}</span>
            <span className="text-xs text-slate-500 font-normal">Total: {pickLists.length}</span>
          </div>

          {pickLists.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Warehouse className="h-10 w-10 mx-auto text-slate-300" />
              <div className="font-bold text-slate-700 text-sm">No Pick Lists Assigned</div>
              <p className="text-slate-500 max-w-sm mx-auto">
                {isManager
                  ? "No pick lists have been generated for released orders yet."
                  : "You do not have any pick lists assigned at the moment. Pick lists assigned by your warehouse manager will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold">
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
                <tbody className="divide-y text-slate-700">
                  {pickLists.map((pl) => {
                    const isAssignedToCurrent =
                      pl.assignedToId === ctx.userId || pl.pickerId === ctx.userId;
                    const canComplete =
                      pl.status !== "COMPLETED" && (isManager || isAssignedToCurrent);

                    return (
                      <tr key={pl.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                          {pl.pickListNumber}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-blue-900">
                          {pl.order?.orderNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          {pl.order?.dealer?.tradingName || pl.order?.dealer?.legalName}
                        </td>
                        <td className="px-4 py-3.5">
                          {pl.assignedTo ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800">
                                {pl.assignedTo.name || pl.assignedTo.email}
                              </span>
                              {isAssignedToCurrent && (
                                <Badge variant="outline" className="text-[9px] bg-teal-50 text-teal-800 border-teal-300">
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
                                className="h-7 text-xs border rounded px-1.5 bg-white text-slate-700 font-medium"
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
                              <Button type="submit" size="sm" className="h-7 text-[10px] px-2 bg-purple-700 hover:bg-purple-800 text-white">
                                Assign
                              </Button>
                            </form>
                          ) : (
                            <span className="text-amber-600 font-medium text-[11px] flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-900">
                          {pl.items.length} item(s)
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            className={`text-[10px] font-bold ${
                              pl.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                : pl.status === "ASSIGNED"
                                ? "bg-blue-100 text-blue-900 border-blue-300"
                                : "bg-amber-100 text-amber-900 border-amber-300"
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                              title="Print Picking Sheet with Rack Locations"
                            >
                              <Printer className="h-3 w-3 text-teal-600" /> Pick Sheet
                            </a>

                            {/* 2. Printable Packaging List (Carton Manifest) */}
                            <a
                              href={`/api/orders/${pl.orderId}/documents/packing-list`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 shadow-2xs"
                              title="Print Detailed Packaging List & Carton Manifest"
                            >
                              <PackageCheck className="h-3 w-3 text-emerald-700" /> Packaging List
                            </a>

                            {/* 3. Carton Labels */}
                            <a
                              href={`/api/orders/${pl.orderId}/documents/package-labels`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-2xs"
                              title="Print Carton Labels for all packages"
                            >
                              <Tag className="h-3 w-3 text-amber-700" /> Carton Labels
                            </a>

                            {/* 4. Delivery Challan */}
                            <a
                              href={`/api/orders/${pl.orderId}/documents/dispatch-challan`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 shadow-2xs"
                              title="Print Delivery Challan"
                            >
                              <Truck className="h-3 w-3 text-blue-700" /> Challan
                            </a>

                            {/* 5. Complete Picking Action */}
                            {canComplete && (
                              <form action={completePickListAction}>
                                <input type="hidden" name="pickListId" value={pl.id} />
                                <input type="hidden" name="orderId" value={pl.orderId} />
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                >
                                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Complete Picking
                                </Button>
                              </form>
                            )}

                            {/* 6. View Order Details */}
                            <Link href={`/admin/orders/${pl.orderId}`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-slate-600">
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
        </CardContent>
      </Card>
    </div>
  );
}
