import "server-only";

import { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  TransitionActor,
  transitionOrderStatusInTransaction,
} from "@/modules/orders/order-transition.service";
import { sendWorkflowNotification } from "@/services/notification.service";

async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  sellerId: string,
  entityType: string,
  prefix: string,
) {
  const sequence = await tx.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId, entityType } },
    update: { lastNumber: { increment: 1 } },
    create: { sellerId, entityType, prefix, lastNumber: 1, padLength: 5 },
  });

  return `${sequence.prefix}-${String(sequence.lastNumber).padStart(sequence.padLength, "0")}`;
}

export async function executeOrderWorkflowAction(input: {
  sellerId: string;
  orderId: string;
  targetStatus: OrderStatus;
  actor: TransitionActor;
  assignedWarehouseUserId?: string;
  reason?: string;
}) {
  const result = await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: input.orderId, sellerId: input.sellerId },
        include: {
          items: true,
          pickLists: { orderBy: { createdAt: "desc" }, take: 1, include: { exceptions: true, items: true } },
          proformaInvoices: { orderBy: { createdAt: "desc" }, take: 1 },
          finalInvoices: { orderBy: { createdAt: "desc" }, take: 1 },
          dealer: true,
          seller: { select: { slug: true } },
        },
      });

      if (!order) throw new Error("ORDER_NOT_FOUND");

      if (input.targetStatus === "PROFORMA_INVOICE_GENERATED" && !order.proformaInvoices[0]) {
        const number = await nextDocumentNumber(tx, input.sellerId, "PROFORMA", "PI");
        await tx.proformaInvoice.create({
          data: {
            sellerId: input.sellerId,
            orderId: order.id,
            proformaNumber: number,
            status: "GENERATED",
            subtotal: order.subtotal,
            discountTotal: order.discountTotal,
            taxTotal: order.taxTotal,
            freightTotal: order.freightTotal,
            grandTotal: order.grandTotal,
            paymentTerms: "Standard B2B Terms",
            generatedById: input.actor.userId,
            remarks: input.reason || "Proforma Invoice created from approved order line items.",
            items: {
              create: order.items
                .filter((item) => item.status !== "REMOVED")
                .map((item) => ({
                  sellerId: input.sellerId,
                  orderItemId: item.id,
                  productId: item.productId,
                  variantId: item.variantId,
                  sku: item.sku,
                  description: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`,
                  quantity: item.approvedQuantity ?? item.originalQuantity,
                  unitPrice: item.dealerPrice,
                  discountAmount: item.discountAmount,
                  taxAmount: item.taxAmount,
                  lineTotal: item.lineTotal,
                })),
            },
          },
        });
      }

      if (input.targetStatus === "PROFORMA_INVOICE_CONFIRMED" && order.proformaInvoices[0]?.status !== "CONFIRMED") {
        await tx.proformaInvoice.update({
          where: { id: order.proformaInvoices[0].id },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
            confirmedById: input.actor.userId,
          },
        });
      }

      if (input.targetStatus === "READY_FOR_WAREHOUSE" && order.proformaInvoices[0]?.status !== "CONFIRMED") {
        if (order.proformaInvoices[0]) {
          await tx.proformaInvoice.update({
            where: { id: order.proformaInvoices[0].id },
            data: {
              status: "CONFIRMED",
              confirmedAt: new Date(),
              confirmedById: input.actor.userId,
            },
          });
        }
      }

      if (["READY_FOR_WAREHOUSE", "PICK_LIST_GENERATED", "PICKING_IN_PROGRESS", "PICK_LIST_COMPLETED", "FINAL_INVOICE_ISSUED"].includes(input.targetStatus)) {
        const pickList = order.pickLists[0];
        if (!pickList) {
          const number = await nextDocumentNumber(tx, input.sellerId, "PICK_LIST", "PL");
          let defaultWarehouse = await tx.warehouse.findFirst({
            where: { sellerId: input.sellerId, isActive: true },
            select: { id: true },
          });
          if (!defaultWarehouse) {
            defaultWarehouse = await tx.warehouse.findFirst({
              where: { sellerId: input.sellerId },
              select: { id: true },
            });
          }
          if (!defaultWarehouse) {
            defaultWarehouse = await tx.warehouse.create({
              data: {
                sellerId: input.sellerId,
                code: "WH-MAIN",
                name: "Main Central Warehouse",
                isActive: true,
              },
              select: { id: true },
            });
          }

          if (defaultWarehouse) {
            const isCompleted = input.targetStatus === "PICK_LIST_COMPLETED" || input.targetStatus === "FINAL_INVOICE_ISSUED";
            const assignedPickerId = input.assignedWarehouseUserId || (isCompleted ? input.actor.userId : null);

            await tx.pickList.create({
              data: {
                sellerId: input.sellerId,
                orderId: order.id,
                warehouseId: defaultWarehouse.id,
                pickListNumber: number,
                status: isCompleted ? "COMPLETED" : (assignedPickerId ? "ASSIGNED" : "GENERATED"),
                assignedToId: assignedPickerId,
                pickerId: assignedPickerId,
                completedAt: isCompleted ? new Date() : null,
                completedById: isCompleted ? input.actor.userId : null,
                notes: "Generated for warehouse fulfillment and picking",
                items: {
                  create: order.items
                    .filter((item) => item.status !== "REMOVED")
                    .map((item) => ({
                      sellerId: input.sellerId,
                      productId: item.productId,
                      variantId: item.variantId,
                      sku: item.sku,
                      approvedQuantity: item.approvedQuantity ?? item.originalQuantity,
                      pickedQuantity: item.approvedQuantity ?? item.originalQuantity,
                    })),
                },
              },
              include: { items: true, exceptions: true },
            });
          }
        } else if (pickList.status !== "COMPLETED" && (input.targetStatus === "PICK_LIST_COMPLETED" || input.targetStatus === "FINAL_INVOICE_ISSUED")) {
          await tx.pickList.update({
            where: { id: pickList.id },
            data: { status: "COMPLETED", completedAt: new Date(), completedById: input.actor.userId },
          });
        }
      }

      if (input.targetStatus === "FINAL_INVOICE_ISSUED") {
        const pickList = order.pickLists[0];
        if (!pickList || pickList.status !== "COMPLETED" || pickList.exceptions.length) throw new Error("PICK_LIST_NOT_READY");
        const number = await nextDocumentNumber(tx, input.sellerId, "FINAL_INVOICE", "INV");
        const invoiceItems = pickList.items.map((picked) => {
          const source = order.items.find((item) => item.variantId === picked.variantId || item.sku === picked.sku);
          if (!source) throw new Error("ORDER_ITEM_NOT_FOUND");
          const quantity = Number(picked.pickedQuantity);
          const origQty = Number(source.approvedQuantity ?? source.originalQuantity) || 1;
          const ratio = quantity / origQty;
          const unitPrice = Number(source.dealerPrice);
          const discountAmount = Number(source.discountAmount) * ratio;
          const taxAmount = Number(source.taxAmount) * ratio;
          const lineTotal = Number(source.lineTotal) * ratio;

          return {
            sellerId: input.sellerId,
            orderItemId: source.id,
            productId: source.productId,
            variantId: source.variantId,
            sku: source.sku,
            description: source.productName,
            quantity: picked.pickedQuantity,
            unitPrice: source.dealerPrice,
            discountAmount: new Prisma.Decimal(discountAmount),
            taxAmount: new Prisma.Decimal(taxAmount),
            lineTotal: new Prisma.Decimal(lineTotal),
          };
        });
        const subtotal = invoiceItems.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
        const discountTotal = invoiceItems.reduce((sum, item) => sum + Number(item.discountAmount), 0);
        const taxTotal = invoiceItems.reduce((sum, item) => sum + Number(item.taxAmount), 0);
        const freightTotal = Number(order.freightTotal) || 0;
        const grandTotal = Number((subtotal - discountTotal + taxTotal + freightTotal).toFixed(2));

        await tx.finalInvoice.create({
          data: {
            sellerId: input.sellerId,
            orderId: order.id,
            invoiceNumber: number,
            status: "ISSUED",
            subtotal: new Prisma.Decimal(subtotal),
            discountTotal: new Prisma.Decimal(discountTotal),
            taxTotal: new Prisma.Decimal(taxTotal),
            freightTotal: order.freightTotal,
            grandTotal: new Prisma.Decimal(grandTotal),
            outstandingAmount: new Prisma.Decimal(grandTotal),
            generatedById: input.actor.userId,
            items: { create: invoiceItems },
          },
        });
      }

      const updated = await transitionOrderStatusInTransaction(tx, input);
      return { updated, order };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  // Dispatch cross-role notifications
  const sellerSlug = result.order.seller?.slug || "bageshwari";
  const orderNumber = result.order.orderNumber;
  const orderId = result.order.id;

  if (input.targetStatus === "PICK_LIST_COMPLETED") {
    // Notify Accounts for Final Tax Invoice issuance
    await sendWorkflowNotification({
      sellerId: input.sellerId,
      targetRoles: ["ACCOUNTANT", "ACCOUNTS_MANAGER", "ADMIN", "SUPER_ADMIN"],
      title: `Picking Complete: ${orderNumber}`,
      message: `Pick list for order ${orderNumber} has been completed. Final Tax Invoice can now be issued.`,
      linkUrl: `/s/${sellerSlug}/admin/orders/${orderId}`,
      excludeUserId: input.actor.userId,
    });
  } else if (input.targetStatus === "FINAL_INVOICE_ISSUED") {
    // Notify Dealer & Dispatch
    await Promise.all([
      sendWorkflowNotification({
        sellerId: input.sellerId,
        targetDealerId: result.order.dealerId,
        title: `Tax Invoice Issued: ${orderNumber}`,
        message: `Final VAT Tax Invoice has been issued for order ${orderNumber}.`,
        linkUrl: `/dealer/orders/${orderId}`,
        excludeUserId: input.actor.userId,
      }),
      sendWorkflowNotification({
        sellerId: input.sellerId,
        targetRoles: ["DISPATCH_USER", "LOGISTICS_MANAGER", "ADMIN"],
        title: `Invoice Ready for Dispatch: ${orderNumber}`,
        message: `Final invoice issued for ${orderNumber}. Ready for dispatch challan & transport.`,
        linkUrl: `/s/${sellerSlug}/admin/dispatch`,
        excludeUserId: input.actor.userId,
      }),
    ]);
  } else if (input.targetStatus === "SHIPPED") {
    // Notify Dealer with complete commercial and logistics document access
    await Promise.all([
      sendWorkflowNotification({
        sellerId: input.sellerId,
        targetDealerId: result.order.dealerId,
        title: `Order Dispatched & Shipped: ${orderNumber}`,
        message: `Your order ${orderNumber} has been dispatched from Bageshwari Central Warehouse. Delivery Challan, Tax Invoice, Packing List, and Carton Labels are ready for download.`,
        linkUrl: `/dealer/orders/${orderId}`,
        excludeUserId: input.actor.userId,
      }),
      sendWorkflowNotification({
        sellerId: input.sellerId,
        targetRoles: ["ADMIN", "SUPER_ADMIN", "SALES_MANAGER", "ACCOUNTANT"],
        title: `Order Dispatched: ${orderNumber}`,
        message: `Order ${orderNumber} for ${result.order.dealer.legalName} has been dispatched with delivery challan.`,
        linkUrl: `/s/${sellerSlug}/admin/dispatch`,
        excludeUserId: input.actor.userId,
      }),
    ]);
  } else if (input.targetStatus === "COMPLETED") {
    // Notify Dealer & Accounts
    await Promise.all([
      sendWorkflowNotification({
        sellerId: input.sellerId,
        targetDealerId: result.order.dealerId,
        title: `Order Delivered: ${orderNumber}`,
        message: `Your order ${orderNumber} has been marked as delivered and completed.`,
        linkUrl: `/dealer/orders/${orderId}`,
        excludeUserId: input.actor.userId,
      }),
      sendWorkflowNotification({
        sellerId: input.sellerId,
        targetRoles: ["ACCOUNTANT", "ACCOUNTS_MANAGER", "ADMIN"],
        title: `Order Completed: ${orderNumber}`,
        message: `Order ${orderNumber} for ${result.order.dealer.legalName} has been successfully closed.`,
        linkUrl: `/s/${sellerSlug}/admin/orders/${orderId}`,
        excludeUserId: input.actor.userId,
      }),
    ]);
  }

  return result.updated;
}

/**
 * 1. Dealer Re-Confirmation Function
 */
export async function dealerConfirmOrder(input: {
  sellerId: string;
  orderId: string;
  method: PaymentMethod | "CREDIT" | "CHEQUE" | "CASH" | "ONLINE" | "BANK_TRANSFER" | "MOBILE_PAYMENT" | "OTHER";
  transactionRef?: string;
  remarks?: string;
  actor: TransitionActor;
}) {
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, sellerId: input.sellerId },
      include: {
        dealer: true,
        seller: { select: { slug: true } },
        revisions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!order) throw new Error("ORDER_NOT_FOUND");

    const latestRevision = order.revisions[0];

    // Record Dealer Confirmation
    await tx.dealerConfirmation.create({
      data: {
        sellerId: input.sellerId,
        orderId: order.id,
        dealerId: order.dealerId,
        revisionId: latestRevision?.id || null,
        decision: "CONFIRMED",
        remarks: input.remarks || `Confirmed by dealer with payment preference: ${input.method}`,
        confirmedById: input.actor.userId,
        confirmedAt: new Date(),
      },
    });

    // If there was a pending revision, update its status
    if (latestRevision && latestRevision.status === "SENT_TO_DEALER") {
      await tx.orderRevision.update({
        where: { id: latestRevision.id },
        data: {
          status: "DEALER_CONFIRMED",
          dealerRespondedAt: new Date(),
        },
      });
    }

    // Record Pending Payment Intent
    const paymentNumber = await nextDocumentNumber(tx, input.sellerId, "PAYMENT_RECEIPT", "REC");
    await tx.payment.create({
      data: {
        sellerId: input.sellerId,
        orderId: order.id,
        paymentNumber,
        method: input.method as PaymentMethod,
        status: "PENDING",
        amount: order.grandTotal,
        transactionRef: input.transactionRef || undefined,
        remarks: input.remarks || `Dealer selected ${input.method} on order confirmation`,
        recordedById: input.actor.userId,
      },
    });

    // Transition Order to FINAL_ORDER_CONFIRMED
    if (["WAITING_FOR_DEALER_CONFIRMATION", "DEALER_CHANGE_REQUESTED", "PENDING_ACCOUNTS_REVIEW", "ACCOUNTS_REVIEW_IN_PROGRESS"].includes(order.status)) {
      await transitionOrderStatusInTransaction(tx, {
        sellerId: input.sellerId,
        orderId: order.id,
        targetStatus: "FINAL_ORDER_CONFIRMED",
        actor: input.actor,
        reason: `Dealer accepted order revision (Payment terms: ${input.method}${input.transactionRef ? `, Ref: ${input.transactionRef}` : ""}). Ready for Accounts payment verification.`,
      });
    }

    return tx.order.findUnique({
      where: { id: order.id },
      include: {
        confirmations: true,
        payments: true,
        revisions: true,
        dealer: true,
        seller: { select: { slug: true } },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (updatedOrder) {
    const sellerSlug = updatedOrder.seller?.slug || "bageshwari";
    // Notify Accounts team & Admins
    await sendWorkflowNotification({
      sellerId: input.sellerId,
      targetRoles: ["ACCOUNTANT", "ACCOUNTS_MANAGER", "ADMIN", "SUPER_ADMIN", "SALES_MANAGER"],
      title: `Order Re-Confirmed: ${updatedOrder.orderNumber}`,
      message: `${updatedOrder.dealer.tradingName || updatedOrder.dealer.legalName} accepted revised order ${updatedOrder.orderNumber} (Settlement: ${input.method}). Ready for payment verification & Proforma.`,
      linkUrl: `/s/${sellerSlug}/admin/orders/${updatedOrder.id}`,
      excludeUserId: input.actor.userId,
    });
  }

  return updatedOrder;
}

/**
 * 2. Accounts Payment Verification & Release to Warehouse
 */
export async function confirmPaymentAndAdvancePipeline(input: {
  sellerId: string;
  orderId: string;
  method: PaymentMethod | "CREDIT" | "CHEQUE" | "CASH" | "ONLINE" | "BANK_TRANSFER" | "MOBILE_PAYMENT" | "OTHER";
  amount?: number;
  transactionRef?: string;
  remarks?: string;
  actor: TransitionActor;
}) {
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, sellerId: input.sellerId },
      include: {
        items: true,
        proformaInvoices: { orderBy: { createdAt: "desc" }, take: 1 },
        dealer: { include: { creditProfile: true } },
        seller: { select: { slug: true } },
      },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");

    const amount = input.amount ?? Number(order.grandTotal);

    // 1. Check if there is already a PENDING payment created during dealer confirmation
    const existingPendingPayment = await tx.payment.findFirst({
      where: { orderId: order.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (existingPendingPayment) {
      await tx.payment.update({
        where: { id: existingPendingPayment.id },
        data: {
          method: input.method as PaymentMethod,
          status: "CONFIRMED",
          amount: new Prisma.Decimal(amount),
          transactionRef: input.transactionRef || existingPendingPayment.transactionRef || `${input.method}-PAYMENT`,
          remarks: input.remarks || `Payment verified by Accounts: ${input.method}`,
          verifiedById: input.actor.userId,
          verifiedAt: new Date(),
        },
      });
    } else {
      const paymentNumber = await nextDocumentNumber(tx, input.sellerId, "PAYMENT_RECEIPT", "REC");
      await tx.payment.create({
        data: {
          sellerId: input.sellerId,
          orderId: order.id,
          paymentNumber,
          method: input.method as PaymentMethod,
          status: "CONFIRMED",
          amount: new Prisma.Decimal(amount),
          transactionRef: input.transactionRef || `${input.method}-PAYMENT`,
          remarks: input.remarks || `Payment verified by Accounts: ${input.method}`,
          recordedById: input.actor.userId,
          verifiedById: input.actor.userId,
          verifiedAt: new Date(),
        },
      });
    }

    // 2. If Credit, record or update Credit Approval
    if (input.method === "CREDIT") {
      const creditProfile = order.dealer.creditProfile;
      const existingCreditApproval = await tx.creditApproval.findFirst({
        where: { orderId: order.id },
      });

      if (existingCreditApproval) {
        await tx.creditApproval.update({
          where: { id: existingCreditApproval.id },
          data: {
            status: "APPROVED",
            approvedAmount: new Prisma.Decimal(amount),
            approvedById: input.actor.userId,
            approvedAt: new Date(),
            remarks: input.remarks || "Credit terms approved by accounts based on dealer credit limit",
          },
        });
      } else {
        await tx.creditApproval.create({
          data: {
            sellerId: input.sellerId,
            orderId: order.id,
            status: "APPROVED",
            requestedAmount: new Prisma.Decimal(amount),
            approvedAmount: new Prisma.Decimal(amount),
            creditPeriodDays: creditProfile?.creditPeriodDays || 30,
            dueDate: new Date(Date.now() + (creditProfile?.creditPeriodDays || 30) * 86_400_000),
            approvedById: input.actor.userId,
            approvedAt: new Date(),
            remarks: input.remarks || "Credit terms approved by accounts based on dealer credit limit",
          },
        });
      }
    }

    let currentStatus: OrderStatus = order.status;

    // 3. Step: Progress to FINAL_ORDER_CONFIRMED if not already there
    if (["PENDING_ACCOUNTS_REVIEW", "ACCOUNTS_REVIEW_IN_PROGRESS", "WAITING_FOR_DEALER_CONFIRMATION", "DEALER_CHANGE_REQUESTED"].includes(currentStatus)) {
      await transitionOrderStatusInTransaction(tx, {
        sellerId: input.sellerId,
        orderId: order.id,
        targetStatus: "FINAL_ORDER_CONFIRMED",
        actor: input.actor,
        reason: "Order confirmed with agreed payment mode.",
      });
      currentStatus = "FINAL_ORDER_CONFIRMED";
    }

    // 4. Step: Progress to PROFORMA_INVOICE_GENERATED if in FINAL_ORDER_CONFIRMED
    if (currentStatus === "FINAL_ORDER_CONFIRMED") {
      let proforma = order.proformaInvoices[0];
      if (!proforma) {
        const number = await nextDocumentNumber(tx, input.sellerId, "PROFORMA", "PI");
        proforma = await tx.proformaInvoice.create({
          data: {
            sellerId: input.sellerId,
            orderId: order.id,
            proformaNumber: number,
            status: "CONFIRMED",
            confirmedAt: new Date(),
            confirmedById: input.actor.userId,
            subtotal: order.subtotal,
            discountTotal: order.discountTotal,
            taxTotal: order.taxTotal,
            freightTotal: order.freightTotal,
            grandTotal: order.grandTotal,
            paymentTerms: `Confirmed via ${input.method}${input.transactionRef ? ` (Ref: ${input.transactionRef})` : ""}`,
            generatedById: input.actor.userId,
            remarks: input.remarks || "Proforma Invoice confirmed upon payment verification.",
            items: {
              create: order.items
                .filter((item) => item.status !== "REMOVED")
                .map((item) => ({
                  sellerId: input.sellerId,
                  orderItemId: item.id,
                  productId: item.productId,
                  variantId: item.variantId,
                  sku: item.sku,
                  description: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`,
                  quantity: item.approvedQuantity ?? item.originalQuantity,
                  unitPrice: item.dealerPrice,
                  discountAmount: item.discountAmount,
                  taxAmount: item.taxAmount,
                  lineTotal: item.lineTotal,
                })),
            },
          },
        });
      } else if (proforma.status !== "CONFIRMED") {
        await tx.proformaInvoice.update({
          where: { id: proforma.id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), confirmedById: input.actor.userId },
        });
      }

      await transitionOrderStatusInTransaction(tx, {
        sellerId: input.sellerId,
        orderId: order.id,
        targetStatus: "PROFORMA_INVOICE_GENERATED",
        actor: input.actor,
        reason: "Proforma Invoice generated.",
      });
      currentStatus = "PROFORMA_INVOICE_GENERATED";
    }

    // 5. Step: Progress to PROFORMA_INVOICE_CONFIRMED if in PROFORMA_INVOICE_GENERATED
    if (currentStatus === "PROFORMA_INVOICE_GENERATED") {
      await transitionOrderStatusInTransaction(tx, {
        sellerId: input.sellerId,
        orderId: order.id,
        targetStatus: "PROFORMA_INVOICE_CONFIRMED",
        actor: input.actor,
        reason: "Proforma Invoice confirmed.",
      });
      currentStatus = "PROFORMA_INVOICE_CONFIRMED";
    }

    // 6. Step: Progress to READY_FOR_WAREHOUSE if in PROFORMA_INVOICE_CONFIRMED
    if (currentStatus === "PROFORMA_INVOICE_CONFIRMED") {
      await transitionOrderStatusInTransaction(tx, {
        sellerId: input.sellerId,
        orderId: order.id,
        targetStatus: "READY_FOR_WAREHOUSE",
        actor: input.actor,
        reason: "Payment verified by Accounts. Released to warehouse for fulfillment.",
      });
    }

    return tx.order.findUnique({
      where: { id: order.id },
      include: {
        proformaInvoices: true,
        payments: true,
        creditApprovals: true,
        dealer: true,
        seller: { select: { slug: true } },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (updatedOrder) {
    const sellerSlug = updatedOrder.seller?.slug || "bageshwari";
    // 1. Notify Warehouse team for picking
    await sendWorkflowNotification({
      sellerId: input.sellerId,
      targetRoles: ["WAREHOUSE_MANAGER", "WAREHOUSE_USER", "WAREHOUSE_PICKER", "ADMIN"],
      title: `Order Ready for Warehouse: ${updatedOrder.orderNumber}`,
      message: `Order ${updatedOrder.orderNumber} for ${updatedOrder.dealer.legalName} released to warehouse. Pick list ready for fulfillment.`,
      linkUrl: `/s/${sellerSlug}/admin/warehouse`,
      excludeUserId: input.actor.userId,
    });

    // 2. Notify Dealer
    await sendWorkflowNotification({
      sellerId: input.sellerId,
      targetDealerId: updatedOrder.dealerId,
      title: `Payment Confirmed: ${updatedOrder.orderNumber}`,
      message: `Your payment was verified by Accounts. Proforma invoice confirmed and order released to warehouse fulfillment.`,
      linkUrl: `/dealer/orders/${updatedOrder.id}`,
      excludeUserId: input.actor.userId,
    });
  }

  // Serialize Prisma Decimals to Numbers for clean Client Component / API Response handling
  return JSON.parse(
    JSON.stringify(updatedOrder, (key, value) =>
      typeof value === "object" && value !== null && "d" in value ? Number(value) : value
    )
  );
}
