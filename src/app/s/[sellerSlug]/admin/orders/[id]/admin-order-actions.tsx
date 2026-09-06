"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calculator, CreditCard, ShieldCheck, Clock } from "lucide-react";
import { OrderRevisionDialog, type RevisionItemState } from "@/components/admin/order-revision-dialog";
import { PaymentConfirmationDialog, type SubmittedPaymentInfo } from "@/components/admin/payment-confirmation-dialog";

export interface AdminOrderActionItem {
  id: string;
  sku: string;
  productName: string;
  product?: { unitCode?: string | null } | null;
  originalQuantity: number;
  approvedQuantity?: number | null;
  dealerPrice: number;
  discountAmount?: number | null;
  accountsRemarks?: string | null;
}

export interface AdminOrderActionPayment {
  id: string;
  paymentNumber: string;
  method: string;
  status: string;
  amount: number;
  transactionRef?: string | null;
  remarks?: string | null;
  createdAt: string | Date;
}

export interface AdminOrderActionsProps {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    dealer: {
      tradingName?: string | null;
      legalName: string;
      code: string;
      creditProfile?: {
        availableCredit?: number | null;
      } | null;
    };
    items: AdminOrderActionItem[];
    payments?: AdminOrderActionPayment[];
  };
  sellerSlug: string;
  userRoles?: string[];
  userPermissions?: string[];
  warehouseStaff?: Array<{ id: string; name?: string | null; email: string }>;
}

export function AdminOrderActions({
  order,
  sellerSlug,
  userRoles = [],
  userPermissions = [],
  warehouseStaff = [],
}: AdminOrderActionsProps) {
  const router = useRouter();
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const initialItems: RevisionItemState[] = order.items.map((it) => ({
    orderItemId: it.id,
    sku: it.sku,
    productName: it.productName,
    unitCode: it.product?.unitCode || "PCS",
    originalQuantity: Number(it.originalQuantity),
    approvedQuantity: Number(it.approvedQuantity ?? it.originalQuantity),
    unitPrice: Number(it.dealerPrice),
    discountAmount: Number(it.discountAmount ?? 0),
    accountsRemarks: it.accountsRemarks || "",
  }));

  // Payments & Roles checks
  const pendingPayment = order.payments?.find((p) => p.status === "PENDING") || null;
  const isPaymentConfirmed = order.payments?.some((p) => p.status === "CONFIRMED") || false;

  const isPrivileged = userRoles.some((r) =>
    ["SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF"].includes(r)
  );

  const isAccounts =
    isPrivileged ||
    userRoles.some((r) => ["ACCOUNTANT", "ACCOUNTS_MANAGER", "FINANCE"].includes(r)) ||
    userPermissions.includes("payment.record") ||
    userPermissions.includes("order.confirm");

  const isSales =
    userRoles.some((r) => ["SALES_REP", "SALES_MANAGER"].includes(r)) ||
    userPermissions.includes("order.create");

  const canReviseRole =
    isPrivileged ||
    userRoles.some((r) => ["ACCOUNTANT", "ACCOUNTS_MANAGER", "FINANCE"].includes(r)) ||
    userPermissions.includes("order.revise") ||
    userPermissions.includes("order.review");

  const canRevise =
    canReviseRole &&
    [
      "PENDING_ACCOUNTS_REVIEW",
      "ACCOUNTS_REVIEW_IN_PROGRESS",
      "WAITING_FOR_DEALER_CONFIRMATION",
      "DEALER_CHANGE_REQUESTED",
    ].includes(order.status);

  const isProformaStage = [
    "PROFORMA_INVOICE_GENERATED",
    "PROFORMA_INVOICE_CONFIRMED",
  ].includes(order.status);

  const availableCredit = Number(order.dealer.creditProfile?.availableCredit ?? 500000);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Accountant Modify / Revise Button */}
        {canRevise && (
          <Button
            size="sm"
            onClick={() => setIsRevisionOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs"
          >
            <Calculator className="h-3.5 w-3.5 mr-1.5" /> Modify Order & Resend to Dealer
          </Button>
        )}

        {/* 1. If Dealer (or Sales) has submitted payment -> Accountant verifies & approves */}
        {isProformaStage && pendingPayment && isAccounts && (
          <Button
            size="sm"
            onClick={() => setIsPaymentOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm ring-2 ring-emerald-400/40"
          >
            <ShieldCheck className="h-4 w-4 mr-1.5 text-white" />
            Verify & Approve Payment ({pendingPayment.paymentNumber})
          </Button>
        )}

        {/* 2. If Dealer submitted payment and Sales views it */}
        {isProformaStage && pendingPayment && isSales && !isAccounts && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Payment Details Submitted ({pendingPayment.paymentNumber}) • Awaiting Accounts Verification</span>
          </div>
        )}

        {/* 3. If NO payment submitted yet and order is in Proforma stage */}
        {isProformaStage && !pendingPayment && !isPaymentConfirmed && (
          <>
            {isSales && !isAccounts && (
              <Button
                size="sm"
                onClick={() => setIsPaymentOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Record Payment (On Behalf of Dealer)
              </Button>
            )}
            {isAccounts && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Awaiting Payment Submission from Dealer / Sales</span>
              </div>
            )}
          </>
        )}
      </div>

      <OrderRevisionDialog
        orderId={order.id}
        orderNumber={order.orderNumber}
        initialItems={initialItems}
        isOpen={isRevisionOpen}
        onClose={() => setIsRevisionOpen(false)}
        onSuccess={() => router.refresh()}
      />

      <PaymentConfirmationDialog
        orderId={order.id}
        orderNumber={order.orderNumber}
        grandTotal={Number(order.grandTotal)}
        dealerName={order.dealer.tradingName || order.dealer.legalName}
        dealerCode={order.dealer.code}
        availableCredit={availableCredit}
        pendingPayment={pendingPayment}
        isSales={isSales && !isAccounts}
        warehouseStaff={warehouseStaff}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
