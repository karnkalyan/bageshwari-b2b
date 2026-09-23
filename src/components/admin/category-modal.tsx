"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
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
  Boxes,
  Loader2,
  Save,
  Upload,
  Link as LinkIcon,
  AlertCircle,
  Percent,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

export interface CategoryData {
  id?: string;
  name: string;
  slug?: string;
  code?: string;
  parentId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
  taxPercent?: number | null;
  status: string;
}

interface CategoryModalProps {
  category?: CategoryData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingCategories?: Array<{ id: string; name: string }>;
  globalVatPercent?: number;
}

export function CategoryModal({
  category,
  isOpen,
  onClose,
  onSuccess,
  existingCategories = [],
  globalVatPercent = 13.0,
}: CategoryModalProps) {
  const isEditing = Boolean(category?.id);
  const [formData, setFormData] = useState<CategoryData>({
    name: "",
    slug: "",
    code: "",
    parentId: null,
    description: "",
    imageUrl: "",
    displayOrder: 0,
    taxPercent: null,
    status: "ACTIVE",
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (category) {
      setFormData({
        id: category.id,
        name: category.name || "",
        slug: category.slug || "",
        code: category.code || "",
        parentId: category.parentId || null,
        description: category.description || "",
        imageUrl: category.imageUrl || "",
        displayOrder: category.displayOrder ?? 0,
        taxPercent: category.taxPercent !== undefined ? category.taxPercent : null,
        status: category.status || "ACTIVE",
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        code: "",
        parentId: null,
        description: "",
        imageUrl: "",
        displayOrder: 0,
        taxPercent: null,
        status: "ACTIVE",
      });
    }
    setError(null);
  }, [category, isOpen]);

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
      setError("Category name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/admin/categories/${formData.id}`
        : `/api/admin/categories`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug?.trim() || undefined,
          code: formData.code?.trim() || undefined,
          parentId: formData.parentId || null,
          description: formData.description?.trim() || null,
          imageUrl: formData.imageUrl?.trim() || null,
          displayOrder: Number(formData.displayOrder) || 0,
          taxPercent: formData.taxPercent !== null && formData.taxPercent !== undefined && formData.taxPercent !== ("" as any)
            ? Number(formData.taxPercent)
            : null,
          status: formData.status,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || json?.message || "Failed to save category.");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving category.");
    } finally {
      setSaving(false);
    }
  };

  const otherCategories = existingCategories.filter((c) => !formData.id || c.id !== formData.id);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Boxes className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Category" : "Add New Category"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Update category details, VAT rate override, hierarchy, and status."
              : "Create a new product category with custom VAT % and parent hierarchy."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category Name *</Label>
              <Input
                required
                placeholder="e.g. Engine Parts, Hydraulic Cylinders"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category Code (Optional)</Label>
              <Input
                placeholder="e.g. CAT-ENG-01"
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="h-9 text-xs uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Parent Category (Optional)</Label>
              <select
                value={formData.parentId || ""}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">None (Top-Level Category)</option>
                {otherCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Status</Label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>
          </div>

          {/* VAT Rate Override */}
          <div className="p-3.5 bg-muted/40 rounded-lg border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Percent className="h-3.5 w-3.5 text-primary" />
                <span>Category VAT Rate Override %</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Company Global VAT: <strong className="text-foreground">{globalVatPercent}%</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder={`Inherit global rate (${globalVatPercent}%)`}
                value={formData.taxPercent === null || formData.taxPercent === undefined ? "" : formData.taxPercent}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    taxPercent: val === "" ? null : Number(val),
                  });
                }}
                className="h-9 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, taxPercent: null })}
                className="h-9 text-xs shrink-0"
              >
                Reset to Global
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              All products assigned to this category will inherit this VAT % unless individually overridden on the product.
            </p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Category Photo / Icon</Label>
            <div className="flex items-center gap-3">
              {formData.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={formData.imageUrl}
                  alt="Category preview"
                  className="h-12 w-12 rounded-lg object-cover border border-border bg-muted p-0.5"
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
                    value={formData.imageUrl || ""}
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
                    Upload
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Description (Optional)</Label>
            <Textarea
              placeholder="Brief description of parts and components in this category..."
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5 font-bold shadow-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isEditing ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
