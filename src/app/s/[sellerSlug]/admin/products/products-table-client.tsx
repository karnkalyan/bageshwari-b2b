"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import {
  Printer,
  Edit3,
  Image as ImageIcon,
  Layers,
  Plus,
  MoreHorizontal,
  Power,
  Trash2,
  CheckCircle2,
  XCircle,
  Boxes,
  Store,
  Loader2,
  ExternalLink,
  FileImage,
} from "lucide-react";
import { ProductEditModal, type ProductEditData } from "@/components/admin/product-edit-modal";
import { ProductCreateModal } from "@/components/admin/product-create-modal";
import { BulkProductManagerModal } from "@/components/admin/bulk-product-manager-modal";

export interface SerializedProduct {
  id: string;
  name: string;
  sku: string;
  slug: string;
  status: string;
  unitCode: string;
  categoryId?: string | null;
  brandId?: string | null;
  taxPercent?: number | null;
  categoryTaxPercent?: number | null;
  effectiveVatPercent: number;
  shortDescription?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  mrp: number;
  dealerPrice: number;
  stock: number;
  images: Array<{
    id?: string;
    url: string;
    altText?: string | null;
    isPrimary?: boolean;
    displayOrder?: number;
  }>;
}

interface ProductsTableClientProps {
  products: SerializedProduct[];
  sellerSlug: string;
  globalVatPercent?: number;
  categories?: Array<{ id: string; name: string }>;
  brands?: Array<{ id: string; name: string }>;
}

export function ProductsTableClient({
  products,
  sellerSlug,
  globalVatPercent = 13.0,
  categories = [],
  brands = [],
}: ProductsTableClientProps) {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState<ProductEditData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Client-side quick filter state for status, category, brand
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategoryFilter === "ALL" ||
      (selectedCategoryFilter === "UNASSIGNED" && !p.categoryId && !p.categoryName) ||
      p.categoryId === selectedCategoryFilter ||
      p.categoryName === selectedCategoryFilter;

    const matchesBrand =
      selectedBrandFilter === "ALL" ||
      (selectedBrandFilter === "UNASSIGNED" && !p.brandId && !p.brandName) ||
      p.brandId === selectedBrandFilter ||
      p.brandName === selectedBrandFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      p.status === statusFilter;

    return matchesCategory && matchesBrand && matchesStatus;
  });

  const handleEditClick = (p: SerializedProduct) => {
    setSelectedProduct({
      id: p.id,
      name: p.name,
      sku: p.sku,
      mrp: p.mrp,
      dealerPrice: p.dealerPrice,
      stock: p.stock,
      status: p.status,
      unitCode: p.unitCode || "PCS",
      categoryId: p.categoryId,
      brandId: p.brandId,
      taxPercent: p.taxPercent,
      categoryTaxPercent: p.categoryTaxPercent,
      shortDescription: p.shortDescription,
      categoryName: p.categoryName,
      brandName: p.brandName,
      images: p.images || [],
    });
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = async (product: SerializedProduct) => {
    setActionLoadingId(product.id);
    const nextStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      router.refresh();
    } catch (err) {
      alert("Error updating status: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) {
      return;
    }
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete product");
      router.refresh();
    } catch (err) {
      alert("Error deleting product: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleModalSuccess = () => {
    router.refresh();
  };

  return (
    <>
      {/* Top Action & Filter Toolbar */}
      <div className="p-3 border-b border-border bg-card/60 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="text-xs text-muted-foreground font-medium mr-1">
            Showing <span className="font-bold text-foreground">{filteredProducts.length}</span> of {products.length} items
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-[11px] shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-[11px] shadow-xs focus:outline-none focus:ring-1 focus:ring-ring max-w-[160px] truncate"
              >
                <option value="ALL">All Categories</option>
                <option value="UNASSIGNED">Unassigned Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}

            {/* Brand Filter */}
            {brands.length > 0 && (
              <select
                value={selectedBrandFilter}
                onChange={(e) => setSelectedBrandFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-[11px] shadow-xs focus:outline-none focus:ring-1 focus:ring-ring max-w-[150px] truncate"
              >
                <option value="ALL">All Brands</option>
                <option value="UNASSIGNED">Unassigned Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Buttons: Add Product & Bulk Manager */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs font-bold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBulkModalOpen(true)}
            className="text-xs font-semibold gap-1.5 shadow-xs bg-card hover:bg-muted text-foreground border-border h-8"
          >
            <Layers className="h-3.5 w-3.5 text-primary" />
            Bulk Import / Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-3">Product & SKU</th>
              <th className="px-4 py-3">Category & Brand</th>
              <th className="px-4 py-3 text-right">MRP (Base)</th>
              <th className="px-4 py-3 text-right">MRP (Incl. VAT)</th>
              <th className="px-4 py-3 text-center">VAT Rate</th>
              <th className="px-4 py-3 text-right">Dealer (Base)</th>
              <th className="px-4 py-3 text-right">Dealer (Gross)</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  <Boxes className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="font-semibold text-sm">No products found</p>
                  <p className="text-xs mt-1">Try resetting filters or click &quot;Add Product&quot; above.</p>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const primaryImage = p.images?.find((img) => img.isPrimary) || p.images?.[0];
                const vatRate = p.effectiveVatPercent;
                const mrpGross = p.mrp;
                const mrpBase = vatRate > 0 ? p.mrp / (1 + vatRate / 100) : p.mrp;
                const dealerGross = p.dealerPrice * (1 + vatRate / 100);

                const hasCustomTax = p.taxPercent !== null && p.taxPercent !== undefined;
                const hasCategoryTax = !hasCustomTax && p.categoryTaxPercent !== null && p.categoryTaxPercent !== undefined;
                const isLoading = actionLoadingId === p.id;

                return (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    {/* Product & SKU */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {primaryImage?.url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={primaryImage.url}
                            alt={p.name}
                            className="h-9 w-9 rounded-md object-contain border border-border bg-card p-0.5 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-md border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-foreground line-clamp-1">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                            <span>SKU: {p.sku}</span>
                            {p.images?.length > 0 && (
                              <span className="text-[9px] text-primary">({p.images.length} photo)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Brand */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Boxes className="h-3 w-3 text-primary shrink-0" />
                          <span className="font-medium text-foreground text-[11px] truncate max-w-[130px]">
                            {p.categoryName || <span className="text-muted-foreground italic">Unassigned</span>}
                          </span>
                        </div>
                        {p.brandName && (
                          <div className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                            <Store className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[130px]">{p.brandName}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* MRP Base */}
                    <td className="px-4 py-3.5 text-right font-medium text-muted-foreground">
                      {formatCurrency(mrpBase)}
                    </td>

                    {/* MRP Gross */}
                    <td className="px-4 py-3.5 text-right font-bold text-foreground">
                      <div>{formatCurrency(mrpGross)}</div>
                      <span className="text-[9px] text-muted-foreground font-normal">Incl. {vatRate}% VAT</span>
                    </td>

                    {/* VAT Rate */}
                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          hasCustomTax
                            ? "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                            : hasCategoryTax
                            ? "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {vatRate}% {hasCustomTax ? "Product" : hasCategoryTax ? "Category" : "Global"}
                      </Badge>
                    </td>

                    {/* Dealer Base */}
                    <td className="px-4 py-3.5 text-right font-medium text-muted-foreground">
                      {formatCurrency(p.dealerPrice)}
                    </td>

                    {/* Dealer Gross */}
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      <div>{formatCurrency(dealerGross)}</div>
                      <span className="text-[9px] opacity-70 font-normal">Incl. {vatRate}% VAT</span>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3.5 text-right font-medium text-foreground">
                      {p.stock} {p.unitCode}
                    </td>

                    {/* Status Toggle Button */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        disabled={isLoading}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800"
                        }`}
                        title="Click to toggle status"
                      >
                        {isLoading ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : p.status === "ACTIVE" ? (
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="h-2.5 w-2.5 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{p.status}</span>
                      </button>
                    </td>

                    {/* Actions: Group Button Menu */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(p)}
                          className="h-7 px-2 text-xs font-semibold gap-1 text-foreground"
                          title="Edit product, category, brand & VAT"
                        >
                          <Edit3 className="h-3 w-3" /> Edit
                        </Button>

                        <a
                          href={`/api/products/${p.id}/label`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 px-2 text-xs font-semibold rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 transition"
                          title="Print Barcode Price Sticker (PDF)"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </a>

                        <a
                          href={`/api/products/${p.id}/label?format=jpeg&download=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 px-2 text-xs font-semibold rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-300 transition"
                          title="Download Barcode Price Sticker (JPEG)"
                        >
                          <FileImage className="h-3.5 w-3.5" />
                        </a>

                        {/* Grouped Action Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isLoading}
                              className="h-7 w-7 p-0 text-foreground"
                              title="Product actions"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs">Product Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleEditClick(p)}
                              className="text-xs cursor-pointer gap-2"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-primary" /> Edit & Attach Category/Brand
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="text-xs cursor-pointer gap-2">
                              <a
                                href={`/api/products/${p.id}/label?size=32x20`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Printer className="h-3.5 w-3.5 text-amber-500" /> Thermal Roll (32x20mm)
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="text-xs cursor-pointer gap-2">
                              <a
                                href={`/api/products/${p.id}/label?size=a4_sheet`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Printer className="h-3.5 w-3.5 text-emerald-500" /> A4 Sheet (24 Barcode Grid)
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="text-xs cursor-pointer gap-2">
                              <a
                                href={`/api/products/${p.id}/label?size=a5_sheet`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Printer className="h-3.5 w-3.5 text-teal-500" /> A5 Sheet (12 Barcode Grid)
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="text-xs cursor-pointer gap-2">
                              <a
                                href={`/api/products/${p.id}/label?format=jpeg&download=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <FileImage className="h-3.5 w-3.5 text-blue-500" /> Download Barcode (JPEG)
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(p)}
                              className="text-xs cursor-pointer gap-2"
                            >
                              <Power className={`h-3.5 w-3.5 ${p.status === "ACTIVE" ? "text-rose-500" : "text-emerald-500"}`} />
                              {p.status === "ACTIVE" ? "Deactivate Product" : "Activate Product"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="text-xs cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50 gap-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete / Archive Product
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <ProductEditModal
        product={selectedProduct}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleModalSuccess}
        categories={categories}
        brands={brands}
        globalVatPercent={globalVatPercent}
      />

      {/* Create Modal */}
      <ProductCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleModalSuccess}
        categories={categories}
        brands={brands}
        globalVatPercent={globalVatPercent}
      />

      {/* Bulk Manager Modal */}
      <BulkProductManagerModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        sellerSlug={sellerSlug}
        categories={categories}
        onImportSuccess={handleModalSuccess}
      />
    </>
  );
}
