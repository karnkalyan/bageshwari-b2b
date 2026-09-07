"use client";

import * as React from "react";
import { useState, useEffect } from "react";
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
  Package,
  PackageCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  Tag,
  Truck,
  Box,
  Layers,
  Sparkles,
  Info,
  Check,
  AlertTriangle,
  Scale,
  Maximize2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface OrderItemForPacking {
  id: string;
  sku: string;
  productName: string;
  approvedQuantity: number;
  unitCode?: string;
}

export interface ExistingPackage {
  id: string;
  packageNumber: string;
  packageType?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  status: string;
  handlingInstructions?: string | null;
  itemsJson?: string | null;
}

export interface CartonPackingDialogProps {
  orderId: string;
  orderNumber: string;
  sellerSlug: string;
  dealerName: string;
  dealerCity?: string | null;
  orderItems: OrderItemForPacking[];
  existingPackages?: ExistingPackage[];
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface LocalCarton {
  id?: string;
  packageNumber: string;
  packageType: string;
  length: number | "";
  width: number | "";
  height: number | "";
  weight: number | "";
  handlingInstructions: string;
  items: Record<string, number>; // orderItemId -> quantity packed in this carton
}

const PACKAGE_TYPE_OPTIONS = [
  "Standard Corrugated Carton",
  "Heavy Duty Master Box (7-Ply)",
  "Small Spare Parts Box",
  "Reinforced Wooden Crate",
  "Poly Woven Bag / Sack",
  "Custom Protective Casing",
];

const DIMENSION_PRESETS = [
  { label: "Small (20×15×10 cm)", l: 20, w: 15, h: 10, defaultWt: 3 },
  { label: "Medium (35×25×20 cm)", l: 35, w: 25, h: 20, defaultWt: 7 },
  { label: "Large (50×40×30 cm)", l: 50, w: 40, h: 30, defaultWt: 14 },
  { label: "Master (60×45×40 cm)", l: 60, w: 45, h: 40, defaultWt: 22 },
];

export function CartonPackingDialog({
  orderId,
  orderNumber,
  sellerSlug,
  dealerName,
  dealerCity,
  orderItems,
  existingPackages = [],
  isOpen,
  onClose,
  onSuccess,
  trigger,
}: CartonPackingDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof isOpen === "boolean";
  const open = isControlled ? isOpen : internalOpen;

  const handleClose = () => {
    if (isControlled && onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };

  const [activeCartonIndex, setActiveCartonIndex] = useState(0);
  const [cartons, setCartons] = useState<LocalCarton[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Helper to parse package list into LocalCarton[]
  const parsePackagesToCartons = (pkgs: any[]): LocalCarton[] => {
    return pkgs.map((pkg, idx) => {
      const itemMap: Record<string, number> = {};
      const rawJson = pkg.itemsJson || pkg.items;
      if (rawJson) {
        try {
          const raw = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
          if (Array.isArray(raw)) {
            raw.forEach((it: any) => {
              const foundItem = orderItems.find(
                (oi) => oi.id === it.orderItemId || oi.sku === it.sku || oi.id === it.id
              );
              const id = foundItem?.id || it.orderItemId || it.id;
              if (id) {
                itemMap[id] = Number(it.quantity || 0);
              }
            });
          }
        } catch {}
      }

      return {
        id: pkg.id,
        packageNumber: pkg.packageNumber || `CTN-${String(idx + 1).padStart(2, "0")}`,
        packageType: pkg.packageType || "Standard Corrugated Carton",
        length: pkg.length ? Number(pkg.length) : 35,
        width: pkg.width ? Number(pkg.width) : 25,
        height: pkg.height ? Number(pkg.height) : 20,
        weight: pkg.weight ? Number(pkg.weight) : 5,
        handlingInstructions: pkg.handlingInstructions || "",
        items: itemMap,
      };
    });
  };

  // Initialize or reset cartons whenever dialog opens
  useEffect(() => {
    if (!open) return;

    setError(null);
    setSuccess(null);

    // 1. If existingPackages passed as prop has items, use them immediately
    if (existingPackages && existingPackages.length > 0) {
      setCartons(parsePackagesToCartons(existingPackages));
      setActiveCartonIndex(0);
    } else {
      // Temporary fallback: 1 initial carton
      setCartons([
        {
          packageNumber: "CTN-01",
          packageType: "Standard Corrugated Carton",
          length: 35,
          width: 25,
          height: 20,
          weight: 5,
          handlingInstructions: "FRAGILE - PRECISION BEARINGS",
          items: {},
        },
      ]);
      setActiveCartonIndex(0);
    }

    // 2. Always fetch live packages from the server to get fresh, sealed database records
    let isSubscribed = true;
    setLoadingPackages(true);

    fetch(`/api/orders/${orderId}/packages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isSubscribed) return;
        if (json?.success && json?.data?.packages && json.data.packages.length > 0) {
          const freshCartons = parsePackagesToCartons(json.data.packages);
          setCartons(freshCartons);
          setActiveCartonIndex(0);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote packages:", err);
      })
      .finally(() => {
        if (isSubscribed) setLoadingPackages(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [open, orderId, existingPackages, orderItems]);

  // Compute total ordered units vs. packed units across all cartons
  const totalOrderUnits = orderItems.reduce((sum, it) => sum + it.approvedQuantity, 0);

  const getPackedCountAcrossCartons = (orderItemId: string) => {
    return cartons.reduce((sum, ctn) => sum + (ctn.items[orderItemId] || 0), 0);
  };

  const totalPackedUnits = orderItems.reduce(
    (sum, it) => sum + getPackedCountAcrossCartons(it.id),
    0
  );

  const totalCartonsWeight = cartons.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  // Add a new carton
  const handleAddCarton = () => {
    setCartons((prev) => {
      const nextIdx = prev.length + 1;
      const newCarton: LocalCarton = {
        packageNumber: `CTN-${String(nextIdx).padStart(2, "0")}`,
        packageType: "Standard Corrugated Carton",
        length: 35,
        width: 25,
        height: 20,
        weight: 5,
        handlingInstructions: "",
        items: {},
      };
      return [...prev, newCarton];
    });
    setActiveCartonIndex(cartons.length);
  };

  // Remove a carton
  const handleRemoveCarton = (indexToRemove: number) => {
    if (cartons.length <= 1) return;
    const filtered = cartons.filter((_, idx) => idx !== indexToRemove);
    setCartons(filtered);
    if (activeCartonIndex >= filtered.length) {
      setActiveCartonIndex(filtered.length - 1);
    }
  };

  // Quick Action: Auto-Pack all remaining/all items into Carton 1
  const handleAutoPackAllInOne = () => {
    const fullItems: Record<string, number> = {};
    orderItems.forEach((it) => {
      fullItems[it.id] = it.approvedQuantity;
    });

    const singleCarton: LocalCarton = {
      packageNumber: cartons[0]?.packageNumber || "CTN-01",
      packageType: "Heavy Duty Master Box (7-Ply)",
      length: 50,
      width: 40,
      height: 30,
      weight: Math.max(5, Math.ceil(totalOrderUnits * 0.15)),
      handlingInstructions: "HANDLE WITH CARE",
      items: fullItems,
    };

    setCartons([singleCarton]);
    setActiveCartonIndex(0);
  };

  // Quick Action: Pack all remaining unpacked items into the active carton
  const handlePackRemainingIntoActive = () => {
    const updated = [...cartons];
    const active = { ...updated[activeCartonIndex] };
    const currentActiveItems = { ...active.items };

    orderItems.forEach((it) => {
      const packedInOthers = cartons.reduce((sum, c, idx) => {
        if (idx === activeCartonIndex) return sum;
        return sum + (c.items[it.id] || 0);
      }, 0);
      const remaining = Math.max(0, it.approvedQuantity - packedInOthers);
      currentActiveItems[it.id] = remaining;
    });

    active.items = currentActiveItems;
    updated[activeCartonIndex] = active;
    setCartons(updated);
  };

  // Update item quantity in active carton
  const handleItemQuantityChange = (orderItemId: string, newQty: number) => {
    const safeQty = Math.max(0, Math.floor(newQty || 0));
    const updated = [...cartons];
    const active = { ...updated[activeCartonIndex] };
    active.items = {
      ...active.items,
      [orderItemId]: safeQty,
    };
    updated[activeCartonIndex] = active;
    setCartons(updated);
  };

  // Update field in active carton
  const handleActiveCartonFieldChange = (field: keyof LocalCarton, value: any) => {
    const updated = [...cartons];
    const active = { ...updated[activeCartonIndex], [field]: value };
    updated[activeCartonIndex] = active;
    setCartons(updated);
  };

  // Apply Dimension Preset
  const handleApplyPreset = (preset: (typeof DIMENSION_PRESETS)[0]) => {
    const updated = [...cartons];
    const active = {
      ...updated[activeCartonIndex],
      length: preset.l,
      width: preset.w,
      height: preset.h,
      weight: updated[activeCartonIndex].weight || preset.defaultWt,
    };
    updated[activeCartonIndex] = active;
    setCartons(updated);
  };

  // Save packaging to backend
  const handleSave = async (finalize: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    // Validate carton weights
    for (let i = 0; i < cartons.length; i++) {
      const c = cartons[i];
      if (!c.weight || Number(c.weight) <= 0) {
        setError(`Please enter a valid gross weight (> 0 kg) for Carton #${i + 1} (${c.packageNumber}).`);
        setSubmitting(false);
        setActiveCartonIndex(i);
        return;
      }
    }

    // Format packages payload
    const packagesPayload = cartons.map((c, idx) => {
      const packedItemsList = orderItems
        .filter((oi) => (c.items[oi.id] || 0) > 0)
        .map((oi) => ({
          orderItemId: oi.id,
          sku: oi.sku,
          productName: oi.productName,
          quantity: c.items[oi.id] || 0,
          unitCode: oi.unitCode || "PCS",
        }));

      return {
        packageNumber: c.packageNumber.trim() || `CTN-${String(idx + 1).padStart(2, "0")}`,
        packageType: c.packageType,
        length: c.length ? Number(c.length) : undefined,
        width: c.width ? Number(c.width) : undefined,
        height: c.height ? Number(c.height) : undefined,
        weight: Number(c.weight),
        handlingInstructions: c.handlingInstructions.trim() || undefined,
        items: packedItemsList,
      };
    });

    try {
      const res = await fetch(`/api/orders/${orderId}/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packages: packagesPayload,
          finalize,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || json?.error?.message || "Failed to save carton packaging.");
      }

      setSuccess(
        finalize
          ? "Cartons sealed successfully! Order is marked as PACKED & LABELLED, ready for dispatch."
          : "Carton draft configuration saved successfully."
      );

      if (onSuccess) onSuccess();
      router.refresh();

      if (finalize) {
        setTimeout(() => {
          handleClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save packages.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentCarton = cartons[activeCartonIndex] || cartons[0];

  return (
    <>
      {trigger && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setInternalOpen(true);
          }}
          className="inline-block cursor-pointer"
        >
          {trigger}
        </span>
      )}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-300" />
                <DialogTitle className="text-lg font-bold text-white">
                  Carton Packaging & Packing List Manifest
                </DialogTitle>
                <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/40 text-xs font-mono">
                  {orderNumber}
                </Badge>
                {loadingPackages && (
                  <span className="flex items-center gap-1 text-[11px] text-purple-200 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin text-purple-300" />
                    Loading saved cartons...
                  </span>
                )}
              </div>
              <DialogDescription className="text-xs text-purple-200 mt-1">
                Dealer: {dealerName} {dealerCity && `(${dealerCity})`} • Total Order Units:{" "}
                <strong>{totalOrderUnits} PCS</strong>
              </DialogDescription>
            </div>

            {/* Overall Packed Summary Pill */}
            <div className="flex items-center gap-3 bg-white/10 px-3 py-1.5 rounded-lg border border-white/15 text-xs">
              <div>
                <span className="text-[10px] text-purple-300 block font-semibold uppercase">Total Cartons</span>
                <span className="font-bold text-white">{cartons.length} Box(es)</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div>
                <span className="text-[10px] text-purple-300 block font-semibold uppercase">Gross Weight</span>
                <span className="font-bold text-white">{totalCartonsWeight.toFixed(2)} KG</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div>
                <span className="text-[10px] text-purple-300 block font-semibold uppercase">Total Items</span>
                <span
                  className={`font-bold ${
                    totalPackedUnits === totalOrderUnits
                      ? "text-emerald-300"
                      : totalPackedUnits > totalOrderUnits
                      ? "text-red-300"
                      : "text-amber-300"
                  }`}
                >
                  {totalPackedUnits} / {totalOrderUnits} PCS (
                  {Math.round((totalPackedUnits / (totalOrderUnits || 1)) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Quick Tools & Carton Tabs Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Carton Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {cartons.map((ctn, idx) => {
                const isActive = idx === activeCartonIndex;
                const ctnUnits = Object.values(ctn.items).reduce((sum, q) => sum + q, 0);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveCartonIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                      isActive
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-muted/50 hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    <Box className="h-3.5 w-3.5" />
                    <span>{ctn.packageNumber || `Box #${idx + 1}`}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 ${
                        isActive ? "bg-purple-800/80 text-white border-purple-400" : "bg-card text-muted-foreground"
                      }`}
                    >
                      {ctnUnits} pcs
                    </Badge>
                  </button>
                );
              })}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddCarton}
                className="h-8 text-xs border-dashed border-purple-400 text-purple-700 hover:bg-purple-50 font-bold shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Carton
              </Button>
            </div>

            {/* Smart Shortcuts */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAutoPackAllInOne}
                className="h-7 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50 font-semibold"
                title="Pack all items into a single large master box"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-600" /> Pack All in 1 Box
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handlePackRemainingIntoActive}
                className="h-7 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 font-semibold"
                title="Pack all currently unallocated items into this carton"
              >
                <Layers className="h-3.5 w-3.5 mr-1 text-indigo-600" /> Pack Remaining in This Box
              </Button>
            </div>
          </div>

          {currentCarton && (
            <div className="border rounded-xl p-4 bg-card space-y-4">
              {/* Carton Header Bar */}
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs font-bold">
                    Box {activeCartonIndex + 1} of {cartons.length}
                  </Badge>
                  <Input
                    value={currentCarton.packageNumber}
                    onChange={(e) => handleActiveCartonFieldChange("packageNumber", e.target.value)}
                    placeholder="Carton Number (e.g. CTN-01)"
                    className="h-7 w-36 text-xs font-mono font-bold"
                  />
                </div>

                {cartons.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveCarton(activeCartonIndex)}
                    className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove This Box
                  </Button>
                )}
              </div>

              {/* Carton Dimensions & Weight Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg border">
                {/* Box Type with Presets & Manual Custom Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Carton / Box Type
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        const isPreset = PACKAGE_TYPE_OPTIONS.includes(currentCarton.packageType);
                        handleActiveCartonFieldChange("packageType", isPreset ? "" : PACKAGE_TYPE_OPTIONS[0]);
                      }}
                      className="text-[10px] text-purple-600 hover:underline font-semibold"
                    >
                      {PACKAGE_TYPE_OPTIONS.includes(currentCarton.packageType) ? "Custom Name" : "Presets"}
                    </button>
                  </div>
                  {PACKAGE_TYPE_OPTIONS.includes(currentCarton.packageType) ? (
                    <select
                      value={currentCarton.packageType}
                      onChange={(e) => handleActiveCartonFieldChange("packageType", e.target.value)}
                      className="w-full h-8 text-xs border rounded-md px-2 bg-card text-foreground font-medium outline-none"
                    >
                      {PACKAGE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="text"
                      value={currentCarton.packageType}
                      onChange={(e) => handleActiveCartonFieldChange("packageType", e.target.value)}
                      placeholder="e.g. Wooden Crate 50KG, Poly Bag..."
                      className="h-8 text-xs"
                      autoFocus
                    />
                  )}
                </div>

                {/* Dimensions (L x W x H) */}
                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Maximize2 className="h-3 w-3" /> Dimensions (L × W × H in CM)
                    </Label>
                    <div className="flex items-center gap-1 text-[10px]">
                      {DIMENSION_PRESETS.map((dp, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleApplyPreset(dp)}
                          className="text-purple-600 hover:underline px-1 py-0.5"
                        >
                          {dp.l}×{dp.w}×{dp.h}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="flex items-center">
                      <Input
                        type="number"
                        value={currentCarton.length}
                        onChange={(e) =>
                          handleActiveCartonFieldChange(
                            "length",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        placeholder="L (cm)"
                        className="h-8 text-xs text-center"
                      />
                    </div>
                    <div className="flex items-center">
                      <Input
                        type="number"
                        value={currentCarton.width}
                        onChange={(e) =>
                          handleActiveCartonFieldChange(
                            "width",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        placeholder="W (cm)"
                        className="h-8 text-xs text-center"
                      />
                    </div>
                    <div className="flex items-center">
                      <Input
                        type="number"
                        value={currentCarton.height}
                        onChange={(e) =>
                          handleActiveCartonFieldChange(
                            "height",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        placeholder="H (cm)"
                        className="h-8 text-xs text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Gross Weight */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Scale className="h-3 w-3 text-purple-600" /> Gross Weight (KG) *
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={currentCarton.weight}
                    onChange={(e) =>
                      handleActiveCartonFieldChange(
                        "weight",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="e.g. 5.5"
                    className="h-8 text-xs font-bold text-foreground"
                    required
                  />
                </div>
              </div>

              {/* Handling Instructions */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Handling / Security Instructions
                  </Label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleActiveCartonFieldChange("handlingInstructions", "FRAGILE - THIS SIDE UP")}
                      className="text-amber-700 hover:underline"
                    >
                      + Fragile
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleActiveCartonFieldChange("handlingInstructions", "PRECISION BEARINGS - KEEP DRY")
                      }
                      className="text-blue-700 hover:underline"
                    >
                      + Keep Dry
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleActiveCartonFieldChange("handlingInstructions", "HEAVY WEIGHT - USE CAUTION")}
                      className="text-red-700 hover:underline"
                    >
                      + Heavy Box
                    </button>
                  </div>
                </div>
                <Input
                  value={currentCarton.handlingInstructions}
                  onChange={(e) => handleActiveCartonFieldChange("handlingInstructions", e.target.value)}
                  placeholder="e.g. Fragile contents, Handle with Care, Do not stack above 3 boxes"
                  className="h-8 text-xs"
                />
              </div>

              {/* Items in this Carton */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-purple-600" />
                    <span>Allocate Products to {currentCarton.packageNumber || `Box #${activeCartonIndex + 1}`}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Packed in this box:{" "}
                    <strong className="text-foreground font-bold">
                      {Object.values(currentCarton.items).reduce((sum, q) => sum + q, 0)} Units
                    </strong>
                  </span>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-bold border-b">
                      <tr>
                        <th className="px-3 py-2">Item / SKU</th>
                        <th className="px-3 py-2 text-center">Approved Order Qty</th>
                        <th className="px-3 py-2 text-center">In Other Boxes</th>
                        <th className="px-3 py-2 text-center w-40">Packed In THIS Box</th>
                        <th className="px-3 py-2 text-center">Unallocated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-foreground">
                      {orderItems.map((item) => {
                        const inOtherCartons = cartons.reduce((sum, c, idx) => {
                          if (idx === activeCartonIndex) return sum;
                          return sum + (c.items[item.id] || 0);
                        }, 0);
                        const inThisCarton = currentCarton.items[item.id] || 0;
                        const remaining = item.approvedQuantity - (inOtherCartons + inThisCarton);

                        return (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-foreground">{item.productName}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">{item.sku}</div>
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold">
                              {item.approvedQuantity} {item.unitCode || "PCS"}
                            </td>
                            <td className="px-3 py-2.5 text-center text-muted-foreground">
                              {inOtherCartons > 0 ? (
                                <span className="font-semibold text-blue-600">
                                  {inOtherCartons} {item.unitCode || "PCS"}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleItemQuantityChange(item.id, inThisCarton - 1)}
                                  disabled={inThisCarton <= 0}
                                  className="h-6 w-6 p-0 text-xs"
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.approvedQuantity}
                                  value={inThisCarton}
                                  onChange={(e) => handleItemQuantityChange(item.id, Number(e.target.value))}
                                  className="h-7 w-16 text-center text-xs font-bold"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleItemQuantityChange(item.id, inThisCarton + 1)}
                                  className="h-6 w-6 p-0 text-xs"
                                >
                                  +
                                </Button>
                                {remaining > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleItemQuantityChange(item.id, inThisCarton + remaining)
                                    }
                                    className="text-[10px] text-purple-600 hover:underline ml-1 font-semibold"
                                    title="Add remaining quantity to this carton"
                                  >
                                    All ({remaining})
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {remaining === 0 ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                  ✓ Packed
                                </Badge>
                              ) : remaining > 0 ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                                  {remaining} left
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] font-bold">
                                  +{Math.abs(remaining)} Exceeded
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Printable Documents Toolbar */}
          <div className="p-3 bg-muted/40 rounded-lg border flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                Sealing packages will generate multi-carton labels and finalize the official Packaging List.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/orders/${orderId}/documents/packing-list`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white"
              >
                <PackageCheck className="h-3.5 w-3.5" /> Print Packaging List (PDF)
              </a>
              <a
                href={`/api/orders/${orderId}/documents/package-labels`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Tag className="h-3.5 w-3.5" /> Print Carton Labels (PDF)
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={submitting}
              className="text-xs font-semibold"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Draft Cartons
            </Button>

            <Button
              type="button"
              onClick={() => handleSave(true)}
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Sealing & Generating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm & Seal Packaging
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
