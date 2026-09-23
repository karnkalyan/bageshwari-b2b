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
  Store,
  Loader2,
  Save,
  Upload,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";

export interface BrandData {
  id?: string;
  name: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
  status: string;
}

interface BrandModalProps {
  brand?: BrandData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BrandModal({
  brand,
  isOpen,
  onClose,
  onSuccess,
}: BrandModalProps) {
  const isEditing = Boolean(brand?.id);
  const [formData, setFormData] = useState<BrandData>({
    name: "",
    slug: "",
    description: "",
    logoUrl: "",
    status: "ACTIVE",
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (brand) {
      setFormData({
        id: brand.id,
        name: brand.name || "",
        slug: brand.slug || "",
        description: brand.description || "",
        logoUrl: brand.logoUrl || "",
        status: brand.status || "ACTIVE",
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        logoUrl: "",
        status: "ACTIVE",
      });
    }
    setError(null);
  }, [brand, isOpen]);

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
        throw new Error(json?.message || "Logo upload failed.");
      }

      const result = await res.json();
      setFormData((prev) => ({ ...prev, logoUrl: result.data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading logo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Brand name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/admin/brands/${formData.id}`
        : `/api/admin/brands`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug?.trim() || undefined,
          description: formData.description?.trim() || null,
          logoUrl: formData.logoUrl?.trim() || null,
          status: formData.status,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || json?.message || "Failed to save brand.");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving brand.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Store className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Manufacturer / Brand" : "Add New Brand"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Update brand information, logo, and active catalogue status."
              : "Register a tractor manufacturer, spare parts brand, or supplier label."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Brand / Manufacturer Name *</Label>
            <Input
              required
              placeholder="e.g. Mahindra, Swaraj, Sonalika, Bosch"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-9 text-xs"
            />
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

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Brand Logo / Emblem</Label>
            <div className="flex items-center gap-3">
              {formData.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={formData.logoUrl}
                  alt="Brand Logo"
                  className="h-12 w-12 rounded-lg object-contain border border-border bg-white p-1"
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
                    placeholder="https://... logo URL"
                    value={formData.logoUrl || ""}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
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
              placeholder="Brief details or origin of this brand..."
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
              {isEditing ? "Save Changes" : "Create Brand"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
