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
}

export function ProductEditModal({
  product,
  isOpen,
  onClose,
  onSuccess,
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
        images: product.images ? [...product.images] : [],
      });
      setError(null);
      setNewImageUrl("");
    }
  }, [product, isOpen]);

  if (!product || !formData) return null;

  // Effective VAT Rate with normalization
  const rawProductTax = formData.taxPercent !== null && formData.taxPercent !== undefined ? Number(formData.taxPercent) : null;
  const rawCatTax = formData.categoryTaxPercent !== null && formData.categoryTaxPercent !== undefined ? Number(formData.categoryTaxPercent) : null;
  
  const normProductTax = rawProductTax !== null ? (rawProductTax > 0 && rawProductTax <= 1.0 ? rawProductTax * 100 : rawProductTax) : null;
  const normCatTax = rawCatTax !== null ? (rawCatTax > 0 && rawCatTax <= 1.0 ? rawCatTax * 100 : rawCatTax) : null;

  const effectiveVatPercent = normProductTax !== null ? normProductTax : normCatTax !== null ? normCatTax : 13.0;

  const mrpGross = formData.mrp * (1 + effectiveVatPercent / 100);
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
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-[#0b2d55]">
            <Package className="h-5 w-5 text-primary" /> Edit Product, VAT & Images
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure product metadata, pricing, individual VAT % override, and manage product photos.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6 pt-2">
          {/* 1. Core Fields */}
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

          {/* 2. Pricing & VAT Configuration */}
          <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-emerald-600" /> Pricing & VAT Taxation
              </span>
              <Badge variant="outline" className="text-[10px] bg-white font-semibold">
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
                <Label className="text-[11px] font-semibold text-slate-700">MRP (Net Base)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                  className="mt-1 h-8 text-xs font-bold bg-white"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-700">Dealer Price (Net)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.dealerPrice}
                  onChange={(e) => setFormData({ ...formData, dealerPrice: parseFloat(e.target.value) || 0 })}
                  className="mt-1 h-8 text-xs font-bold bg-white text-emerald-700"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-700">Product VAT % Override</Label>
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
                  className="mt-1 h-8 text-xs bg-white font-bold"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-700">Available Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                  className="mt-1 h-8 text-xs bg-white font-bold"
                />
              </div>
            </div>

            {/* Live Gross Calculation Preview & Quick Print */}
            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-emerald-700" />
                  <span className="font-semibold text-emerald-950">
                    Label Price Preview (Incl. {effectiveVatPercent}% VAT):
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span>
                    MRP Incl. VAT: <strong className="text-emerald-900">{formatCurrency(mrpGross)}</strong>
                  </span>
                  <span>
                    Dealer Rate Incl. VAT: <strong className="text-emerald-900">{formatCurrency(dealerGross)}</strong>
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

          {/* 3. Photos / Images Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-900">Product Photos ({formData.images.length})</Label>
              <span className="text-[11px] text-slate-400">First/starred image will be the primary catalog thumbnail</span>
            </div>

            {/* Image Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {formData.images.map((img, idx) => (
                <div
                  key={img.url + idx}
                  className={`relative group rounded-xl border p-1 bg-white flex flex-col items-center justify-between transition-all ${
                    img.isPrimary ? "ring-2 ring-primary border-primary bg-blue-50/20" : "hover:border-slate-300"
                  }`}
                >
                  <div className="relative w-full h-24 flex items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.altText || "Product"} className="max-h-full max-w-full object-contain" />
                    {img.isPrimary && (
                      <Badge className="absolute top-1 left-1 text-[9px] bg-primary text-white px-1.5 py-0">
                        Primary
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between w-full mt-2 pt-1 border-t px-1">
                    {!img.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(idx)}
                        className="text-[10px] text-slate-500 hover:text-primary flex items-center gap-0.5"
                      >
                        <Star className="h-3 w-3" /> Set Primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 ml-auto"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Upload or Add by URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 border border-dashed rounded-xl bg-slate-50/50 flex items-center justify-between gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Upload New Photo</div>
                  <div className="text-[10px] text-slate-400">JPG, PNG, WebP up to 5MB</div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs font-semibold"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                  Browse
                </Button>
              </div>

              <div className="p-3 border rounded-xl bg-slate-50/50 flex items-center gap-2">
                <Input
                  placeholder="Or paste direct image URL..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddImageUrl}
                  disabled={!newImageUrl.trim()}
                  className="h-8 text-xs font-semibold shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 mt-2 flex items-center justify-between sm:justify-between">
          <div>
            {formData.id && (
              <a
                href={`/api/products/${formData.id}/label`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
              >
                <Printer className="h-3.5 w-3.5 text-amber-600" /> Print Label Sticker
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0b2d55] hover:bg-[#124177] text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save Product & Pricing
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
