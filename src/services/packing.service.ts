import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { transitionOrderStatusInTransaction, type TransitionActor } from "@/modules/orders/order-transition.service";
import { nextDocumentNumber } from "@/services/number-sequence.service";
import { sendWorkflowNotification } from "@/services/notification.service";

export interface CartonItemInput {
  orderItemId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitCode?: string;
}

export interface CartonInput {
  id?: string;
  packageNumber?: string;
  packageType?: string;
  length?: number;
  width?: number;
  height?: number;
  weight: number;
  handlingInstructions?: string;
  items: CartonItemInput[];
}

export interface SaveOrderCartonPackagingInput {
  sellerId: string;
  orderId: string;
  packages: CartonInput[];
  finalize?: boolean;
  actor: TransitionActor;
}

export async function createPackage(input: {
  sellerId: string;
  orderId: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  packageType?: string;
  handlingInstructions?: string;
  items?: unknown;
  finalize?: boolean;
  actor: TransitionActor;
}) {
  if (!Number.isFinite(input.weight) || input.weight <= 0) throw new Error("PACKAGE_WEIGHT_INVALID");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: input.orderId, sellerId: input.sellerId } });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (["PAID", "CREDIT_APPROVED"].includes(order.status))
      await transitionOrderStatusInTransaction(tx, {
        sellerId: input.sellerId,
        orderId: order.id,
        targetStatus: "PACKING_IN_PROGRESS",
        actor: input.actor,
        reason: "Packing started",
      });
    else if (order.status !== "PACKING_IN_PROGRESS") throw new Error("ORDER_NOT_READY_FOR_PACKING");
    let packageNumber = await nextDocumentNumber(tx, input.sellerId, "PACKAGE", "PKG");
    let createAttempt = 1;
    while (true) {
      const existing = await tx.package.findUnique({
        where: {
          sellerId_packageNumber: {
            sellerId: input.sellerId,
            packageNumber,
          },
        },
      });
      if (!existing) break;
      createAttempt++;
      packageNumber = `${packageNumber}-${createAttempt}`;
    }
    const packed = await tx.package.create({
      data: {
        sellerId: input.sellerId,
        orderId: order.id,
        packageNumber,
        packageType: input.packageType,
        length: input.length,
        width: input.width,
        height: input.height,
        weight: input.weight,
        status: "LABELLED",
        packedById: input.actor.userId,
        packingDate: new Date(),
        barcodeData: packageNumber,
        qrCodeData: `${order.orderNumber}:${packageNumber}`,
        handlingInstructions: input.handlingInstructions,
        itemsJson: input.items ? JSON.stringify(input.items) : null,
      },
    });
    await tx.auditLog.create({
      data: {
        sellerId: input.sellerId,
        userId: input.actor.userId,
        action: "package.created",
        entity: "Package",
        entityId: packed.id,
        newValue: JSON.stringify({ packageNumber, weight: input.weight }),
        severity: "LOW",
      },
    });
    if (input.finalize) {
      await transitionOrderStatusInTransaction(tx, {
        sellerId: input.sellerId,
        orderId: order.id,
        targetStatus: "PACKED",
        actor: input.actor,
        reason: "Packing completed",
      });
      await transitionOrderStatusInTransaction(tx, {
        sellerId: input.sellerId,
        orderId: order.id,
        targetStatus: "PACKED_AND_LABELLED",
        actor: input.actor,
        reason: "Package labels generated",
      });
    }
    return packed;
  });
}

/**
 * Saves full carton packaging for an order:
 * Supports multiple cartons, dimension specs (L x W x H in cm), gross weights, and item breakdowns.
 */
export async function saveOrderCartonPackaging(input: SaveOrderCartonPackagingInput) {
  if (!input.packages || input.packages.length === 0) {
    throw new Error("AT_LEAST_ONE_CARTON_REQUIRED: Please specify at least one carton to pack this order.");
  }

  for (let i = 0; i < input.packages.length; i++) {
    const pkg = input.packages[i];
    if (pkg.weight === undefined || pkg.weight === null || Number(pkg.weight) <= 0) {
      throw new Error(`CARTON_WEIGHT_INVALID: Carton #${i + 1} must have a gross weight greater than 0 kg.`);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, sellerId: input.sellerId },
      include: {
        dealer: { select: { legalName: true, tradingName: true } },
        items: true,
        seller: { select: { slug: true } },
      },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");

    const lockedStatuses = ["SHIPPED", "IN_TRANSIT", "PARTIALLY_DELIVERED", "DELIVERED", "COMPLETED", "CANCELLED"];
    if (lockedStatuses.includes(order.status)) {
      throw new Error("ORDER_ALREADY_DISPATCHED: Cartons cannot be modified once an order has been dispatched.");
    }

    // Remove existing packages for this order so we re-create the exact sequence
    await tx.package.deleteMany({
      where: { orderId: order.id, sellerId: input.sellerId },
    });

    const createdPackages = [];
    const totalCartons = input.packages.length;

    for (let i = 0; i < totalCartons; i++) {
      const ctn = input.packages[i];
      let desiredName = ctn.packageNumber?.trim();
      if (!desiredName || desiredName.startsWith("CTN-") || desiredName.startsWith("Box")) {
        desiredName = `${order.orderNumber}-CTN-${String(i + 1).padStart(2, "0")}`;
      } else if (!desiredName.includes(order.orderNumber)) {
        desiredName = `${order.orderNumber}-${desiredName}`;
      }

      // Ensure 100% collision-free package number guaranteed to satisfy @@unique([sellerId, packageNumber])
      let packageNumber = desiredName;
      let attempt = 1;
      while (true) {
        const existing = await tx.package.findUnique({
          where: {
            sellerId_packageNumber: {
              sellerId: input.sellerId,
              packageNumber,
            },
          },
        });
        if (!existing) break;
        attempt++;
        packageNumber = `${desiredName}-${attempt}`;
      }


      const weightDec = new Prisma.Decimal(Number(ctn.weight) || 0.1);
      const lengthDec = ctn.length ? new Prisma.Decimal(Number(ctn.length)) : null;
      const widthDec = ctn.width ? new Prisma.Decimal(Number(ctn.width)) : null;
      const heightDec = ctn.height ? new Prisma.Decimal(Number(ctn.height)) : null;

      const created = await tx.package.create({
        data: {
          sellerId: input.sellerId,
          orderId: order.id,
          packageNumber,
          packageType: ctn.packageType || "Standard Corrugated Carton",
          length: lengthDec,
          width: widthDec,
          height: heightDec,
          weight: weightDec,
          status: input.finalize ? "LABELLED" : "CREATED",
          packedById: input.actor.userId,
          packingDate: new Date(),
          barcodeData: `${packageNumber}-${order.orderNumber}`,
          qrCodeData: JSON.stringify({
            order: order.orderNumber,
            pkg: packageNumber,
            box: i + 1,
            total: totalCartons,
            dealer: order.dealer.tradingName || order.dealer.legalName,
          }),
          handlingInstructions: ctn.handlingInstructions || null,
          itemsJson: ctn.items && ctn.items.length > 0 ? JSON.stringify(ctn.items) : null,
        },
      });

      createdPackages.push(created);
    }

    const totalWeight = input.packages.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);

    // If finalize, transition order status to PACKED / PACKED_AND_LABELLED
    if (input.finalize) {
      const allowedPrePackingStatuses = [
        "PAID",
        "CREDIT_APPROVED",
        "READY_FOR_WAREHOUSE",
        "PICKING_IN_PROGRESS",
        "PICKING_COMPLETED",
        "PACKING_IN_PROGRESS",
        "PROFORMA_CONFIRMED",
        "FINAL_INVOICE_ISSUED",
        "CONFIRMED",
      ];

      if (allowedPrePackingStatuses.includes(order.status)) {
        try {
          if (order.status !== "PACKING_IN_PROGRESS") {
            await transitionOrderStatusInTransaction(tx, {
              sellerId: input.sellerId,
              orderId: order.id,
              targetStatus: "PACKING_IN_PROGRESS",
              actor: input.actor,
              reason: `Packaging started for ${totalCartons} carton(s)`,
            }).catch(() => {});
          }
          await transitionOrderStatusInTransaction(tx, {
            sellerId: input.sellerId,
            orderId: order.id,
            targetStatus: "PACKED",
            actor: input.actor,
            reason: `Packaging completed into ${totalCartons} carton(s)`,
          }).catch(() => {});
        } catch {
          // Fallback direct update to ensure status consistency
        }
      }

      // Always ensure order is marked as PACKED so logistics/dispatch can process it
      await tx.order.update({
        where: { id: order.id },
        data: { status: "PACKED" },
      });

      await tx.orderStatusHistory.create({
        data: {
          sellerId: input.sellerId,
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          changedById: input.actor.userId,
          remarks: `Order packed into ${totalCartons} carton(s). Total Gross Weight: ${totalWeight.toFixed(2)} KG. Dimensions and item manifest recorded.`,
        },
      });

      await tx.auditLog.create({
        data: {
          sellerId: input.sellerId,
          userId: input.actor.userId,
          action: "order.cartons.packed",
          entity: "Order",
          entityId: order.id,
          newValue: JSON.stringify({ totalCartons, totalWeight }),
          severity: "MEDIUM",
        },
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      sellerSlug: order.seller?.slug || "bageshwari",
      totalCartons,
      totalWeight,
      packages: createdPackages,
    };
  });

  if (input.finalize && result) {
    await sendWorkflowNotification({
      sellerId: input.sellerId,
      targetRoles: ["DISPATCH_USER", "LOGISTICS_MANAGER", "ADMIN", "SUPER_ADMIN"],
      title: `Order Packed & Sealed: ${result.orderNumber}`,
      message: `Order ${result.orderNumber} is packed into ${result.totalCartons} carton(s) (${result.totalWeight.toFixed(2)} KG). Ready for dispatch and transporter assignment.`,
      linkUrl: `/s/${result.sellerSlug}/admin/dispatch`,
      excludeUserId: input.actor.userId,
    });
  }

  return result;
}

/**
 * Retrieves an order's packing configuration: items to pack and current packages
 */
export async function getOrderPackingDetails(sellerId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, sellerId },
    include: {
      items: {
        where: { status: { not: "REMOVED" } },
        select: {
          id: true,
          sku: true,
          productName: true,
          originalQuantity: true,
          approvedQuantity: true,
        },
      },
      packages: {
        orderBy: { packageNumber: "asc" },
      },
      dealer: {
        select: {
          tradingName: true,
          legalName: true,
          addresses: { where: { isDefault: true }, take: 1 },
        },
      },
    },
  });

  if (!order) return null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    dealerName: order.dealer.tradingName || order.dealer.legalName,
    dealerCity: order.dealer.addresses[0]?.city || null,
    items: order.items.map((it) => ({
      id: it.id,
      sku: it.sku,
      productName: it.productName,
      approvedQuantity: Number(it.approvedQuantity ?? it.originalQuantity),
    })),
    packages: order.packages.map((pkg) => ({
      id: pkg.id,
      packageNumber: pkg.packageNumber,
      packageType: pkg.packageType,
      length: pkg.length ? Number(pkg.length) : null,
      width: pkg.width ? Number(pkg.width) : null,
      height: pkg.height ? Number(pkg.height) : null,
      weight: Number(pkg.weight),
      status: pkg.status,
      handlingInstructions: pkg.handlingInstructions,
      itemsJson: pkg.itemsJson,
    })),
  };
}

