"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Printer,
  FileImage,
  MapPin,
  Building2,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Boxes,
} from "lucide-react";

export interface PickListConsoleItem {
  id: string;
  orderItemId?: string;
  sku: string;
  productName: string;
  variantName?: string | null;
  unit: string;
  approvedQuantity: number;
  pickedQuantity: number;
  isPicked: boolean;
  rackLocation: string;
  binLocation: string;
  remarks: string;
}

export interface PickListConsoleDialogProps {
  orderId: string;
  orderNumber: string;
  sellerSlug: string;
  dealerName?: string;
  dealerCity?: string;
  pickListId?: string;
  pickListNumber?: string;
  currentStatus?: string;
  warehouseStaff?: Array<{ id: string; name: string | null; email: string }>;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function PickListConsoleDialog({
  orderId,
  orderNumber,
  sellerSlug,
  dealerName,
  dealerCity,
  pickListId: initialPlId,
  pickListNumber: initialPlNum,
  currentStatus = "GENERATED",
  warehouseStaff = [],
  trigger,
  onSuccess,
}: PickListConsoleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pickListId, setPickListId] = useState(initialPlId || "");
  const [pickListNumber, setPickListNumber] = useState(initialPlNum || "");
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [items, setItems] = useState<PickListConsoleItem[]>([]);

  // Fetch live pick list data on dialog open
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    fetch(`/api/orders/${orderId}/pick-list`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data) {
          const d = json.data;
          setPickListId(d.pickList?.id || "");
          setPickListNumber(d.pickList?.pickListNumber || "");
          setStatus(d.pickList?.status || "GENERATED");
          setNotes(d.pickList?.notes || "");
          setAssignedToId(d.pickList?.assignedTo?.id || "");

          if (Array.isArray(d.pickList?.items)) {
            setItems(
              d.pickList.items.map((it: any) => ({
                id: it.id,
                orderItemId: it.orderItemId,
                sku: it.sku,
                productName: it.productName,
                variantName: it.variantName,
                unit: it.unit || "PCS",
                approvedQuantity: Number(it.approvedQuantity || 0),
                pickedQuantity: Number(it.pickedQuantity || 0),
                isPicked: Number(it.pickedQuantity || 0) >= Number(it.approvedQuantity || 0) && Number(it.approvedQuantity || 0) > 0,
                rackLocation: it.rackLocation || "R-01",
                binLocation: it.binLocation || "B-01",
                remarks: it.remarks || "",
              }))
            );
          }
        } else {
          setError(json.error?.message || "Failed to load pick list details.");
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Network error loading pick list.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, orderId]);

  // Calculations
  const totalApprovedUnits = items.reduce((acc, it) => acc + it.approvedQuantity, 0);
  const totalPickedUnits = items.reduce((acc, it) => acc + it.pickedQuantity, 0);
  const allPicked = items.length > 0 && items.every((it) => it.pickedQuantity >= it.approvedQuantity && it.approvedQuantity > 0);
  const pickProgress = totalApprovedUnits > 0 ? Math.min(100, Math.round((totalPickedUnits / totalApprovedUnits) * 100)) : 0;

  // Handlers
  const handleUpdateItem = (index: number, field: keyof PickListConsoleItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      if (field === "pickedQuantity") {
        const numVal = Math.max(0, Number(value) || 0);
        item.pickedQuantity = numVal;
        item.isPicked = numVal >= item.approvedQuantity && item.approvedQuantity > 0;
      }

      copy[index] = item;
      return copy;
    });
  };

  const handleTogglePicked = (index: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      if (item.isPicked) {
        item.isPicked = false;
        item.pickedQuantity = 0;
      } else {
        item.isPicked = true;
        item.pickedQuantity = item.approvedQuantity;
      }
      copy[index] = item;
      return copy;
    });
  };

  const handleMarkAllPicked = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        pickedQuantity: it.approvedQuantity,
        isPicked: it.approvedQuantity > 0,
      }))
    );
  };

  const handleResetAll = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        pickedQuantity: 0,
        isPicked: false,
      }))
    );
  };

  const handleSave = async (markCompleted: boolean = false) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/pick-list`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({
            id: it.id,
            orderItemId: it.orderItemId,
            sku: it.sku,
            pickedQuantity: it.pickedQuantity,
            rackLocation: it.rackLocation,
            binLocation: it.binLocation,
            remarks: it.remarks,
          })),
          notes,
          assignedToId: assignedToId || null,
          markCompleted: markCompleted || (allPicked && !markCompleted),
          status: markCompleted || allPicked ? "COMPLETED" : "IN_PROGRESS",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to update pick list.");
      }

      const updatedPl = json.data;
      if (updatedPl?.status) setStatus(updatedPl.status);

      setSuccess(markCompleted ? "Pick list marked as COMPLETED successfully!" : "Pick list updates saved successfully!");
      setTimeout(() => setSuccess(null), 3500);

      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save pick list updates.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 shadow-2xs"
            title="Update Picked Items & Regenerate Pick List PDF"
          >
            <ClipboardCheck className="h-3 w-3" />
            Pick Entry
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 bg-white border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-black text-[#0b2d55] flex items-center gap-1.5">
                  <ClipboardCheck className="h-5 w-5 text-teal-600" />
                  Warehouse Picking Console
                </DialogTitle>
                <Badge
                  className={`text-[10px] font-bold ${
                    status === "COMPLETED"
                      ? "bg-emerald-600 text-white"
                      : status === "IN_PROGRESS"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {status}
                </Badge>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">
                  {pickListNumber ? `Pick List #${pickListNumber}` : "Generating Manifest"}
                </span>
                <span>•</span>
                <span>Order: <strong className="text-slate-700">{orderNumber}</strong></span>
                {dealerName && (
                  <>
                    <span>•</span>
                    <span className="text-slate-600">{dealerName} {dealerCity ? `(${dealerCity})` : ""}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Document PDF Action */}
            <div className="flex items-center gap-2">
              <a
                href={`/api/orders/${orderId}/documents/pick-list`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 shadow-2xs transition-colors"
                title="Open live printable Picking List PDF with updated picked values"
              >
                <Printer className="h-3.5 w-3.5 text-teal-600" />
                Print Updated PDF
              </a>
              <a
                href={`/api/orders/${orderId}/documents/pick-list?format=jpeg&download=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                title="Download JPEG Image"
              >
                <FileImage className="h-3.5 w-3.5 text-slate-500" />
              </a>
            </div>
          </div>
        </DialogHeader>

        {/* Alerts */}
        {error && (
          <div className="mx-4 sm:mx-5 mt-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs flex items-center gap-2 shadow-2xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-4 sm:mx-5 mt-3 p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-300 text-xs flex items-center gap-2 shadow-2xs font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600" />
              <div className="text-xs font-semibold">Loading Picking Manifest...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Boxes className="h-8 w-8 mx-auto text-slate-300" />
              <div className="text-xs font-bold text-slate-700">No items found for this pick list</div>
            </div>
          ) : (
            <>
              {/* Progress Summary Card */}
              <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Overall Picking Progress: {totalPickedUnits} / {totalApprovedUnits} Units ({pickProgress}%)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {allPicked
                        ? "All items have been completely picked and verified."
                        : "Enter actual picked quantities or click checkmark to verify each part."}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleMarkAllPicked}
                      className="h-7 text-xs font-bold border-teal-300 text-teal-700 hover:bg-teal-50"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Mark All Full
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleResetAll}
                      className="h-7 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset All
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3 border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      pickProgress === 100
                        ? "bg-emerald-500"
                        : pickProgress > 50
                        ? "bg-teal-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${pickProgress}%` }}
                  />
                </div>
              </Card>

              {/* Items Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Part / Item Manifest ({items.length} SKUs)</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Update picked count and locations
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const isFully = item.pickedQuantity >= item.approvedQuantity && item.approvedQuantity > 0;
                    const isPartial = item.pickedQuantity > 0 && item.pickedQuantity < item.approvedQuantity;

                    return (
                      <div
                        key={item.id || item.sku || index}
                        className={`p-3.5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isFully
                            ? "bg-emerald-50/20"
                            : isPartial
                            ? "bg-amber-50/20"
                            : "hover:bg-slate-50/50"
                        }`}
                      >
                        {/* Left: Product & Locations */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 font-mono">
                              {item.sku}
                            </span>
                            {item.variantName && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-600">
                                {item.variantName}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-slate-700 line-clamp-1">
                            {item.productName}
                          </div>

                          {/* Rack & Bin Quick Inputs */}
                          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              Rack:
                            </span>
                            <Input
                              type="text"
                              value={item.rackLocation}
                              onChange={(e) => handleUpdateItem(index, "rackLocation", e.target.value)}
                              placeholder="Rack"
                              className="h-6 w-16 text-[11px] px-1.5 py-0 font-bold bg-white border-slate-200"
                            />
                            <span className="font-semibold text-slate-700">Bin:</span>
                            <Input
                              type="text"
                              value={item.binLocation}
                              onChange={(e) => handleUpdateItem(index, "binLocation", e.target.value)}
                              placeholder="Bin"
                              className="h-6 w-16 text-[11px] px-1.5 py-0 font-bold bg-white border-slate-200"
                            />
                          </div>
                        </div>

                        {/* Middle: Remarks / Picker Note */}
                        <div className="w-full md:w-48">
                          <Input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => handleUpdateItem(index, "remarks", e.target.value)}
                            placeholder="Optional note / batch..."
                            className="h-7 text-xs bg-white border-slate-200"
                          />
                        </div>

                        {/* Right: Quantity & Picked Status Toggle */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                          {/* Required Qty */}
                          <div className="text-center">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Req</div>
                            <div className="text-xs font-black text-slate-800">
                              {item.approvedQuantity} {item.unit}
                            </div>
                          </div>

                          <ArrowRight className="h-3 w-3 text-slate-300 hidden md:block" />

                          {/* Picked Qty Input */}
                          <div className="text-center">
                            <div className="text-[10px] font-bold text-teal-600 uppercase">Picked</div>
                            <Input
                              type="number"
                              min="0"
                              value={item.pickedQuantity}
                              onChange={(e) => handleUpdateItem(index, "pickedQuantity", e.target.value)}
                              className={`h-8 w-20 text-xs font-black text-center ${
                                isFully
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                                  : isPartial
                                  ? "border-amber-400 bg-amber-50 text-amber-900"
                                  : "border-slate-300 bg-white"
                              }`}
                            />
                          </div>

                          {/* One-click Toggle Button */}
                          <Button
                            type="button"
                            size="sm"
                            variant={isFully ? "default" : "outline"}
                            onClick={() => handleTogglePicked(index)}
                            className={`h-8 px-3 text-xs font-bold ${
                              isFully
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "border-slate-300 text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            {isFully ? "Picked" : "Pick"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assignment & Pick List Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warehouseStaff.length > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">
                      Assigned Warehouse Picker
                    </Label>
                    <select
                      value={assignedToId}
                      onChange={(e) => setAssignedToId(e.target.value)}
                      className="w-full h-8 text-xs rounded-lg border border-slate-300 bg-white px-2 font-medium"
                    >
                      <option value="">Select Staff / Picker...</option>
                      {warehouseStaff.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name || staff.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 flex-1">
                  <Label className="text-xs font-bold text-slate-800">
                    Fulfillment Notes / Warehouse Remarks
                  </Label>
                  <Input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g. Inspected on station 2, ready for carton packing"
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {allPicked ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                All items ready for completion
              </span>
            ) : (
              <span>Tip: Click &quot;Print Updated PDF&quot; at any time to verify the printed sheet.</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-xs h-9 px-3"
            >
              Close
            </Button>

            <Button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving || loading}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs h-9 px-4 shadow-sm"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Updates
            </Button>

            <Button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving || loading}
              className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs h-9 px-4 shadow-sm"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save & Mark Completed
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
