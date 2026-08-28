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
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface PaymentDialogProps {
  orderId: string;
  orderNumber: string;
  grandTotal: number;
  dealerName: string;
  dealerCode: string;
  availableCredit?: number;
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
  isOpen,
  onClose,
  onSuccess,
}: PaymentDialogProps) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentOption>("CREDIT");
  const [amount, setAmount] = useState<number>(grandTotal);
  const [transactionRef, setTransactionRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setAmount(grandTotal);
    setTransactionRef("");
    setRemarks("");
    setError(null);
  }, [grandTotal, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/payment/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          amount,
          transactionRef: transactionRef.trim() || undefined,
          remarks: remarks.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Failed to confirm payment and advance order.");
      }

      onSuccess();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment confirmation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-lg font-bold text-slate-900">
              Confirm Payment & Advance Order Pipeline
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Order: {orderNumber} • Dealer: {dealerName} ({dealerCode}) • Total: {formatCurrency(grandTotal)}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
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

          {method === "ONLINE" && (
            <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
              <div className="font-bold text-purple-950">Nepal Fonepay / Merchant QR Code</div>
              <p className="text-[11px] text-purple-700">
                Scan Fonepay QR code or enter Fonepay / ConnectIPS transaction trace ID below.
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
            <Label className="text-xs font-semibold">Verification Remarks / Notes</Label>
            <Input
              placeholder="e.g. Payment verified. Released to warehouse."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Workflow Automation Notice */}
          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-blue-950 space-y-1">
            <div className="font-bold text-xs flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              Automated Next Step Pipeline
            </div>
            <p className="text-[11px] text-blue-800">
              Upon confirmation, this order will automatically generate the <strong>Proforma Invoice</strong>, mark it confirmed, and release the order directly to the <strong>Warehouse Picking & Packaging Station</strong>.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
