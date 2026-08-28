"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calculator, CreditCard } from "lucide-react";
import { OrderRevisionDialog, type RevisionItemState } from "@/components/admin/order-revision-dialog";
import { PaymentConfirmationDialog } from "@/components/admin/payment-confirmation-dialog";

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
  };
  sellerSlug: string;
  userRoles?: string[];
  userPermissions?: string[];
}

export function AdminOrderActions({
  order,
  sellerSlug,
  userRoles = [],
  userPermissions = [],
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

  // Role & Permission Checks
  const isPrivileged = userRoles.some((r) =>
    ["SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF"].includes(r)
  );

  const canReviseRole =
    isPrivileged ||
    userRoles.some((r) => ["ACCOUNTANT", "ACCOUNTS_MANAGER", "FINANCE"].includes(r)) ||
    userPermissions.includes("order.revise") ||
    userPermissions.includes("order.review");

  const canPayRole =
    isPrivileged ||
    userRoles.some((r) => ["ACCOUNTANT", "ACCOUNTS_MANAGER", "FINANCE"].includes(r)) ||
    userPermissions.includes("payment.record");

  const canRevise =
    canReviseRole &&
    [
      "PENDING_ACCOUNTS_REVIEW",
      "ACCOUNTS_REVIEW_IN_PROGRESS",
      "WAITING_FOR_DEALER_CONFIRMATION",
      "DEALER_CHANGE_REQUESTED",
    ].includes(order.status);

  const canConfirmPayment =
    canPayRole &&
    [
      "WAITING_FOR_DEALER_CONFIRMATION",
      "FINAL_ORDER_CONFIRMED",
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

        {/* Payment Confirmation & Direct Warehouse Release */}
        {canConfirmPayment && (
          <Button
            size="sm"
            onClick={() => setIsPaymentOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Confirm Payment & Release to Warehouse
          </Button>
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
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
