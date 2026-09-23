"use client";

import * as React from "react";
import { useState, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  PackagePlus,
  Loader2,
  Save,
  Upload,
  AlertCircle,
  Percent,
  Image as ImageIcon,
  Calculator,
  Plus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories?: Array<{ id: string; name: string }>;
  brands?: Array<{ id: string; name: string }>;
  globalVatPercent?: number;
}

export function ProductCreateModal({
  isOpen,
  onClose,
  onSuccess,
  categories = [],
  brands = [],
  globalVatPercent = 13.0,
}: ProductCreateModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    categoryId: "",
    brandId: "",
    unitCode: "PCS",
    mrp: 0,
    dealerPrice: 0,
    stock: 10,
    taxPercent: null as number | null,
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
    shortDescription: "",
    imageUrl: "",
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate live effective VAT
  const effectiveVat = formData.taxPercent !== null && formData.taxPercent !== undefined
    ? Number(formData.taxPercent)
    : globalVatPercent;

  const mrpGross = formData.mrp || 0;
  const mrpBase = effectiveVat > 0 ? mrpGross / (1 + effectiveVat / 100) : mrpGross;
  const mrpVatAmount = mrpGross - mrpBase;

  const dealerBase = formData.dealerPrice || 0;
  const dealerGross = dealerBase * (1 + effectiveVat / 100);
  const dealerVatAmount = dealerGross - dealerBase;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setError(null);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Image upload failed.");
      }

      const result = await res.json();
      setFormData((prev) => ({ ...prev, imageUrl: result.data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (formData.mrp <= 0) {
      setError("MRP must be greater than 0.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          sku: formData.sku.trim() || undefined,
          categoryId: formData.categoryId || null,
          brandId: formData.brandId || null,
          unitCode: formData.unitCode || "PCS",
          mrp: Number(formData.mrp),
          dealerPrice: Number(formData.dealerPrice) || 0,
          stock: Number(formData.stock) || 0,
          taxPercent: formData.taxPercent !== null && formData.taxPercent !== ("" as any)
            ? Number(formData.taxPercent)
            : null,
          status: formData.status,
          shortDescription: formData.shortDescription.trim() || null,
          images: formData.imageUrl
            ? [{ url: formData.imageUrl.trim(), altText: formData.name.trim(), isPrimary: true, displayOrder: 0 }]
            : [],
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || json?.message || "Failed to create product.");
      }

      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: "",
        sku: "",
        categoryId: "",
        brandId: "",
        unitCode: "PCS",
        mrp: 0,
        dealerPrice: 0,
        stock: 10,
        taxPercent: null,
        status: "ACTIVE",
        shortDescription: "",
        imageUrl: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <PackagePlus className="h-5 w-5 text-primary" /> Add New Catalogue Product
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Register a new spare part or machinery item with category & brand linkage, pricing, VAT, and initial stock.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Row 1: Name & SKU */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Product Name *</Label>
              <Input
                required
                placeholder="e.g. Clutch Plate 11 Inch - Swaraj 855"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">SKU / Item Code</Label>
              <Input
                placeholder="Auto-generated if left blank"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                className="h-9 text-xs uppercase font-mono"
              />
            </div>
          </div>

          {/* Row 2: Category & Brand selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Attach Category</Label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- Select Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Attach Brand / Manufacturer</Label>
              <select
                value={formData.brandId}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- Select Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Unit Code & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Unit of Measure</Label>
              <select
                value={formData.unitCode}
                onChange={(e) => setFormData({ ...formData, unitCode: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="PCS">PCS (Pieces)</option>
                <option value="SET">SET (Set)</option>
                <option value="PKT">PKT (Packet)</option>
                <option value="LTR">LTR (Litre)</option>
                <option value="KG">KG (Kilogram)</option>
                <option value="PAIR">PAIR (Pair)</option>
                <option value="MTR">MTR (Meter)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Initial Stock</Label>
              <Input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Status</Label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Row 4: Pricing & VAT Live Calculator */}
          <div className="p-4 bg-muted/40 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Calculator className="h-4 w-4 text-primary" />
                <span>Pricing & VAT Rates (Nepal VAT Rules)</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Effective VAT: <strong className="text-primary">{effectiveVat}%</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">MRP (Incl. VAT) *</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">Rs.</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.mrp || ""}
                    onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                    className="pl-9 h-9 text-xs font-bold"
                  />
                </div>
                <div className="text-[10px] text-muted-foreground flex justify-between">
                  <span>Base: {formatCurrency(mrpBase)}</span>
                  <span>VAT: {formatCurrency(mrpVatAmount)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dealer Price (Base)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">Rs.</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.dealerPrice || ""}
                    onChange={(e) => setFormData({ ...formData, dealerPrice: Number(e.target.value) })}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex justify-between">
                  <span>Gross: {formatCurrency(dealerGross)}</span>
                  <span>+{effectiveVat}%</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Product VAT % Override</Label>
                <div className="relative">
                  <Percent className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder={`Global (${globalVatPercent}%)`}
                    value={formData.taxPercent === null || formData.taxPercent === undefined ? "" : formData.taxPercent}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        taxPercent: val === "" ? null : Number(val),
                      });
                    }}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Leave blank to inherit global ({globalVatPercent}%)
                </div>
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Product Photo</Label>
            <div className="flex items-center gap-3">
              {formData.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={formData.imageUrl}
                  alt="Product preview"
                  className="h-12 w-12 rounded-lg object-contain border border-border bg-card p-0.5"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="h-12 w-12 rounded-lg border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="https://... image URL"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="h-8 text-xs flex-1"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs font-medium gap-1.5 shrink-0"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload Photo
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Short Description / Specs</Label>
            <Textarea
              placeholder="e.g. Compatible with Swaraj 735 / 855 / FE tractors, heavy duty friction lining."
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              rows={2}
              className="text-xs"
            />
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5 font-bold shadow-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
