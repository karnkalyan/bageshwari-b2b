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
  Truck,
  Pencil,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export interface ShipmentData {
  id: string;
  shipmentNumber: string;
  challanNumber: string;
  transporter: string;
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleNumber?: string | null;
  totalCartons: number;
  totalWeight: number;
  notes?: string | null;
}

interface EditChallanDialogProps {
  shipment: ShipmentData;
  orderNumber: string;
  dealerName: string;
  updateAction: (formData: FormData) => Promise<void>;
  trigger?: React.ReactNode;
}

export function EditChallanDialog({
  shipment,
  orderNumber,
  dealerName,
  updateAction,
  trigger,
}: EditChallanDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [transporter, setTransporter] = useState(shipment.transporter || "");
  const [vehicleNumber, setVehicleNumber] = useState(shipment.vehicleNumber || "");
  const [driverName, setDriverName] = useState(shipment.driverName || "");
  const [driverPhone, setDriverPhone] = useState(shipment.driverPhone || "");
  const [totalCartons, setTotalCartons] = useState(String(shipment.totalCartons || 1));
  const [totalWeight, setTotalWeight] = useState(
    shipment.totalWeight ? String(Number(shipment.totalWeight).toFixed(2)) : ""
  );
  const [notes, setNotes] = useState(shipment.notes || "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("shipmentId", shipment.id);
    formData.append("transporter", transporter);
    formData.append("vehicleNumber", vehicleNumber);
    formData.append("driverName", driverName);
    formData.append("driverPhone", driverPhone);
    formData.append("totalCartons", totalCartons);
    formData.append("totalWeight", totalWeight);
    formData.append("notes", notes);

    try {
      await updateAction(formData);
      setSuccess("Transportation & Delivery Challan details updated successfully!");
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 1000);
    } catch (err: any) {
      setError(err?.message || "Failed to update challan details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer inline-block">
          {trigger}
        </span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
          className="h-7 text-xs border-amber-300 bg-amber-50/60 hover:bg-amber-100 text-amber-900 font-bold flex items-center gap-1 shadow-2xs"
          title="Edit Transportation & Challan Details"
        >
          <Pencil className="h-3 w-3 text-amber-600" />
          Edit Challan
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-amber-600 via-orange-600 to-slate-900 text-white">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-200" />
              <DialogTitle className="text-base font-bold text-white">
                Edit Challan & Transportation Details
              </DialogTitle>
              <Badge className="bg-white/20 text-white font-mono text-xs">
                {shipment.challanNumber || shipment.shipmentNumber}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-amber-100 mt-1">
              Order: <strong>{orderNumber}</strong> • Dealer: <strong>{dealerName}</strong>
            </DialogDescription>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-foreground">Carrier / Logistics Transporter *</Label>
                <Input
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  placeholder="e.g. Dedicated Logistics Transporter"
                  required
                  className="mt-1 h-8 text-xs font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground">Vehicle Number</Label>
                <Input
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. BA 2 KHA 4910"
                  className="mt-1 h-8 text-xs font-mono font-bold uppercase"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground">Driver Name</Label>
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Ram Bahadur Rana"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground">Driver Contact Phone</Label>
                <Input
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="e.g. +977-9800000000"
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Cartons</Label>
                  <Input
                    type="number"
                    min="1"
                    value={totalCartons}
                    onChange={(e) => setTotalCartons(e.target.value)}
                    className="mt-1 h-8 text-xs font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground">Gross Wt (KG)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(e.target.value)}
                    className="mt-1 h-8 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-foreground">LR / Waybill / Transport Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bilty / LR No. 49219, Transporter Office: Nepalgunj Hub"
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-between sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 flex items-center gap-1.5 shadow-xs"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
