import "server-only";
import { prisma } from "@/lib/db";
import { Prisma, PickListStatus } from "@prisma/client";
import { nextDocumentNumber } from "@/services/number-sequence.service";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";

export interface PickListUpdateItemInput {
  id?: string;
  orderItemId?: string;
  sku: string;
  pickedQuantity: number;
  rackLocation?: string | null;
  binLocation?: string | null;
  remarks?: string | null;
}

export interface UpdateOrderPickListInput {
  sellerId: string;
  orderId: string;
  pickListId?: string;
  items: PickListUpdateItemInput[];
  notes?: string | null;
  assignedToId?: string | null;
  status?: PickListStatus;
  markCompleted?: boolean;
  actor: {
    userId: string;
    roles: string[];
    permissions: string[];
  };
}

export async function getOrderPickListDetails(sellerId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, sellerId },
    include: {
      dealer: {
        select: {
          id: true,
          legalName: true,
          tradingName: true,
          code: true,
          addresses: {
            where: { isDefault: true },
            take: 1,
            select: { city: true, district: true },
          },
        },
      },
      items: {
        where: { status: { not: "REMOVED" } },
        select: {
          id: true,
          sku: true,
          productId: true,
          variantId: true,
          productName: true,
          variantName: true,
          originalQuantity: true,
          approvedQuantity: true,
          dealerPrice: true,
          product: { select: { unitCode: true } },
        },
      },
      pickLists: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          items: true,
          warehouse: { select: { id: true, name: true, code: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          picker: { select: { id: true, name: true, email: true } },
          completedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!order) return null;

  let pickList: any = order.pickLists[0] || null;

  // If no pick list exists yet, auto-initialize one so warehouse users can begin picking
  if (!pickList) {
    const defaultWarehouse = await prisma.warehouse.findFirst({ where: { sellerId } });
    const warehouseId = defaultWarehouse?.id || "default-wh";
    const plNumber = await nextDocumentNumber(prisma as any, sellerId, "PICK_LIST", "PL").catch(
      () => `PL-${order.orderNumber.replace(/^[A-Za-z]+[-_]?/, "")}`
    );

    pickList = await prisma.pickList.create({
      data: {
        sellerId,
        orderId: order.id,
        warehouseId,
        pickListNumber: plNumber,
        status: "GENERATED",
        notes: "Initialized for warehouse picking manifest",
        items: {
          create: order.items.map((oi) => ({
            sellerId,
            productId: oi.productId,
            variantId: oi.variantId,
            sku: oi.sku,
            approvedQuantity: oi.approvedQuantity ?? oi.originalQuantity,
            pickedQuantity: 0,
            rackLocation: "R-01",
            binLocation: "B-01",
          })),
        },
      },
      include: {
        items: true,
        warehouse: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        picker: { select: { id: true, name: true, email: true } },
        completedBy: { select: { id: true, name: true, email: true } },
      },
    });
  } else {
    // If pick list exists but is missing some order items, ensure items are synchronized
    const existingSkus = new Set((pickList.items || []).map((it: any) => it.sku));
    const missingOrderItems = order.items.filter((oi) => !existingSkus.has(oi.sku));

    if (missingOrderItems.length > 0) {
      await prisma.pickListItem.createMany({
        data: missingOrderItems.map((oi) => ({
          sellerId,
          pickListId: pickList.id,
          productId: oi.productId,
          variantId: oi.variantId,
          sku: oi.sku,
          approvedQuantity: oi.approvedQuantity ?? oi.originalQuantity,
          pickedQuantity: 0,
          rackLocation: "R-01",
          binLocation: "B-01",
        })),
      });

      // Reload pick list items
      const refreshedItems = await prisma.pickListItem.findMany({
        where: { pickListId: pickList.id },
      });
      pickList.items = refreshedItems;
    }
  }

  // Combine order item metadata with pick list item records
  const itemsMap = new Map<string, any>();
  for (const itm of (pickList.items || [])) {
    itemsMap.set(itm.sku, itm);
    if (itm.variantId) itemsMap.set(itm.variantId, itm);
  }

  const enrichedItems = order.items.map((oi, index) => {
    const matchedPi = (oi.variantId ? itemsMap.get(oi.variantId) : null) || itemsMap.get(oi.sku);
    const approvedQty = Number(oi.approvedQuantity ?? oi.originalQuantity);
    const pickedQty = matchedPi ? Number(matchedPi.pickedQuantity) : 0;

    return {
      sn: index + 1,
      id: matchedPi?.id || oi.id,
      orderItemId: oi.id,
      productId: oi.productId,
      variantId: oi.variantId,
      sku: oi.sku,
      productName: oi.productName,
      variantName: oi.variantName,
      unit: oi.product?.unitCode || "PCS",
      approvedQuantity: approvedQty,
      pickedQuantity: pickedQty,
      isPicked: pickedQty >= approvedQty && approvedQty > 0,
      rackLocation: matchedPi?.rackLocation || "R-01",
      binLocation: matchedPi?.binLocation || "B-01",
      remarks: matchedPi?.remarks || "",
      batchNumber: matchedPi?.batchNumber || null,
      serialNumber: matchedPi?.serialNumber || null,
    };
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    dealer: order.dealer
      ? {
          id: order.dealer.id,
          legalName: order.dealer.legalName,
          tradingName: order.dealer.tradingName,
          code: order.dealer.code,
          city: order.dealer.addresses[0]?.city || null,
          district: order.dealer.addresses[0]?.district || null,
        }
      : null,
    warehouseName: pickList?.warehouse?.name || "Central Distribution Depot",
    pickList: {
      id: pickList.id,
      pickListNumber: pickList.pickListNumber,
      status: pickList.status,
      notes: pickList.notes,
      assignedTo: pickList.assignedTo,
      picker: pickList.picker,
      completedBy: pickList.completedBy,
      createdAt: pickList.createdAt,
      updatedAt: pickList.updatedAt,
      startedAt: pickList.startedAt,
      completedAt: pickList.completedAt,
      items: enrichedItems,
    },
  };
}

export async function updateOrderPickList(input: UpdateOrderPickListInput) {
  const { sellerId, orderId, items, notes, assignedToId, markCompleted, actor } = input;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, sellerId },
      include: {
        items: true,
        pickLists: { orderBy: { createdAt: "desc" }, take: 1, include: { items: true } },
      },
    });

    if (!order) throw new Error("ORDER_NOT_FOUND");

    let pickList = order.pickLists[0];
    if (!pickList) {
      const defaultWh = await tx.warehouse.findFirst({ where: { sellerId } });
      const plNumber = await nextDocumentNumber(tx, sellerId, "PICK_LIST", "PL").catch(
        () => `PL-${order.orderNumber.replace(/^[A-Za-z]+[-_]?/, "")}`
      );
      pickList = await tx.pickList.create({
        data: {
          sellerId,
          orderId: order.id,
          warehouseId: defaultWh?.id || "default-wh",
          pickListNumber: plNumber,
          status: "PICKING_IN_PROGRESS",
          notes: notes || "Warehouse picking manifest",
          startedAt: new Date(),
        },
        include: { items: true },
      });
    }

    // Update each item
    for (const itemInput of items) {
      const existingItem =
        (itemInput.id ? pickList.items.find((i) => i.id === itemInput.id) : null) ||
        pickList.items.find((i) => i.sku === itemInput.sku);

      if (existingItem) {
        await tx.pickListItem.update({
          where: { id: existingItem.id },
          data: {
            pickedQuantity: new Prisma.Decimal(Math.max(0, Number(itemInput.pickedQuantity || 0))),
            ...(itemInput.rackLocation !== undefined ? { rackLocation: itemInput.rackLocation } : {}),
            ...(itemInput.binLocation !== undefined ? { binLocation: itemInput.binLocation } : {}),
            ...(itemInput.remarks !== undefined ? { remarks: itemInput.remarks } : {}),
          },
        });
      } else {
        const orderItem = order.items.find((oi) => oi.sku === itemInput.sku);
        if (orderItem) {
          await tx.pickListItem.create({
            data: {
              sellerId,
              pickListId: pickList.id,
              productId: orderItem.productId,
              variantId: orderItem.variantId,
              sku: orderItem.sku,
              approvedQuantity: orderItem.approvedQuantity ?? orderItem.originalQuantity,
              pickedQuantity: new Prisma.Decimal(Math.max(0, Number(itemInput.pickedQuantity || 0))),
              rackLocation: itemInput.rackLocation || "R-01",
              binLocation: itemInput.binLocation || "B-01",
              remarks: itemInput.remarks || null,
            },
          });
        }
      }
    }

    // Determine target pick list status
    const allPicked = items.length > 0 && items.every((it) => {
      const oi = order.items.find((o) => o.sku === it.sku);
      const req = oi ? Number(oi.approvedQuantity ?? oi.originalQuantity) : 0;
      return Number(it.pickedQuantity) >= req;
    });

    const anyPicked = items.some((it) => Number(it.pickedQuantity) > 0);

    let nextStatus: PickListStatus = pickList.status;
    if (markCompleted || allPicked) {
      nextStatus = "COMPLETED";
    } else if (anyPicked || input.status === "PICKING_IN_PROGRESS") {
      nextStatus = "PICKING_IN_PROGRESS";
    } else if (input.status) {
      nextStatus = input.status;
    }

    const updatedPl = await tx.pickList.update({
      where: { id: pickList.id },
      data: {
        status: nextStatus,
        notes: notes !== undefined ? notes : pickList.notes,
        ...(assignedToId !== undefined ? { assignedToId, pickerId: assignedToId } : {}),
        startedAt: pickList.startedAt || (anyPicked ? new Date() : null),
        completedAt: nextStatus === "COMPLETED" ? new Date() : (pickList.completedAt || null),
        completedById: nextStatus === "COMPLETED" ? actor.userId : (pickList.completedById || null),
      },
      include: {
        items: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        picker: { select: { id: true, name: true, email: true } },
        completedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Advance order workflow if marked completed
    if (nextStatus === "COMPLETED" && ["APPROVED", "PAYMENT_CONFIRMED", "PROCESSING"].includes(order.status)) {
      await executeOrderWorkflowAction({
        sellerId,
        orderId,
        targetStatus: "PICKING_COMPLETED",
        actor,
        reason: "Warehouse user confirmed all picking items completed",
      }).catch((err) => {
        console.warn("Workflow transition notice during pick list update:", err);
      });
    }

    return updatedPl;
  });
}
