import "server-only";

import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING_ACCOUNTS_REVIEW", "CANCELLED"],
  PENDING_ACCOUNTS_REVIEW: [
    "ACCOUNTS_REVIEW_IN_PROGRESS",
    "WAITING_FOR_DEALER_CONFIRMATION",
    "FINAL_ORDER_CONFIRMED",
    "CANCELLED",
  ],
  ACCOUNTS_REVIEW_IN_PROGRESS: [
    "WAITING_FOR_DEALER_CONFIRMATION",
    "FINAL_ORDER_CONFIRMED",
    "CANCELLED",
  ],
  WAITING_FOR_DEALER_CONFIRMATION: [
    "FINAL_ORDER_CONFIRMED",
    "DEALER_CHANGE_REQUESTED",
    "CANCELLED",
  ],
  DEALER_CHANGE_REQUESTED: [
    "ACCOUNTS_REVIEW_IN_PROGRESS",
    "WAITING_FOR_DEALER_CONFIRMATION",
    "FINAL_ORDER_CONFIRMED",
    "CANCELLED",
  ],
  FINAL_ORDER_CONFIRMED: ["PROFORMA_INVOICE_GENERATED", "CANCELLED"],
  PROFORMA_INVOICE_GENERATED: ["PROFORMA_INVOICE_CONFIRMED", "CANCELLED"],
  PROFORMA_INVOICE_CONFIRMED: ["READY_FOR_WAREHOUSE", "CANCELLED"],
  READY_FOR_WAREHOUSE: [
    "PICK_LIST_GENERATED",
    "PICKING_IN_PROGRESS",
    "PICKING_COMPLETED",
    "PICK_LIST_COMPLETED",
    "CANCELLED",
  ],
  PICK_LIST_GENERATED: [
    "PICKING_IN_PROGRESS",
    "PICKING_COMPLETED",
    "PICK_LIST_COMPLETED",
    "PICKING_EXCEPTION",
    "CANCELLED",
  ],
  PICKING_IN_PROGRESS: [
    "PICKING_COMPLETED",
    "PICK_LIST_COMPLETED",
    "PARTIALLY_PICKED",
    "PICKING_EXCEPTION",
    "CANCELLED",
  ],
  PARTIALLY_PICKED: ["PICKING_IN_PROGRESS", "PICKING_COMPLETED", "PICKING_EXCEPTION", "CANCELLED"],
  PICKING_COMPLETED: ["PICK_LIST_COMPLETED", "CANCELLED"],
  PICKING_EXCEPTION: ["PICKING_IN_PROGRESS", "PICKING_COMPLETED", "CANCELLED"],
  PICK_LIST_COMPLETED: ["FINAL_INVOICE_ISSUED", "CANCELLED"],
  FINAL_INVOICE_ISSUED: [
    "PAYMENT_PENDING",
    "PAID",
    "CREDIT_PENDING",
    "CREDIT_APPROVED",
    "CANCELLED",
  ],
  PAYMENT_PENDING: ["PARTIALLY_PAID", "PAID", "PAYMENT_ON_HOLD", "CANCELLED"],
  PARTIALLY_PAID: ["PAID", "PAYMENT_ON_HOLD", "CANCELLED"],
  PAID: ["PACKING_IN_PROGRESS", "PACKED", "PACKED_AND_LABELLED", "CANCELLED"],
  CREDIT_PENDING: ["CREDIT_APPROVED", "PAYMENT_ON_HOLD", "CANCELLED"],
  CREDIT_APPROVED: ["PACKING_IN_PROGRESS", "PACKED", "PACKED_AND_LABELLED", "CANCELLED"],
  PAYMENT_ON_HOLD: ["PAYMENT_PENDING", "CREDIT_PENDING", "CANCELLED"],
  PAYMENT_OVERDUE: ["PARTIALLY_PAID", "PAID", "CANCELLED"],
  PACKING_IN_PROGRESS: ["PACKED", "PACKED_AND_LABELLED", "CANCELLED"],
  PACKED: ["PACKED_AND_LABELLED", "SHIPPED", "CANCELLED"],
  PACKED_AND_LABELLED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["IN_TRANSIT", "DELIVERED", "COMPLETED", "CANCELLED"],
  IN_TRANSIT: ["PARTIALLY_DELIVERED", "DELIVERED", "DELIVERY_FAILED", "COMPLETED", "RETURNED", "CANCELLED"],
  PARTIALLY_DELIVERED: ["DELIVERED", "DELIVERY_FAILED", "COMPLETED", "RETURNED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "RETURNED"],
  DELIVERY_FAILED: ["IN_TRANSIT", "RETURNED", "CANCELLED"],
  RETURNED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function isAllowedOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (allowedTransitions[from] || []).includes(to);
}

const transitionPermission: Partial<Record<OrderStatus, string>> = {
  PENDING_ACCOUNTS_REVIEW: "order.submit",
  ACCOUNTS_REVIEW_IN_PROGRESS: "order.review",
  WAITING_FOR_DEALER_CONFIRMATION: "order.revise",
  DEALER_CHANGE_REQUESTED: "order.confirm",
  FINAL_ORDER_CONFIRMED: "order.confirm",
  PROFORMA_INVOICE_GENERATED: "proforma.generate",
  PROFORMA_INVOICE_CONFIRMED: "proforma.confirm",
  READY_FOR_WAREHOUSE: "order.confirm",
  PICK_LIST_GENERATED: "picklist.generate",
  PICKING_IN_PROGRESS: "picklist.assign",
  PARTIALLY_PICKED: "picklist.complete",
  PICKING_COMPLETED: "picklist.complete",
  PICK_LIST_COMPLETED: "picklist.complete",
  FINAL_INVOICE_ISSUED: "invoice.generate",
  PAYMENT_PENDING: "payment.record",
  PARTIALLY_PAID: "payment.record",
  PAID: "payment.record",
  CREDIT_PENDING: "credit.approve",
  CREDIT_APPROVED: "credit.approve",
  PACKING_IN_PROGRESS: "packing.manage",
  PACKED: "packing.manage",
  PACKED_AND_LABELLED: "packing.manage",
  SHIPPED: "shipment.dispatch",
  IN_TRANSIT: "shipment.dispatch",
  DELIVERED: "delivery.update",
  COMPLETED: "order.confirm",
  CANCELLED: "order.cancel",
};

const rolePermissionsMap: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  PLATFORM_ADMIN: ["*"],
  SELLER_OWNER: ["*"],
  ADMIN: ["*"],
  STAFF: ["*"],
  ACCOUNTANT: [
    "order.submit", "order.review", "order.revise", "order.confirm",
    "proforma.generate", "proforma.confirm", "invoice.generate",
    "payment.record", "credit.approve"
  ],
  ACCOUNTS_MANAGER: [
    "order.submit", "order.review", "order.revise", "order.confirm",
    "proforma.generate", "proforma.confirm", "invoice.generate",
    "payment.record", "credit.approve"
  ],
  WAREHOUSE_MANAGER: [
    "order.review", "picklist.generate", "picklist.assign",
    "picklist.complete", "packing.manage"
  ],
  WAREHOUSE_USER: [
    "picklist.assign", "picklist.complete", "packing.manage"
  ],
  WAREHOUSE_PICKER: [
    "picklist.assign", "picklist.complete", "packing.manage"
  ],
  DISPATCH_USER: [
    "packing.manage", "shipment.dispatch", "delivery.update"
  ],
  LOGISTICS_MANAGER: [
    "packing.manage", "shipment.dispatch", "delivery.update"
  ],
  SALES_REP: [
    "order.submit", "order.confirm", "proforma.generate", "proforma.confirm"
  ],
  SALES_MANAGER: [
    "order.submit", "order.review", "order.confirm", "proforma.generate", "proforma.confirm"
  ],
  DEALER: [
    "order.submit", "order.confirm", "proforma.confirm"
  ],
  DEALER_USER: [
    "order.submit", "order.confirm", "proforma.confirm"
  ],
  DEALER_OWNER: [
    "order.submit", "order.confirm", "proforma.confirm"
  ],
};

export function isActorAuthorizedForTransition(actor: TransitionActor, targetStatus: OrderStatus): boolean {
  const permission = transitionPermission[targetStatus];
  if (!permission) return true;

  const actorRoles = actor.roles || [];
  const actorPermissions = actor.permissions || [];

  // Direct permission check
  if (actorPermissions.includes(permission) || actorPermissions.includes("*")) {
    return true;
  }

  // Role-based permission fallback
  for (const role of actorRoles) {
    const perms = rolePermissionsMap[role] || [];
    if (perms.includes("*") || perms.includes(permission)) {
      return true;
    }
  }

  return false;
}

export type TransitionActor = {
  userId: string;
  permissions: readonly string[];
  roles?: readonly string[];
};

export type TransitionOrderInput = {
  sellerId: string;
  orderId: string;
  targetStatus: OrderStatus;
  actor: TransitionActor;
  reason?: string;
};

export class OrderTransitionError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "OrderTransitionError";
  }
}

type OrderWithWorkflow = Prisma.OrderGetPayload<{
  include: {
    confirmations: true;
    proformaInvoices: true;
    pickLists: { include: { exceptions: true } };
    finalInvoices: true;
    payments: true;
    creditApprovals: true;
  };
}>;

export async function transitionOrderStatus(input: TransitionOrderInput) {
  return prisma.$transaction(
    (tx) => transitionOrderStatusInTransaction(tx, input),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function transitionOrderStatusInTransaction(
  tx: Prisma.TransactionClient,
  input: TransitionOrderInput,
) {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, sellerId: input.sellerId, deletedAt: null },
      include: {
        confirmations: { orderBy: { confirmedAt: "desc" }, take: 1 },
        proformaInvoices: { orderBy: { createdAt: "desc" }, take: 1 },
        pickLists: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { exceptions: { where: { status: { not: "RESOLVED" } } } },
        },
        finalInvoices: { orderBy: { createdAt: "desc" }, take: 1 },
        payments: { where: { status: "CONFIRMED" } },
        creditApprovals: { where: { status: "APPROVED" } },
      },
    });

    if (!order) throw new OrderTransitionError("Order not found.", "ORDER_NOT_FOUND");

    // Idempotent: If already in target status, return order cleanly without error
    if (order.status === input.targetStatus) {
      return order;
    }

    if (!isAllowedOrderTransition(order.status, input.targetStatus)) {
      throw new OrderTransitionError(
        `Transition from ${order.status} to ${input.targetStatus} is not allowed.`,
        "INVALID_TRANSITION",
      );
    }

    if (!isActorAuthorizedForTransition(input.actor, input.targetStatus)) {
      throw new OrderTransitionError("Permission denied.", "PERMISSION_DENIED");
    }

    assertBusinessPrerequisites(order, input.targetStatus);

    const update: Prisma.OrderUpdateInput = { status: input.targetStatus };
    if (input.targetStatus === "PENDING_ACCOUNTS_REVIEW") update.submittedAt = new Date();
    if (input.targetStatus === "FINAL_ORDER_CONFIRMED") {
      update.finalConfirmedAt = new Date();
      update.finalConfirmedBy = { connect: { id: input.actor.userId } };
    }

    const updated = await tx.order.update({ where: { id: order.id }, data: update });
    await tx.orderStatusHistory.create({
      data: {
        sellerId: input.sellerId,
        orderId: order.id,
        fromStatus: order.status,
        toStatus: input.targetStatus,
        changedById: input.actor.userId,
        remarks: input.reason?.trim() || null,
      },
    });
    await tx.auditLog.create({
      data: {
        sellerId: input.sellerId,
        userId: input.actor.userId,
        action: "order.status.transitioned",
        entity: "Order",
        entityId: order.id,
        oldValue: JSON.stringify({ status: order.status }),
        newValue: JSON.stringify({ status: input.targetStatus }),
        metadata: input.reason ? JSON.stringify({ reason: input.reason }) : null,
        severity: input.targetStatus === "CANCELLED" ? "HIGH" : "LOW",
      },
    });

    const dealerTargets = ["WAITING_FOR_DEALER_CONFIRMATION", "PROFORMA_INVOICE_GENERATED", "FINAL_INVOICE_ISSUED", "SHIPPED", "DELIVERED"] as const;
    let recipients: string[] = [];
    let linkUrl = `/admin/orders/${order.id}`;
    if (dealerTargets.includes(input.targetStatus as (typeof dealerTargets)[number])) {
      const memberships = await tx.userSellerMembership.findMany({ where: { sellerId: input.sellerId, dealerId: order.dealerId, status: "active" }, select: { userId: true } });
      recipients = memberships.map((membership) => membership.userId);
      linkUrl = `/dealer/orders/${order.id}`;
    } else {
      const roleCodes = input.targetStatus === "PENDING_ACCOUNTS_REVIEW"
        ? ["ACCOUNT_MANAGER", "ACCOUNTANT", "ACCOUNTS_MANAGER", "ACCOUNTS_USER"]
        : input.targetStatus === "READY_FOR_WAREHOUSE"
          ? ["WAREHOUSE_MANAGER", "WAREHOUSE_USER", "WAREHOUSE_PICKER"]
          : input.targetStatus === "PACKED_AND_LABELLED"
            ? ["DISPATCH_USER"]
            : [];
      if (roleCodes.length) {
        const userRoles = await tx.userRole.findMany({ where: { sellerId: input.sellerId, role: { code: { in: roleCodes } } }, select: { userId: true } });
        recipients = userRoles.map((role) => role.userId);
      }
    }
    const uniqueRecipients = [...new Set(recipients)].filter((userId) => userId !== input.actor.userId);
    if (uniqueRecipients.length) {
      await tx.notification.createMany({ data: uniqueRecipients.map((userId) => ({ sellerId: input.sellerId, userId, channel: "IN_APP", status: "PENDING", title: `Order ${order.orderNumber}`, message: `Order status changed to ${input.targetStatus}.`, linkUrl })) });
    }

    return updated;
}

function assertBusinessPrerequisites(
  order: OrderWithWorkflow,
  target: OrderStatus,
) {
  if (target === "PROFORMA_INVOICE_GENERATED" && !["FINAL_ORDER_CONFIRMED", "PENDING_ACCOUNTS_REVIEW", "WAITING_FOR_DEALER_CONFIRMATION"].includes(order.status)) {
    throw new OrderTransitionError("Order confirmation is required.", "FINAL_CONFIRMATION_REQUIRED");
  }
  if (target === "PROFORMA_INVOICE_CONFIRMED" && !order.proformaInvoices[0]) {
    throw new OrderTransitionError("A Proforma Invoice is required before confirmation.", "PROFORMA_REQUIRED");
  }
  if (target === "READY_FOR_WAREHOUSE" && !order.proformaInvoices[0]) {
    throw new OrderTransitionError("A Proforma Invoice is required before warehouse release.", "PROFORMA_REQUIRED");
  }
  if (["PICK_LIST_COMPLETED", "FINAL_INVOICE_ISSUED"].includes(target)) {
    const pickList = order.pickLists[0];
    if (!pickList || pickList.status !== "COMPLETED") {
      throw new OrderTransitionError("A completed Pick List is required.", "PICK_LIST_COMPLETION_REQUIRED");
    }
    if (pickList.exceptions.length > 0) {
      throw new OrderTransitionError("Unresolved picking exceptions block this action.", "PICKING_EXCEPTION_UNRESOLVED");
    }
  }
  if (target === "FINAL_INVOICE_ISSUED" && order.finalInvoices[0]?.status !== "ISSUED") {
    throw new OrderTransitionError("The Final Invoice must be issued from actual picked quantities first.", "FINAL_INVOICE_REQUIRED");
  }
  if (target === "PACKING_IN_PROGRESS" && order.payments.length === 0 && order.creditApprovals.length === 0) {
    throw new OrderTransitionError("Confirmed payment or approved credit is required.", "PAYMENT_OR_CREDIT_REQUIRED");
  }
}
