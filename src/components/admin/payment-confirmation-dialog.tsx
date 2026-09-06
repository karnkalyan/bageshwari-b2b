"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  XCircle,
  Clock,
  Send,
  Calendar,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface SubmittedPaymentInfo {
  id: string;
  paymentNumber: string;
  method: string;
  status: string;
  amount: number;
  transactionRef?: string | null;
  remarks?: string | null;
  createdAt: string | Date;
}

export interface PaymentDialogProps {
  orderId: string;
  orderNumber: string;
  grandTotal: number;
  dealerName: string;
  dealerCode: string;
  availableCredit?: number;
  pendingPayment?: SubmittedPaymentInfo | null;
  isSales?: boolean;
  warehouseStaff?: Array<{ id: string; name?: string | null; email: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentOption = "CREDIT" | "ONLINE" | "CHEQUE" | "CASH" | "BANK_TRANSFER";

export function PaymentConfirmationDialog({
  orderId,
  orderNumber,
  grandTotal,
  dealerName,
  dealerCode,
  availableCredit = 500000,
  pendingPayment = null,
  isSales = false,
  warehouseStaff = [],
  isOpen,
  onClose,
  onSuccess,
}: PaymentDialogProps) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentOption>("ONLINE");
  const [amount, setAmount] = useState<number>(grandTotal);
  const [transactionRef, setTransactionRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [accountantNotes, setAccountantNotes] = useState("");
  const [assignedWarehouseUserId, setAssignedWarehouseUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setAmount(grandTotal);
    setTransactionRef("");
    setRemarks("");
    setAccountantNotes("Verified in bank statement / cash register. Released to warehouse.");
    setAssignedWarehouseUserId("");
    setError(null);
  }, [grandTotal, isOpen, pendingPayment]);

  // Handler for Accountant Approving or Rejecting Dealer's Submitted Payment
  const handleVerifyDecision = async (decision: "APPROVE" | "REJECT") => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/payment/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: decision,
          method: pendingPayment?.method,
          amount: pendingPayment?.amount,
          transactionRef: pendingPayment?.transactionRef || undefined,
          assignedWarehouseUserId: decision === "APPROVE" ? assignedWarehouseUserId || undefined : undefined,
          remarks:
            decision === "APPROVE"
              ? accountantNotes.trim() || "Payment verified by Accounts. Released to warehouse."
              : accountantNotes.trim() || "Payment reference could not be verified in bank statement.",
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || json?.error?.message || `Failed to ${decision.toLowerCase()} payment.`);
      }

      onSuccess();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handler for Recording Payment (by Sales on behalf of dealer or Accounts direct entry)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const action = isSales ? "RECORD_ON_BEHALF" : "APPROVE";

    try {
      const res = await fetch(`/api/orders/${orderId}/payment/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          method,
          amount,
          transactionRef: transactionRef.trim() || undefined,
          remarks:
            remarks.trim() ||
            (isSales
              ? `Recorded by Sales on behalf of dealer: ${method}`
              : `Direct payment verified by Accounts: ${method}`),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || json?.error?.message || "Failed to record payment.");
      }

      onSuccess();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment recording failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderMethodBadge = (m: string) => {
    switch (m) {
      case "CREDIT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md font-bold text-xs">
            <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Dealer B2B Credit
          </span>
        );
      case "ONLINE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-300 rounded-md font-bold text-xs">
            <QrCode className="h-3.5 w-3.5 text-purple-600" /> Fonepay / QR Transfer
          </span>
        );
      case "CHEQUE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-300 rounded-md font-bold text-xs">
            <FileCheck2 className="h-3.5 w-3.5 text-blue-600" /> Bank Cheque
          </span>
        );
      case "CASH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-md font-bold text-xs">
            <Banknote className="h-3.5 w-3.5 text-amber-600" /> Cash Counter Deposit
          </span>
        );
      case "BANK_TRANSFER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 text-cyan-800 border border-cyan-300 rounded-md font-bold text-xs">
            <Building2 className="h-3.5 w-3.5 text-cyan-600" /> Bank Transfer / Wire
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-md font-bold text-xs">
            <CreditCard className="h-3.5 w-3.5 text-slate-600" /> {m}
          </span>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-lg font-bold text-slate-900">
              {pendingPayment
                ? "Verify Dealer Payment & Release to Warehouse"
                : isSales
                ? "Record Payment (On Behalf of Dealer)"
                : "Record & Confirm Order Payment"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Order: {orderNumber} • Dealer: {dealerName} ({dealerCode}) • Payable Total: {formatCurrency(grandTotal)}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. SCENARIO A: DEALER HAS SUBMITTED PAYMENT DETAILS -> ACCOUNTANT VERIFIES & APPROVES */}
        {pendingPayment ? (
          <div className="space-y-4 text-xs">
            {/* Dealer Submitted Details Card */}
            <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-xl border border-emerald-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                    PENDING ACCOUNTANT VERIFICATION
                  </Badge>
                  <span className="font-mono text-slate-500 font-semibold text-xs">
                    Voucher: {pendingPayment.paymentNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{formatDate(pendingPayment.createdAt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                    Payment Mode
                  </span>
                  {renderMethodBadge(pendingPayment.method)}
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                    Submitted Amount
                  </span>
                  <div className="text-base font-black text-emerald-900">
                    {formatCurrency(pendingPayment.amount)}
                  </div>
                </div>
              </div>

              {/* Transaction Ref Highlight Box */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                  Transaction Reference / Slip / Trace ID
                </span>
                <div className="p-2.5 bg-white rounded-lg border border-slate-300 font-mono text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>{pendingPayment.transactionRef || "(No reference entered by dealer)"}</span>
                  <Badge variant="outline" className="text-[10px] text-slate-500 bg-slate-50">
                    Trace Ref
                  </Badge>
                </div>
              </div>

              {/* Remarks */}
              {pendingPayment.remarks && (
                <div className="space-y-0.5 pt-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                    Dealer Remarks
                  </span>
                  <p className="text-slate-700 bg-white/80 p-2 rounded border border-slate-200 text-xs">
                    {pendingPayment.remarks}
                  </p>
                </div>
              )}
            </div>

            {/* Accountant Bank Verification Guidance */}
            <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-950 space-y-1">
              <div className="font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                Accountant Verification Instructions
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Please check your company bank account (NIC Asia / Nabil / Fonepay portal) or counter cash receipt to confirm receipt of{" "}
                <strong>{formatCurrency(pendingPayment.amount)}</strong> under reference{" "}
                <strong>{pendingPayment.transactionRef || "given above"}</strong>.
              </p>
            </div>

            {/* Optional Warehouse Staff Selection */}
            {warehouseStaff && warehouseStaff.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Assign Warehouse User for Picking (Optional)
                </Label>
                <select
                  value={assignedWarehouseUserId}
                  onChange={(e) => setAssignedWarehouseUserId(e.target.value)}
                  className="w-full h-8 text-xs border rounded-lg px-2 bg-white text-slate-900 border-slate-300 font-semibold"
                >
                  <option value="">Auto-assign / Central Warehouse</option>
                  {warehouseStaff.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name || ws.email} (Warehouse)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Accountant Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                Accountant Verification Remarks (Optional)
              </Label>
              <Input
                value={accountantNotes}
                onChange={(e) => setAccountantNotes(e.target.value)}
                placeholder="e.g. Verified in Nabil Bank statement. Released to warehouse."
                className="h-8 text-xs bg-white"
              />
            </div>

            <DialogFooter className="gap-2 pt-3 border-t flex flex-wrap justify-between sm:justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleVerifyDecision("REJECT")}
                disabled={submitting}
                className="border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold"
              >
                <XCircle className="h-3.5 w-3.5 mr-1 text-red-600" />
                Reject Reference (Ask Dealer to Re-submit)
              </Button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleVerifyDecision("APPROVE")}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm Payment & Release to Warehouse
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        ) : isSales ? (
          /* 2. SCENARIO B: NO PAYMENT SUBMITTED YET -> RECORD ON BEHALF OF DEALER (SALES ONLY) */
          <form onSubmit={handleRecordPayment} className="space-y-5 text-xs">
            {isSales && (
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-indigo-950 space-y-1">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-indigo-600" />
                  Recording on Behalf of Dealer
                </div>
                <p className="text-[11px] text-indigo-800">
                  Dealer has confirmed payment offline. Enter the settlement details below. Accounts will receive the details, verify the bank/cash credit, and approve release to warehouse.
                </p>
              </div>
            )}

            {/* Payment Method Selector Grid */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800">Select Payment Mode</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* 1. Credit Limit */}
                <button
                  type="button"
                  onClick={() => setMethod("CREDIT")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    method === "CREDIT"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30 text-emerald-950"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    <span>Dealer Credit</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">30-Day Credit Limit</div>
                </button>

                {/* 2. Fonepay / QR */}
                <button
                  type="button"
                  onClick={() => setMethod("ONLINE")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    method === "ONLINE"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30 text-emerald-950"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <QrCode className="h-4 w-4 text-purple-600" />
                    <span>Fonepay / QR</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Instant Bank QR</div>
                </button>

                {/* 3. Cheque */}
                <button
                  type="button"
                  onClick={() => setMethod("CHEQUE")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    method === "CHEQUE"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30 text-emerald-950"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <FileCheck2 className="h-4 w-4 text-blue-600" />
                    <span>Bank Cheque</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Post-dated / Clearing</div>
                </button>

                {/* 4. Cash */}
                <button
                  type="button"
                  onClick={() => setMethod("CASH")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    method === "CASH"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30 text-emerald-950"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Banknote className="h-4 w-4 text-amber-600" />
                    <span>Cash Deposit</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Counter Receipt</div>
                </button>

                {/* 5. Bank Wire */}
                <button
                  type="button"
                  onClick={() => setMethod("BANK_TRANSFER")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    method === "BANK_TRANSFER"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30 text-emerald-950"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Building2 className="h-4 w-4 text-cyan-600" />
                    <span>Bank Wire</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Direct NIC Asia/Nabil</div>
                </button>
              </div>
            </div>

            {/* Dynamic Details based on selected method */}
            {method === "CREDIT" && (
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-emerald-950">
                  <span>Available Dealer Credit Limit:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {formatCurrency(availableCredit)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  This order will be charged against the dealer&apos;s 30-day revolving credit account.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Amount (NPR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-black text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {method === "CHEQUE"
                    ? "Cheque Number & Bank"
                    : method === "ONLINE"
                    ? "Fonepay / QR Trace ID"
                    : method === "BANK_TRANSFER"
                    ? "Bank Deposit Slip Ref #"
                    : "Transaction Reference"}
                </Label>
                <Input
                  placeholder="e.g. CHQ-928192 or FONE-102938"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isSales ? "Sales Remarks / Notes for Accounts" : "Verification Remarks / Notes"}
              </Label>
              <Input
                placeholder={isSales ? "e.g. Cheque collected by sales rep." : "e.g. Counter cash received."}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className={isSales ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold" : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Processing...
                  </>
                ) : isSales ? (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Submit Payment for Accounts Verification
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm Payment & Release to Warehouse
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Scenario C: Accounts viewing without submitted payment */
          <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs space-y-3 text-amber-950">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Awaiting Payment Submission</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Payment details have not been submitted for this order yet. Accounts can only verify and approve or reject payments after the Dealer (via Dealer Portal) or Salesperson (on behalf of dealer) submits payment references.
            </p>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
