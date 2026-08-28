import "server-only";
import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { transitionOrderStatusInTransaction, type TransitionActor } from "@/modules/orders/order-transition.service";
import { nextDocumentNumber } from "@/services/number-sequence.service";

export async function recordAndVerifyPayment(input: { sellerId: string; orderId: string; invoiceId: string; method: PaymentMethod; amount: number; transactionRef?: string; remarks?: string; actor: TransitionActor }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("PAYMENT_AMOUNT_INVALID");
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.finalInvoice.findFirst({ where: { id: input.invoiceId, sellerId: input.sellerId, orderId: input.orderId } });
    if (!invoice) throw new Error("INVOICE_NOT_FOUND");
    const order = await tx.order.findFirst({ where: { id: input.orderId, sellerId: input.sellerId } });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.status === "FINAL_INVOICE_ISSUED") await transitionOrderStatusInTransaction(tx, { sellerId: input.sellerId, orderId: order.id, targetStatus: "PAYMENT_PENDING", actor: input.actor, reason: "Payment received for verification" });
    const paymentNumber = await nextDocumentNumber(tx, input.sellerId, "PAYMENT_RECEIPT", "REC");
    const payment = await tx.payment.create({ data: { sellerId: input.sellerId, orderId: order.id, finalInvoiceId: invoice.id, paymentNumber, method: input.method, status: "CONFIRMED", amount: input.amount, transactionRef: input.transactionRef, remarks: input.remarks, recordedById: input.actor.userId, verifiedById: input.actor.userId, verifiedAt: new Date() } });
    const paidAmount = Math.min(Number(invoice.grandTotal), Number(invoice.paidAmount) + input.amount);
    const outstandingAmount = Math.max(0, Number(invoice.grandTotal) - paidAmount);
    const invoiceStatus = outstandingAmount === 0 ? "PAID" : "PARTIALLY_PAID";
    await tx.finalInvoice.update({ where: { id: invoice.id }, data: { paidAmount: new Prisma.Decimal(paidAmount), outstandingAmount: new Prisma.Decimal(outstandingAmount), status: invoiceStatus } });
    await transitionOrderStatusInTransaction(tx, { sellerId: input.sellerId, orderId: order.id, targetStatus: outstandingAmount === 0 ? "PAID" : "PARTIALLY_PAID", actor: input.actor, reason: `Payment ${paymentNumber} verified` });
    await tx.auditLog.create({ data: { sellerId: input.sellerId, userId: input.actor.userId, action: "payment.verified", entity: "Payment", entityId: payment.id, newValue: JSON.stringify({ paymentNumber, amount: input.amount, outstandingAmount }), severity: "MEDIUM" } });
    return payment;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function requestCredit(input: { sellerId: string; orderId: string; amount: number; actor: TransitionActor }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("CREDIT_AMOUNT_INVALID");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: input.orderId, sellerId: input.sellerId }, include: { dealer: { include: { creditProfile: true } } } });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    const profile = order.dealer.creditProfile;
    if (!profile?.creditEligible || Number(profile.availableCredit) < input.amount) throw new Error("CREDIT_NOT_AVAILABLE");
    const approval = await tx.creditApproval.create({ data: { sellerId: input.sellerId, orderId: order.id, status: "PENDING", requestedAmount: input.amount } });
    await transitionOrderStatusInTransaction(tx, { sellerId: input.sellerId, orderId: order.id, targetStatus: "CREDIT_PENDING", actor: input.actor, reason: "Credit approval requested" });
    return approval;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function approveCredit(input: { sellerId: string; creditApprovalId: string; amount: number; periodDays: number; actor: TransitionActor }) {
  return prisma.$transaction(async (tx) => {
    const approval = await tx.creditApproval.findFirst({ where: { id: input.creditApprovalId, sellerId: input.sellerId, status: "PENDING" } });
    if (!approval) throw new Error("CREDIT_REQUEST_NOT_FOUND");
    if (input.amount <= 0 || input.amount > Number(approval.requestedAmount)) throw new Error("CREDIT_AMOUNT_INVALID");
    const updated = await tx.creditApproval.update({ where: { id: approval.id }, data: { status: "APPROVED", approvedAmount: input.amount, creditPeriodDays: input.periodDays, dueDate: new Date(Date.now() + input.periodDays * 86_400_000), approvedById: input.actor.userId, approvedAt: new Date() } });
    await transitionOrderStatusInTransaction(tx, { sellerId: input.sellerId, orderId: approval.orderId, targetStatus: "CREDIT_APPROVED", actor: input.actor, reason: "Credit approved" });
    await tx.auditLog.create({ data: { sellerId: input.sellerId, userId: input.actor.userId, action: "credit.approved", entity: "CreditApproval", entityId: approval.id, newValue: JSON.stringify({ amount: input.amount, periodDays: input.periodDays }), severity: "MEDIUM" } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
