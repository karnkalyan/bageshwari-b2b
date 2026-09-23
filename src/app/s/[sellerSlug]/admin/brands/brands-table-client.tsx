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
import {
  Store,
  Plus,
  MoreHorizontal,
  Edit3,
  Power,
  Trash2,
  Package,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { BrandModal, type BrandData } from "@/components/admin/brand-modal";

export interface SerializedBrand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: string;
  productCount: number;
  createdAt: string;
}

interface BrandsTableClientProps {
  brands: SerializedBrand[];
  sellerSlug: string;
}

export function BrandsTableClient({
  brands,
  sellerSlug,
}: BrandsTableClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBrand, setSelectedBrand] = useState<BrandData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filteredBrands = brands.filter((b) => {
    const matchesSearch =
      search === "" ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && b.status === "ACTIVE") ||
      (statusFilter === "INACTIVE" && b.status === "INACTIVE");

    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setSelectedBrand(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: SerializedBrand) => {
    setSelectedBrand({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      logoUrl: b.logoUrl,
      status: b.status,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (brand: SerializedBrand) => {
    setActionLoadingId(brand.id);
    const nextStatus = brand.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      router.refresh();
    } catch (err) {
      alert("Error updating status: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this brand? Attached products will remain but will have no brand assigned.")) {
      return;
    }
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/brands/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete brand");
      router.refresh();
    } catch (err) {
      alert("Error deleting brand: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      {/* Header Controls */}
      <div className="p-4 border-b border-border bg-card/60 flex flex-col md:flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search brand by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={statusFilter === "ALL" ? "default" : "outline"}
              onClick={() => setStatusFilter("ALL")}
              className="h-8 text-xs px-2.5"
            >
              All ({brands.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "ACTIVE" ? "default" : "outline"}
              onClick={() => setStatusFilter("ACTIVE")}
              className="h-8 text-xs px-2.5 gap-1"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Active ({brands.filter((b) => b.status === "ACTIVE").length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "INACTIVE" ? "default" : "outline"}
              onClick={() => setStatusFilter("INACTIVE")}
              className="h-8 text-xs px-2.5 gap-1"
            >
              <XCircle className="h-3 w-3 text-rose-500" />
              Inactive ({brands.filter((b) => b.status === "INACTIVE").length})
            </Button>
          </div>
        </div>

        <Button
          onClick={handleOpenAdd}
          size="sm"
          className="gap-1.5 font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 h-9"
        >
          <Plus className="h-4 w-4" />
          Add Brand
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-3">Brand & Manufacturer</th>
              <th className="px-4 py-3">Description / Origin</th>
              <th className="px-4 py-3 text-center">Linked Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {filteredBrands.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <Store className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="font-semibold text-sm">No brands found</p>
                  <p className="text-xs mt-1">Click &quot;Add Brand&quot; to create a new manufacturer or supplier brand.</p>
                </td>
              </tr>
            ) : (
              filteredBrands.map((b) => {
                const isLoading = actionLoadingId === b.id;

                return (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {b.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={b.logoUrl}
                            alt={b.name}
                            className="h-9 w-9 rounded-md object-contain border border-border bg-white p-0.5 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-md border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            <Store className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-foreground text-sm">{b.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">/{b.slug}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 max-w-xs truncate text-muted-foreground">
                      {b.description || "No description provided"}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <Link
                        href={`/admin/products?search=${encodeURIComponent(b.name)}`}
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                        title="Click to view products under this brand"
                      >
                        <Package className="h-3.5 w-3.5" />
                        <span>{b.productCount} product(s)</span>
                      </Link>
                    </td>

                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(b)}
                        disabled={isLoading}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                          b.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800"
                        }`}
                        title="Click to toggle status"
                      >
                        {isLoading ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : b.status === "ACTIVE" ? (
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="h-2.5 w-2.5 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{b.status}</span>
                      </button>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(b)}
                          className="h-7 px-2 text-xs font-semibold gap-1 text-foreground"
                        >
                          <Edit3 className="h-3 w-3" /> Edit
                        </Button>

                        {/* Group Action Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isLoading}
                              className="h-7 w-7 p-0 text-foreground"
                              title="More actions"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Brand Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(b)}
                              className="text-xs cursor-pointer gap-2"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-primary" /> Edit Brand Info
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(b)}
                              className="text-xs cursor-pointer gap-2"
                            >
                              <Power className={`h-3.5 w-3.5 ${b.status === "ACTIVE" ? "text-rose-500" : "text-emerald-500"}`} />
                              {b.status === "ACTIVE" ? "Set to Inactive" : "Set to Active"}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="text-xs cursor-pointer gap-2">
                              <Link href={`/admin/products?search=${encodeURIComponent(b.name)}`}>
                                <Package className="h-3.5 w-3.5 text-amber-500" /> View Brand Products
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(b.id)}
                              className="text-xs cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50 gap-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete Brand
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

      <BrandModal
        brand={selectedBrand}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
