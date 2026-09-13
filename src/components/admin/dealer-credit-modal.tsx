"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CreditCard, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SerializedDealer } from "./dealers-directory-client";

interface DealerCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealer: SerializedDealer | null;
  onSuccess?: () => void;
}

export function DealerCreditModal({
  isOpen,
  onClose,
  dealer,
  onSuccess,
}: DealerCreditModalProps) {
  const [creditEligible, setCreditEligible] = useState(true);
  const [creditLimit, setCreditLimit] = useState(0);
  const [availableCredit, setAvailableCredit] = useState(0);
  const [creditPeriodDays, setCreditPeriodDays] = useState(30);
  const [holdStatus, setHoldStatus] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (dealer) {
      setCreditEligible(dealer.creditEligible ?? true);
      const cp = dealer.creditProfile;
      if (cp) {
        setCreditLimit(cp.creditLimit);
        setAvailableCredit(cp.availableCredit);
        setCreditPeriodDays(cp.creditPeriodDays || 30);
        setHoldStatus(cp.holdStatus || false);
      } else {
        setCreditLimit(0);
        setAvailableCredit(0);
        setCreditPeriodDays(30);
        setHoldStatus(false);
      }
      setHoldReason("");
      setMessage(null);
    }
  }, [dealer, isOpen]);

  if (!dealer) return null;

  const currentOutstanding = dealer.creditProfile?.currentOutstanding || 0;

  const handleResetAvailable = () => {
    const calc = Math.max(0, creditLimit - currentOutstanding);
    setAvailableCredit(calc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/dealers/${dealer.id}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditEligible,
          creditLimit,
          availableCredit,
          creditPeriodDays,
          holdStatus,
          holdReason: holdStatus ? holdReason : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update credit profile." });
      } else {
        setMessage({ type: "success", text: "Dealer credit profile updated successfully!" });
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 800);
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Manage Dealer Credit Facility
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure credit ceiling, payment period, available balance, or toggle credit holds.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 border rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-800">{dealer.tradingName || dealer.legalName}</span>
            <Badge variant="outline" className="font-mono text-[10px]">{dealer.code}</Badge>
          </div>
          <div className="text-slate-500 flex justify-between pt-1 border-t">
            <span>Current Outstanding:</span>
            <span className="font-bold text-slate-800">{formatCurrency(currentOutstanding)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Credit Eligibility */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border bg-white">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-slate-800">Credit Facility Enabled</Label>
              <div className="text-[11px] text-slate-500">
                Allow this dealer to purchase on credit terms
              </div>
            </div>
            <Switch
              checked={creditEligible}
              onCheckedChange={setCreditEligible}
            />
          </div>

          {/* Credit Limit */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Total Credit Limit (NPR)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">NPR</span>
              <Input
                type="number"
                min="0"
                step="1000"
                value={creditLimit}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setCreditLimit(val);
                }}
                className="pl-12 text-xs font-bold"
                disabled={!creditEligible}
              />
            </div>
          </div>

          {/* Available Credit + Reset Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">Available Credit (NPR)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetAvailable}
                disabled={!creditEligible}
                className="h-6 px-2 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1"
                title="Reset available credit to (Limit - Outstanding)"
              >
                <RotateCcw className="h-3 w-3" /> Reset to Max
              </Button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">NPR</span>
              <Input
                type="number"
                min="0"
                step="1000"
                value={availableCredit}
                onChange={(e) => setAvailableCredit(parseFloat(e.target.value) || 0)}
                className="pl-12 text-xs font-bold"
                disabled={!creditEligible}
              />
            </div>
            <div className="text-[10px] text-slate-400">
              Dealer can place credit orders up to this available amount.
            </div>
          </div>

          {/* Credit Period (Days) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Payment Term (Days)</Label>
            <Input
              type="number"
              min="0"
              max="365"
              value={creditPeriodDays}
              onChange={(e) => setCreditPeriodDays(parseInt(e.target.value, 10) || 0)}
              className="text-xs"
              placeholder="e.g. 30"
              disabled={!creditEligible}
            />
          </div>

          {/* Hold Status */}
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <Label className="text-xs font-bold text-amber-900">Credit Hold Status</Label>
              </div>
              <Switch
                checked={holdStatus}
                onCheckedChange={setHoldStatus}
              />
            </div>
            <div className="text-[11px] text-amber-800">
              When on hold, the dealer cannot place new credit orders regardless of available balance.
            </div>
            {holdStatus && (
              <Input
                placeholder="Reason for credit hold (e.g. overdue payment, audit review)"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="text-xs bg-white"
              />
            )}
          </div>

          {message && (
            <div
              className={`p-2.5 rounded-md text-xs flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="font-bold bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? "Saving..." : "Save Credit Settings"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
