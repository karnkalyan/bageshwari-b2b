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
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Send,
  Clock,
  FileText,
  Percent,
  Sparkles,
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
}: DealerOrderActionsProps) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentOption>("CREDIT");
  const [transactionRef, setTransactionRef] = useState("");
  const [dealerRemarks, setDealerRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAwaitingPaymentOrConfirmation = [
    "WAITING_FOR_DEALER_CONFIRMATION",
    "DEALER_CHANGE_REQUESTED",
    "FINAL_ORDER_CONFIRMED",
    "PROFORMA_INVOICE_GENERATED",
  ].includes(orderStatus);

  if (!isAwaitingPaymentOrConfirmation) return null;

  const usedCredit = Math.max(0, creditLimit - availableCredit);
  const creditUsagePercent = creditLimit > 0 ? Math.min(100, Math.round((usedCredit / creditLimit) * 100)) : 0;
  const isCreditSufficient = availableCredit >= grandTotal;

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/dealer-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          transactionRef: transactionRef.trim() || undefined,
          remarks: dealerRemarks.trim() || `Dealer confirmed order & payment terms via ${method}`,
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

  return (
    <div className="p-6 bg-gradient-to-br from-emerald-50 via-white to-blue-50/20 rounded-xl border border-emerald-200 shadow-sm space-y-6">
      {/* Header with Title & Proforma Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-[#0b2d55]">
              {orderStatus === "WAITING_FOR_DEALER_CONFIRMATION"
                ? "Review & Confirm Order Revision"
                : "Submit Settlement Terms & Payment Reference"}
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {proforma
              ? `Proforma Invoice #${proforma.proformaNumber} generated. Select your settlement terms to release this order to warehouse fulfillment.`
              : "Review revised quantities & select your settlement preference for Accounts review."}
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
              Proforma Invoice #{proforma.proformaNumber} is ready for review.
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

      {latestRevisionRemarks && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1">
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

      {hasSubmittedPayment && orderStatus !== "WAITING_FOR_DEALER_CONFIRMATION" ? (
        <div className="p-4 bg-emerald-100/70 rounded-xl border border-emerald-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>Payment Terms Submitted & Awaiting Verification</span>
          </div>
          <p className="text-emerald-800 text-[11px]">
            Your payment terms have been recorded. Once Accounts verifies the transaction, the order will automatically release to the warehouse for pick list generation.
          </p>
        </div>
      ) : (
        <form onSubmit={handleConfirmOrder} className="space-y-4 text-xs">
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
                <div className="text-[10px] text-slate-500 font-normal mt-1">NIC Asia / Nabil</div>
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
              <Label className="text-[11px] text-slate-600">Confirmation Remarks / Instructions</Label>
              <Input
                placeholder="e.g. Terms agreed, proceed for warehouse release."
                value={dealerRemarks}
                onChange={(e) => setDealerRemarks(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
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
                  <Send className="h-4 w-4 mr-1.5" /> Submit Payment Terms to Accounts
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
