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
  Edit,
  Send,
  Loader2,
  Trash2,
  AlertCircle,
  Calculator,
  MessageSquare,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface RevisionItemState {
  orderItemId: string;
  sku: string;
  productName: string;
  unitCode: string;
  originalQuantity: number;
  approvedQuantity: number;
  unitPrice: number;
  discountAmount: number;
  accountsRemarks: string;
}

interface OrderRevisionDialogProps {
  orderId: string;
  orderNumber: string;
  initialItems: RevisionItemState[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OrderRevisionDialog({
  orderId,
  orderNumber,
  initialItems,
  isOpen,
  onClose,
  onSuccess,
}: OrderRevisionDialogProps) {
  const router = useRouter();
  const [items, setItems] = useState<RevisionItemState[]>([]);
  const [generalRemarks, setGeneralRemarks] = useState("");
  const [sendToDealer, setSendToDealer] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(
        initialItems.map((it) => ({
          ...it,
          approvedQuantity: it.approvedQuantity ?? it.originalQuantity,
          accountsRemarks: it.accountsRemarks || "",
        }))
      );
      setGeneralRemarks("");
      setError(null);
    }
  }, [initialItems, isOpen]);

  const handleQuantityChange = (index: number, val: number) => {
    const next = [...items];
    next[index].approvedQuantity = Math.max(0, val);
    setItems(next);
  };

  const handlePriceChange = (index: number, val: number) => {
    const next = [...items];
    next[index].unitPrice = Math.max(0, val);
    setItems(next);
  };

  const handleRemarksChange = (index: number, val: string) => {
    const next = [...items];
    next[index].accountsRemarks = val;
    setItems(next);
  };

  // Live Calculations
  const calculatedSubtotal = items.reduce(
    (acc, it) => acc + it.unitPrice * it.approvedQuantity,
    0
  );
  const calculatedTax = calculatedSubtotal * 0.13;
  const calculatedGrandTotal = calculatedSubtotal + calculatedTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalRemarks.trim()) {
      setError("Please enter accountant review remarks explaining the changes.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generalRemarks: generalRemarks.trim(),
          sendToDealer,
          items: items.map((it) => ({
            orderItemId: it.orderItemId,
            quantity: it.approvedQuantity,
            unitPrice: it.unitPrice,
            discountAmount: it.discountAmount,
            accountsRemarks: it.accountsRemarks?.trim() || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Failed to submit order revision.");
      }

      onSuccess();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revision submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-amber-600" />
            <DialogTitle className="text-lg font-bold text-slate-900">
              Accountant Order Modification & Review
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Order: {orderNumber} • Adjust approved quantities, rates, and attach remarks to send to dealer for confirmation.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Items Table with inline modification */}
          <div className="border rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-50 p-3 border-b font-bold text-slate-800 flex justify-between items-center">
              <span>Order Line Items</span>
              <span className="text-[11px] font-normal text-slate-500">
                Set quantity to 0 to remove an item
              </span>
            </div>

            <div className="divide-y max-h-[340px] overflow-y-auto">
              {items.map((it, idx) => (
                <div key={it.orderItemId} className="p-3 space-y-2.5 bg-white hover:bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900">{it.productName}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">SKU: {it.sku}</span>
                    </div>
                    <div className="text-right font-black text-slate-900 text-xs">
                      Line Total: {formatCurrency(it.unitPrice * it.approvedQuantity * 1.13)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Quantity */}
                    <div>
                      <Label className="text-[11px] text-slate-600">
                        Approved Qty (Req: {it.originalQuantity})
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={it.approvedQuantity}
                        onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-bold"
                      />
                    </div>

                    {/* Unit Price */}
                    <div>
                      <Label className="text-[11px] text-slate-600">Dealer Rate (NPR)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-bold text-emerald-700"
                      />
                    </div>

                    {/* Item Remarks */}
                    <div>
                      <Label className="text-[11px] text-slate-600">Line Remark / Reason</Label>
                      <Input
                        placeholder="e.g. Adjusted to available batch"
                        value={it.accountsRemarks}
                        onChange={(e) => handleRemarksChange(idx, e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Totals Bar */}
            <div className="p-4 bg-slate-100/80 border-t space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Revised Subtotal:</span>
                <span className="font-bold text-slate-900">{formatCurrency(calculatedSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>13% VAT Tax:</span>
                <span className="font-bold text-slate-900">{formatCurrency(calculatedTax)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-300">
                <span>New Grand Total:</span>
                <span className="text-[#092f5c]">{formatCurrency(calculatedGrandTotal)}</span>
              </div>
            </div>
          </div>

          {/* General Remarks & Options */}
          <div className="space-y-3 p-4 bg-amber-50/50 rounded-xl border border-amber-200">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-900">
                Overall Accountant Review Remarks *
              </Label>
              <Input
                required
                placeholder="e.g. Quantity revised based on available Nepalgunj warehouse inventory. Please verify and confirm."
                value={generalRemarks}
                onChange={(e) => setGeneralRemarks(e.target.value)}
                className="h-9 text-xs bg-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="sendToDealerCheckbox"
                checked={sendToDealer}
                onChange={(e) => setSendToDealer(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="sendToDealerCheckbox" className="text-xs font-semibold text-slate-800 cursor-pointer">
                Resend revised order to Dealer for verification & confirmation (Transitions to Awaiting Dealer Confirmation)
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Submit & Send to Dealer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
