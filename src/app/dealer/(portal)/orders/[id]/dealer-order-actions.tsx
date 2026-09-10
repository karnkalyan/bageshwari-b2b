"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  QrCode,
  Banknote,
  FileCheck2,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Send,
  Clock,
  FileText,
  FileUp,
  Upload,
  Paperclip,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DealerOrderActionsProps {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  grandTotal: number;
  creditLimit?: number;
  availableCredit?: number;
  creditPeriodDays?: number;
  proforma?: {
    id: string;
    proformaNumber: string;
    grandTotal: number;
    status: string;
  } | null;
  latestRevisionRemarks?: string | null;
  hasSubmittedPayment?: boolean;
  pendingPayment?: {
    paymentNumber: string;
    method: string;
    amount: number;
    transactionRef?: string | null;
    receiptUrl?: string | null;
    createdAt: string | Date;
  } | null;
  rejectedPaymentRemarks?: string | null;
}

type PaymentOption = "CREDIT" | "ONLINE" | "CHEQUE" | "CASH" | "BANK_TRANSFER";

export function DealerOrderActions({
  orderId,
  orderNumber,
  orderStatus,
  grandTotal,
  creditLimit = 500000,
  availableCredit = 500000,
  creditPeriodDays = 30,
  proforma,
  latestRevisionRemarks,
  hasSubmittedPayment = false,
  pendingPayment = null,
  rejectedPaymentRemarks = null,
}: DealerOrderActionsProps) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentOption>("CREDIT");
  const [transactionRef, setTransactionRef] = useState("");
  const [dealerRemarks, setDealerRemarks] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setReceiptUploadError("Only PDF or image files (JPG, PNG, WebP) are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setReceiptUploadError("File size exceeds 10MB limit.");
      return;
    }

    setReceiptUploadError(null);
    setIsUploadingReceipt(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", "PAYMENT_RECEIPT");

      const res = await fetch("/api/dealer-applications/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Failed to upload receipt document.");
      }

      setReceiptUrl(json.url);
      setReceiptFileName(file.name);
    } catch (err) {
      setReceiptUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const isConfirmationStage = [
    "WAITING_FOR_DEALER_CONFIRMATION",
    "DEALER_CHANGE_REQUESTED",
  ].includes(orderStatus);

  const isFinalConfirmedStage = orderStatus === "FINAL_ORDER_CONFIRMED";
  const isProformaStage = orderStatus === "PROFORMA_INVOICE_GENERATED" || orderStatus === "PROFORMA_INVOICE_CONFIRMED";

  if (!isConfirmationStage && !isFinalConfirmedStage && !isProformaStage) {
    return null;
  }

  // 1. Dealer Order Confirmation / Rejection (NO PAYMENT AT THIS STAGE)
  const handleDealerDecision = async (decision: "CONFIRM" | "REJECT") => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/dealer-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: decision,
          decision: decision === "CONFIRM" ? "CONFIRMED" : "REJECTED",
          remarks:
            decision === "CONFIRM"
              ? dealerRemarks.trim() || "Order confirmed by dealer. Awaiting Proforma Invoice."
              : rejectRemarks.trim() || "Dealer requested adjustments.",
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || json?.error?.message || "Failed to update order status.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Dealer Payment Submission (AFTER PROFORMA INVOICE IS ISSUED)
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/dealer-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_PAYMENT",
          method,
          transactionRef: transactionRef.trim() || undefined,
          remarks: dealerRemarks.trim() || `Dealer submitted payment terms via ${method}`,
          receiptUrl: receiptUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || json?.error?.message || "Failed to submit payment details.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const isCreditSufficient = availableCredit >= grandTotal;

  // STAGE 1: Dealer Order Confirmation / Revision Review (NO PAYMENT)
  if (isConfirmationStage) {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50/50 via-white to-amber-50/30 rounded-xl border border-blue-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-[#0b2d55]">Review & Confirm Sales Order</h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Accounts has reviewed your order lines and prices. Please review below and confirm to proceed.
              Official Proforma Invoice will be issued by Accounts after your confirmation.
            </p>
          </div>

          <div className="text-right bg-white p-3 rounded-lg border shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Payable Order Total
            </span>
            <div className="text-lg font-black text-[#0b2d55]">
              {formatCurrency(grandTotal)}
            </div>
          </div>
        </div>

        {latestRevisionRemarks && (
          <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1">
            <div className="font-bold text-amber-900">Accountant Review Notes:</div>
            <div className="text-amber-800">{latestRevisionRemarks}</div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Change Request Drawer/Form */}
        {isRejectOpen && (
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
            <Label className="text-xs font-bold text-amber-950">Specify Desired Changes or Reason for Rejection:</Label>
            <Input
              placeholder="e.g. Please revise quantity for SW-CLUTCH-01 to 10 pcs, or recheck dealer price."
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              className="text-xs bg-white"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={submitting}
                onClick={() => handleDealerDecision("REJECT")}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Send Change Request to Accounts
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsRejectOpen(false)}
                className="text-xs text-slate-600 h-8"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons: Confirm OR Request Changes (NO PAYMENT) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsRejectOpen(!isRejectOpen)}
            disabled={submitting}
            className="border-amber-300 text-amber-900 bg-white hover:bg-amber-50 font-semibold text-xs h-10 px-4"
          >
            <XCircle className="h-4 w-4 mr-1.5 text-amber-600" />
            Request Changes / Reject
          </Button>

          <Button
            type="button"
            onClick={() => handleDealerDecision("CONFIRM")}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 h-10 shadow-sm flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Confirming...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Confirm Order (Accept Revision)
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // STAGE 2: Order Confirmed, Awaiting Accounts to Generate Proforma Invoice
  if (isFinalConfirmedStage && !proforma) {
    return (
      <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50/40 rounded-xl border border-blue-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <div className="font-bold text-sm text-[#0b2d55]">Order Confirmed — Proforma Invoice in Preparation</div>
            <p className="text-xs text-slate-600 mt-0.5">
              You have confirmed order #{orderNumber}. Accounts is currently issuing your official Proforma Invoice.
              Once generated, you will be able to review the document and submit your payment / settlement reference here.
            </p>
          </div>
        </div>
        <Badge className="bg-blue-600 text-white text-xs px-3 py-1 font-semibold shrink-0 self-start sm:self-center">
          Awaiting Proforma Invoice
        </Badge>
      </div>
    );
  }

  // STAGE 3: Proforma Invoice Issued — Dealer Submits Payment / Settlement
  return (
    <div className="p-6 bg-gradient-to-br from-emerald-50 via-white to-blue-50/20 rounded-xl border border-emerald-200 shadow-sm space-y-6">
      {/* Header with Title & Proforma Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-[#0b2d55]">
              Proforma Invoice Ready — Submit Settlement & Payment
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Proforma Invoice #{proforma?.proformaNumber || orderNumber} has been issued by Accounts.
            Please submit your settlement method or payment reference below to release this order to warehouse fulfillment.
          </p>
        </div>

        {/* Proforma Badge & Amount */}
        <div className="text-right bg-white p-3 rounded-lg border shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {proforma ? `Proforma Total (${proforma.proformaNumber})` : "Payable Grand Total"}
          </span>
          <div className="text-lg font-black text-emerald-900">
            {formatCurrency(proforma ? proforma.grandTotal : grandTotal)}
          </div>
        </div>
      </div>

      {/* Proforma Invoice Quick Download Bar */}
      {proforma && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-700" />
            <span className="font-bold text-indigo-950">
              Proforma Invoice #{proforma.proformaNumber} is ready for download & verification.
            </span>
          </div>
          <a
            href={`/api/orders/${orderId}/documents/proforma`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-md shadow-2xs"
          >
            View Proforma PDF <ArrowRight className="h-3 w-3 ml-0.5" />
          </a>
        </div>
      )}

      {/* Dealer Credit Profile Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 to-[#072d57] text-white rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-xs">Dealer B2B Credit Facility</span>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
            {creditPeriodDays} Days Net Terms
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Approved Credit Limit</span>
            <span className="font-bold text-sm text-slate-200">{formatCurrency(creditLimit)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Available Credit Balance</span>
            <span className="font-black text-sm text-emerald-400">{formatCurrency(availableCredit)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Credit Coverage</span>
            <span className={isCreditSufficient ? "font-bold text-emerald-300" : "font-bold text-amber-300"}>
              {isCreditSufficient ? "✅ 100% Covered" : "⚠️ Partial Limit"}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {hasSubmittedPayment ? (
        <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-300 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>Payment Details Submitted & Awaiting Accounts Verification</span>
            </div>
            {pendingPayment?.paymentNumber && (
              <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 font-mono text-[10px]">
                {pendingPayment.paymentNumber}
              </Badge>
            )}
          </div>

          {pendingPayment && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-white p-3 rounded-lg border border-emerald-100">
              <div>
                <span className="text-slate-400 block text-[10px]">Method</span>
                <span className="font-bold text-slate-800">{pendingPayment.method}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Amount</span>
                <span className="font-bold text-emerald-700">{formatCurrency(pendingPayment.amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Reference / Trace</span>
                <span className="font-mono font-bold text-slate-800">{pendingPayment.transactionRef || "N/A"}</span>
              </div>
            </div>
          )}

          {pendingPayment?.receiptUrl && (
            <div className="flex justify-between items-center pt-2 border-t border-emerald-200/60 text-xs">
              <span className="text-slate-500 font-medium">Payment Receipt:</span>
              <a
                href={pendingPayment.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 font-bold underline bg-white px-2.5 py-1 rounded border border-emerald-200 shadow-2xs"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                <span>View Attached Receipt Document</span>
              </a>
            </div>
          )}

          <p className="text-emerald-800 text-[11px]">
            Your payment reference is under verification by Accounts. Once verified in bank/cash, your order will automatically advance to warehouse picking & packaging.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rejectedPaymentRemarks && (
            <div className="p-3.5 bg-red-50 text-red-900 rounded-xl border border-red-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                Previous Payment Reference Not Approved by Accounts
              </div>
              <p className="text-red-700 text-[11px]">{rejectedPaymentRemarks}</p>
              <p className="text-[11px] font-semibold text-red-800 pt-0.5">
                Please re-check your payment deposit and enter valid transaction details below:
              </p>
            </div>
          )}

          <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
          {/* Payment Method Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-800">Select Settlement Method</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* 1. Credit Limit */}
              <button
                type="button"
                onClick={() => setMethod("CREDIT")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  method === "CREDIT"
                    ? "border-emerald-600 bg-emerald-100/50 ring-2 ring-emerald-600/30 text-emerald-950 font-bold"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <span>Dealer Credit</span>
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-1">{creditPeriodDays}-Day Credit Account</div>
              </button>

              {/* 2. Fonepay QR */}
              <button
                type="button"
                onClick={() => setMethod("ONLINE")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  method === "ONLINE"
                    ? "border-emerald-600 bg-emerald-100/50 ring-2 ring-emerald-600/30 text-emerald-950 font-bold"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <QrCode className="h-4 w-4 text-purple-600" />
                  <span>Fonepay / QR</span>
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-1">Instant Bank QR</div>
              </button>

              {/* 3. Cheque */}
              <button
                type="button"
                onClick={() => setMethod("CHEQUE")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  method === "CHEQUE"
                    ? "border-emerald-600 bg-emerald-100/50 ring-2 ring-emerald-600/30 text-emerald-950 font-bold"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <FileCheck2 className="h-4 w-4 text-blue-600" />
                  <span>Bank Cheque</span>
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-1">Clearing Cheque</div>
              </button>

              {/* 4. Cash */}
              <button
                type="button"
                onClick={() => setMethod("CASH")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  method === "CASH"
                    ? "border-emerald-600 bg-emerald-100/50 ring-2 ring-emerald-600/30 text-emerald-950 font-bold"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <Banknote className="h-4 w-4 text-amber-600" />
                  <span>Cash Deposit</span>
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-1">Counter Deposit</div>
              </button>

              {/* 5. Bank Wire */}
              <button
                type="button"
                onClick={() => setMethod("BANK_TRANSFER")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  method === "BANK_TRANSFER"
                    ? "border-emerald-600 bg-emerald-100/50 ring-2 ring-emerald-600/30 text-emerald-950 font-bold"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <Building2 className="h-4 w-4 text-cyan-600" />
                  <span>Bank Transfer</span>
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-1">NIC Asia / Nabil Bank</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-slate-600">
                {method === "CHEQUE"
                  ? "Cheque Number & Bank Name"
                  : method === "ONLINE"
                  ? "Fonepay Trace / Transaction ID"
                  : method === "BANK_TRANSFER"
                  ? "Bank Transfer Reference #"
                  : method === "CREDIT"
                  ? "PO Reference / Account Number (Optional)"
                  : "Transaction Reference (Optional)"}
              </Label>
              <Input
                placeholder="e.g. REF-109281 or CHQ-48291"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Settlement Remarks / Instructions</Label>
              <Input
                placeholder="e.g. Voucher deposited, proceed for warehouse release."
                value={dealerRemarks}
                onChange={(e) => setDealerRemarks(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          {/* Upload Receipt / Voucher Document */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <Label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <FileUp className="h-4 w-4 text-emerald-600" />
                <span>Upload Payment Receipt / Deposit Slip (Optional)</span>
              </Label>
              <span className="text-[10px] text-slate-400">PDF or Image (PNG, JPG, WebP up to 10MB)</span>
            </div>

            {receiptUrl ? (
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span className="font-semibold truncate">{receiptFileName || "Payment Receipt Uploaded"}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:text-emerald-900 underline font-bold text-xs"
                  >
                    Preview
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptUrl("");
                      setReceiptFileName("");
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-0.5">
                <input
                  type="file"
                  id="receipt-file-upload"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleReceiptUpload}
                  disabled={isUploadingReceipt}
                  className="hidden"
                />
                <label
                  htmlFor="receipt-file-upload"
                  className={`inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition shadow-2xs ${
                    isUploadingReceipt
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                  }`}
                >
                  {isUploadingReceipt ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      <span>Uploading document...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Choose Receipt / Voucher Document</span>
                    </>
                  )}
                </label>
                <span className="text-[11px] text-slate-500">
                  Attach bank voucher, cheque copy, or transaction screenshot
                </span>
              </div>
            )}
            {receiptUploadError && (
              <p className="text-[11px] text-red-600 font-semibold">{receiptUploadError}</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 h-9 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" /> Submit Payment Details to Accounts
                </>
              )}
            </Button>
          </div>
        </form>
        </div>
      )}
    </div>
  );
}
