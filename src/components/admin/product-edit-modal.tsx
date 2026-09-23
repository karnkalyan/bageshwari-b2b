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
import { Badge } from "@/components/ui/badge";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Check,
  Star,
  Loader2,
  Save,
  Package,
  Upload,
  Link as LinkIcon,
  AlertCircle,
  Percent,
  Calculator,
  Printer,
  Boxes,
  Store,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface ProductEditData {
  id: string;
  name: string;
  sku: string;
  mrp: number;
  dealerPrice: number;
  stock: number;
  status: string;
  unitCode: string;
  categoryId?: string | null;
  brandId?: string | null;
  taxPercent?: number | null;
  categoryTaxPercent?: number | null;
  shortDescription?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  images: Array<{
    id?: string;
    url: string;
    altText?: string | null;
    isPrimary?: boolean;
    displayOrder?: number;
  }>;
}

interface ProductEditModalProps {
  product: ProductEditData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories?: Array<{ id: string; name: string }>;
  brands?: Array<{ id: string; name: string }>;
  globalVatPercent?: number;
}

export function ProductEditModal({
  product,
  isOpen,
  onClose,
  onSuccess,
  categories = [],
  brands = [],
  globalVatPercent = 13.0,
}: ProductEditModalProps) {
  const [formData, setFormData] = useState<ProductEditData | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        categoryId: product.categoryId || (categories.find(c => c.name === product.categoryName)?.id || ""),
        brandId: product.brandId || (brands.find(b => b.name === product.brandName)?.id || ""),
        images: product.images ? [...product.images] : [],
      });
      setError(null);
      setNewImageUrl("");
    }
  }, [product, isOpen, categories, brands]);

  if (!product || !formData) return null;

  // Effective VAT Rate with normalization
  const rawProductTax = formData.taxPercent !== null && formData.taxPercent !== undefined ? Number(formData.taxPercent) : null;
  const rawCatTax = formData.categoryTaxPercent !== null && formData.categoryTaxPercent !== undefined ? Number(formData.categoryTaxPercent) : null;
  
  const normProductTax = rawProductTax !== null ? (rawProductTax > 0 && rawProductTax <= 1.0 ? rawProductTax * 100 : rawProductTax) : null;
  const normCatTax = rawCatTax !== null ? (rawCatTax > 0 && rawCatTax <= 1.0 ? rawCatTax * 100 : rawCatTax) : null;

  const effectiveVatPercent = normProductTax !== null ? normProductTax : normCatTax !== null ? normCatTax : (globalVatPercent || 13.0);

  // MRP is legally VAT-inclusive in Nepal
  const mrpGross = formData.mrp;
  const mrpBase = effectiveVatPercent > 0 ? formData.mrp / (1 + effectiveVatPercent / 100) : formData.mrp;
  const dealerGross = formData.dealerPrice * (1 + effectiveVatPercent / 100);

  // 1. Handle Direct File Upload
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
        throw new Error(json?.message || json?.error?.message || "Upload failed.");
      }

      const result = await res.json();
      const isFirst = formData.images.length === 0;

      setFormData({
        ...formData,
        images: [
          ...formData.images,
          {
            url: result.data.url,
            altText: formData.name,
            isPrimary: isFirst,
            displayOrder: formData.images.length,
          },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 2. Handle Add by URL
  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    const isFirst = formData.images.length === 0;
    setFormData({
      ...formData,
      images: [
        ...formData.images,
        {
          url,
          altText: formData.name,
          isPrimary: isFirst,
          displayOrder: formData.images.length,
        },
      ],
    });
    setNewImageUrl("");
  };

  const handleRemoveImage = (index: number) => {
    const updated = formData.images.filter((_, idx) => idx !== index);
    if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setFormData({ ...formData, images: updated });
  };

  const handleSetPrimary = (index: number) => {
    const updated = formData.images.map((img, idx) => ({
      ...img,
      isPrimary: idx === index,
    }));
    setFormData({ ...formData, images: updated });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          categoryId: formData.categoryId || null,
          brandId: formData.brandId || null,
          mrp: formData.mrp,
          dealerPrice: formData.dealerPrice,
          stock: formData.stock,
          status: formData.status,
          unitCode: formData.unitCode,
          taxPercent: formData.taxPercent,
          shortDescription: formData.shortDescription,
          images: formData.images,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || json?.error?.message || "Failed to update product.");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Package className="h-5 w-5 text-primary" /> Edit Product, Category, Brand & VAT
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure product metadata, category & brand linkage, pricing, VAT % override, and manage product photos.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6 pt-2">
          {/* 1. Core Fields: Name & SKU */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Product Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 h-8 text-xs font-bold"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">SKU / Part Code</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* 2. Category, Brand, Unit Code & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Boxes className="h-3 w-3 text-primary" /> Category
              </Label>
              <select
                value={formData.categoryId || ""}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || null })}
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- No Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Store className="h-3 w-3 text-purple-500" /> Brand
              </Label>
              <select
                value={formData.brandId || ""}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value || null })}
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- No Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Unit of Measure</Label>
              <select
                value={formData.unitCode || "PCS"}
                onChange={(e) => setFormData({ ...formData, unitCode: e.target.value })}
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
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

            <div>
              <Label className="text-xs font-semibold">Status</Label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DISCONTINUED">Discontinued</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* 3. Pricing & VAT Configuration */}
          <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-emerald-600" /> Pricing & VAT Taxation
              </span>
              <Badge variant="outline" className="text-[10px] font-semibold">
                Effective VAT: {effectiveVatPercent}%{" "}
                {formData.taxPercent !== null && formData.taxPercent !== undefined
                  ? "(Custom Product Rate)"
                  : formData.categoryTaxPercent !== null && formData.categoryTaxPercent !== undefined
                  ? "(Category Rate)"
                  : "(Global Setting)"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-foreground">MRP (VAT Included)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                  className="mt-1 h-8 text-xs font-bold"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-foreground">Dealer Price (Net)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.dealerPrice}
                  onChange={(e) => setFormData({ ...formData, dealerPrice: parseFloat(e.target.value) || 0 })}
                  className="mt-1 h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-foreground">Product VAT % Override</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Inherit (Global/Cat)"
                  value={formData.taxPercent !== null && formData.taxPercent !== undefined ? formData.taxPercent : ""}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setFormData({
                      ...formData,
                      taxPercent: val === "" ? null : parseFloat(val) || 0,
                    });
                  }}
                  className="mt-1 h-8 text-xs font-bold"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-foreground">Available Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                  className="mt-1 h-8 text-xs font-bold"
                />
              </div>
            </div>

            {/* Live Gross Calculation Preview & Quick Print */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="font-semibold text-emerald-950 dark:text-emerald-200">
                    Label Price Preview (Incl. {effectiveVatPercent}% VAT):
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span>
                    MRP Incl. VAT: <strong className="text-emerald-900 dark:text-emerald-300">{formatCurrency(mrpGross)}</strong>
                  </span>
                  <span>
                    Dealer Rate Incl. VAT: <strong className="text-emerald-900 dark:text-emerald-300">{formatCurrency(dealerGross)}</strong>
                  </span>
                </div>
              </div>

              {formData.id && (
                <a
                  href={`/api/products/${formData.id}/label`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-amber-400 bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Price Sticker
                </a>
              )}
            </div>
          </div>

          {/* 4. Description */}
          <div>
            <Label className="text-xs font-semibold">Short Description / Fitment Notes</Label>
            <Textarea
              value={formData.shortDescription || ""}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="e.g. For Swaraj 735/855/935 tractors. Made from high carbon steel."
              className="mt-1 text-xs"
              rows={2}
            />
          </div>

          {/* 5. Product Images Management */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-primary" /> Product Photos ({formData.images.length})
              </Label>
              <span className="text-[11px] text-muted-foreground">First or starred image will be catalog cover photo</span>
            </div>

            {/* Upload Buttons */}
            <div className="flex flex-wrap items-center gap-2">
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
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload from Computer
              </Button>

              <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
                <Input
                  placeholder="Or paste image URL (https://...)"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddImageUrl}
                  className="h-8 text-xs font-semibold shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add URL
                </Button>
              </div>
            </div>

            {/* Image Grid */}
            {formData.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                {formData.images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative group rounded-lg border-2 p-1 bg-card transition-all ${
                      img.isPrimary ? "border-primary shadow-sm" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="aspect-square w-full rounded overflow-hidden bg-muted flex items-center justify-center relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.altText || `Photo ${idx + 1}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />

                      {img.isPrimary && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Cover
                        </div>
                      )}
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSetPrimary(idx)}
                        className={`h-6 px-1.5 text-[10px] ${
                          img.isPrimary ? "text-amber-500 font-bold" : "text-muted-foreground hover:text-amber-500"
                        }`}
                        title="Set as Primary Cover Photo"
                      >
                        <Star className={`h-3 w-3 ${img.isPrimary ? "fill-amber-400 text-amber-500" : ""}`} />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveImage(idx)}
                        className="h-6 px-1.5 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                        title="Remove Photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border border-dashed border-border rounded-xl text-center bg-muted/30">
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-1" />
                <p className="text-xs font-semibold text-muted-foreground">No photos attached yet</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  Upload photos so dealers and customers can view the parts clearly.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            {formData.id && (
              <a
                href={`/api/products/${formData.id}/label`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 transition"
              >
                <Printer className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" /> Label
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
