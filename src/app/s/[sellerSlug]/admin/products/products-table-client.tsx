"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Printer, Edit3, Image as ImageIcon, Percent } from "lucide-react";
import { ProductEditModal, type ProductEditData } from "@/components/admin/product-edit-modal";

export interface SerializedProduct {
  id: string;
  name: string;
  sku: string;
  slug: string;
  status: string;
  unitCode: string;
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
}

export function ProductsTableClient({
  products,
  sellerSlug,
  globalVatPercent = 13.0,
}: ProductsTableClientProps) {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState<ProductEditData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      taxPercent: p.taxPercent,
      categoryTaxPercent: p.categoryTaxPercent,
      shortDescription: p.shortDescription,
      categoryName: p.categoryName,
      brandName: p.brandName,
      images: p.images || [],
    });
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-3">Product & SKU</th>
              <th className="px-4 py-3">Images</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">MRP (Base)</th>
              <th className="px-4 py-3 text-right">MRP (Incl. VAT)</th>
              <th className="px-4 py-3 text-center">VAT Rate</th>
              <th className="px-4 py-3 text-right">Dealer Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {products.map((p) => {
              const primaryImage = p.images?.find((img) => img.isPrimary) || p.images?.[0];
              const vatRate = p.effectiveVatPercent;
              const mrpGross = p.mrp * (1 + vatRate / 100);

              const hasCustomTax = p.taxPercent !== null && p.taxPercent !== undefined;
              const hasCategoryTax = !hasCustomTax && p.categoryTaxPercent !== null && p.categoryTaxPercent !== undefined;

              return (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {primaryImage?.url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={primaryImage.url}
                          alt={p.name}
                          className="h-9 w-9 rounded-md object-contain border bg-white p-0.5 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-md border border-dashed bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 line-clamp-1">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50">
                      {p.images?.length || 0} photo(s)
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">{p.categoryName || "General"}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-500">{formatCurrency(p.mrp)}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                    <div>{formatCurrency(mrpGross)}</div>
                    <span className="text-[9px] text-slate-400 font-normal">Incl. {vatRate}% VAT</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge
                      className={`text-[10px] font-bold ${
                        hasCustomTax
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : hasCategoryTax
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {vatRate}% {hasCustomTax ? "Product" : hasCategoryTax ? "Category" : "Global"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{formatCurrency(p.dealerPrice)}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-900">{p.stock} {p.unitCode}</td>
                  <td className="px-4 py-3.5">
                    <Badge
                      className={`text-[10px] ${
                        p.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`/api/products/${p.id}/label`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition shrink-0"
                        title="Print Barcode Price Sticker (MRP + VAT)"
                      >
                        <Printer className="h-3.5 w-3.5 text-amber-700" /> Print Label
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(p)}
                        className="h-7 text-xs font-semibold flex items-center gap-1 text-[#0b2d55]"
                      >
                        <Edit3 className="h-3 w-3" /> Edit & VAT
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ProductEditModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
