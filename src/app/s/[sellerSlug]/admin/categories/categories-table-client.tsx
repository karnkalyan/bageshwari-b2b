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
  Boxes,
  Plus,
  MoreHorizontal,
  Edit3,
  Power,
  Trash2,
  Package,
  Search,
  Percent,
  CheckCircle2,
  XCircle,
  FolderTree,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { CategoryModal, type CategoryData } from "@/components/admin/category-modal";

export interface SerializedCategory {
  id: string;
  name: string;
  slug: string;
  code: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  taxPercent: number | null;
  status: string;
  productCount: number;
  subCategoryCount: number;
  createdAt: string;
}

interface CategoriesTableClientProps {
  categories: SerializedCategory[];
  sellerSlug: string;
  globalVatPercent?: number;
}

export function CategoriesTableClient({
  categories,
  sellerSlug,
  globalVatPercent = 13.0,
}: CategoriesTableClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && c.status === "ACTIVE") ||
      (statusFilter === "INACTIVE" && c.status === "INACTIVE");

    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: SerializedCategory) => {
    setSelectedCategory({
      id: c.id,
      name: c.name,
      slug: c.slug,
      code: c.code,
      parentId: c.parentId,
      description: c.description,
      imageUrl: c.imageUrl,
      displayOrder: c.displayOrder,
      taxPercent: c.taxPercent,
      status: c.status,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (category: SerializedCategory) => {
    setActionLoadingId(category.id);
    const nextStatus = category.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
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
    if (!confirm("Are you sure you want to delete this category? Attached products will be unassigned.")) {
      return;
    }
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete category");
      router.refresh();
    } catch (err) {
      alert("Error deleting category: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const existingCategoriesList = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      {/* Header Actions & Filter Bar */}
      <div className="p-4 border-b border-border bg-card/60 flex flex-col md:flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search category by name or code..."
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
              All ({categories.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "ACTIVE" ? "default" : "outline"}
              onClick={() => setStatusFilter("ACTIVE")}
              className="h-8 text-xs px-2.5 gap-1"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Active ({categories.filter((c) => c.status === "ACTIVE").length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "INACTIVE" ? "default" : "outline"}
              onClick={() => setStatusFilter("INACTIVE")}
              className="h-8 text-xs px-2.5 gap-1"
            >
              <XCircle className="h-3 w-3 text-rose-500" />
              Inactive ({categories.filter((c) => c.status === "INACTIVE").length})
            </Button>
          </div>
        </div>

        <Button
          onClick={handleOpenAdd}
          size="sm"
          className="gap-1.5 font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 h-9"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-3">Category Name & Code</th>
              <th className="px-4 py-3">Parent Hierarchy</th>
              <th className="px-4 py-3 text-center">VAT Rate %</th>
              <th className="px-4 py-3 text-center">Attached Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <Boxes className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="font-semibold text-sm">No categories found</p>
                  <p className="text-xs mt-1">Try adjusting your search filter or click &quot;Add Category&quot; above.</p>
                </td>
              </tr>
            ) : (
              filteredCategories.map((c) => {
                const isOverridden = c.taxPercent !== null && c.taxPercent !== undefined;
                const effectiveTax = isOverridden ? c.taxPercent : globalVatPercent;
                const isLoading = actionLoadingId === c.id;

                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {c.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className="h-9 w-9 rounded-md object-cover border border-border bg-card p-0.5 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-md border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            <Boxes className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-2">
                            {c.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2 mt-0.5">
                            <span>Code: {c.code}</span>
                            <span>•</span>
                            <span>/{c.slug}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {c.parentName ? (
                        <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                          <FolderTree className="h-3.5 w-3.5 text-primary" />
                          <span>{c.parentName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Top-level Category</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          isOverridden
                            ? "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {effectiveTax}% {isOverridden ? "Category Override" : "Global"}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <Link
                        href={`/admin/products?search=${encodeURIComponent(c.name)}`}
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                        title="Click to view products in this category"
                      >
                        <Package className="h-3.5 w-3.5" />
                        <span>{c.productCount} product(s)</span>
                      </Link>
                    </td>

                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        disabled={isLoading}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                          c.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800"
                        }`}
                        title="Click to toggle status"
                      >
                        {isLoading ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : c.status === "ACTIVE" ? (
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="h-2.5 w-2.5 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{c.status}</span>
                      </button>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(c)}
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
                            <DropdownMenuLabel className="text-xs">Category Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(c)}
                              className="text-xs cursor-pointer gap-2"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-primary" /> Edit Details & VAT
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(c)}
                              className="text-xs cursor-pointer gap-2"
                            >
                              <Power className={`h-3.5 w-3.5 ${c.status === "ACTIVE" ? "text-rose-500" : "text-emerald-500"}`} />
                              {c.status === "ACTIVE" ? "Set to Inactive" : "Set to Active"}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="text-xs cursor-pointer gap-2">
                              <Link href={`/admin/products?search=${encodeURIComponent(c.name)}`}>
                                <Package className="h-3.5 w-3.5 text-amber-500" /> View Attached Products
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(c.id)}
                              className="text-xs cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50 gap-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete Category
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

      <CategoryModal
        category={selectedCategory}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => router.refresh()}
        existingCategories={existingCategoriesList}
        globalVatPercent={globalVatPercent}
      />
    </>
  );
}
