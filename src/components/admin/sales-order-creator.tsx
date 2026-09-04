"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Building2,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Package,
  Send,
  Save,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  Layers,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";

export interface SerializedDealer {
  id: string;
  code: string;
  tradingName: string | null;
  legalName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  availableCredit: number;
  creditLimit: number;
  addressSummary?: string;
}

export interface SerializedProduct {
  id: string;
  name: string;
  sku: string;
  unitCode: string;
  defaultPrice: number;
  mrp: number;
  categoryName?: string;
  variants: {
    id: string;
    name: string;
    sku: string;
    mrp: number;
    price: number;
  }[];
}

interface SalesOrderItem {
  productId: string;
  variantId?: string | null;
  sku: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  mrp: number;
  discountAmount: number;
  remarks?: string;
}

interface SalesOrderCreatorProps {
  sellerSlug: string;
  dealers: SerializedDealer[];
  products: SerializedProduct[];
  initialDealerId?: string;
  isDealer?: boolean;
  initialCategories?: string[];
}

export function SalesOrderCreator({
  sellerSlug,
  dealers,
  products,
  initialDealerId,
  isDealer = false,
  initialCategories,
}: SalesOrderCreatorProps) {
  const router = useRouter();

  // State
  const [selectedDealerId, setSelectedDealerId] = useState<string>(initialDealerId || (dealers[0]?.id || ""));
  const [dealerSearchOpen, setDealerSearchOpen] = useState(false);
  const [dealerQuery, setDealerQuery] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Dynamic server product state
  const [displayedProducts, setDisplayedProducts] = useState<SerializedProduct[]>(products);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  // Mobile App Navigation & UI state
  const [mobileView, setMobileView] = useState<"products" | "cart">("products");
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  const [orderItems, setOrderItems] = useState<SalesOrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [freightTotal, setFreightTotal] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger brief floating toast and cart bounce
  const showToast = (message: string) => {
    const id = Date.now();
    setToast({ message, id });
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 450);
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2200);
  };

  // Selected Dealer
  const currentDealer = dealers.find((d) => d.id === selectedDealerId);

  // Filtered Dealers for combobox with key up search
  const filteredDealers = useMemo(() => {
    if (!dealerQuery.trim()) return dealers;
    const q = dealerQuery.toLowerCase().trim();
    return dealers.filter((d) => {
      const legalName = (d.legalName || "").toLowerCase();
      const tradingName = (d.tradingName || "").toLowerCase();
      const code = (d.code || "").toLowerCase();
      const contact = (d.contactName || "").toLowerCase();
      const phone = (d.phone || "").toLowerCase();
      const email = (d.email || "").toLowerCase();

      return (
        legalName.includes(q) ||
        tradingName.includes(q) ||
        code.includes(q) ||
        contact.includes(q) ||
        phone.includes(q) ||
        email.includes(q)
      );
    });
  }, [dealers, dealerQuery]);

  // Extract unique categories (combines server-provided categories + products)
  const categories = useMemo(() => {
    const set = new Set<string>();
    if (initialCategories && initialCategories.length > 0) {
      initialCategories.forEach((c) => {
        if (c) set.add(c);
      });
    }
    products.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return ["ALL", ...Array.from(set)];
  }, [products, initialCategories]);

  // Synchronize initial products if props change
  useEffect(() => {
    if (!productSearch.trim()) {
      setDisplayedProducts(products);
    }
  }, [products]);

  // Debounced server search across full 3,500+ product catalog on key up
  useEffect(() => {
    const trimmed = productSearch.trim();
    if (trimmed.length < 2) {
      setDisplayedProducts(products);
      setIsSearchingProducts(false);
      return;
    }

    setIsSearchingProducts(true);
    const timer = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams({
          search: trimmed,
          pageSize: "50",
        });
        if (selectedCategory && selectedCategory !== "ALL") {
          queryParams.set("category", selectedCategory);
        }

        const res = await fetch(`/api/products?${queryParams.toString()}`);
        const json = await res.json();
        if (json.success && json.data?.items) {
          const mapped: SerializedProduct[] = json.data.items.map((p: any) => {
            const firstVariant = p.variants?.[0];
            const defaultPrice = firstVariant?.dealerPrice || firstVariant?.mrp || 0;
            const mrp = firstVariant?.mrp || defaultPrice;
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              unitCode: p.unitCode || "PCS",
              categoryName: p.category?.name,
              defaultPrice,
              mrp,
              variants: (p.variants || []).map((v: any) => ({
                id: v.id,
                name: v.name,
                sku: v.sku,
                mrp: v.mrp || mrp,
                price: v.dealerPrice || v.mrp || defaultPrice,
              })),
            };
          });
          setDisplayedProducts(mapped);
        }
      } catch (err) {
        console.error("Error searching products:", err);
      } finally {
        setIsSearchingProducts(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [productSearch, selectedCategory, products]);

  // Filtered Products for local category / search
  const filteredProducts = useMemo(() => {
    if (productSearch.trim().length >= 2) {
      return displayedProducts;
    }
    return displayedProducts.filter((p) => {
      const matchCategory =
        selectedCategory === "ALL" || p.categoryName === selectedCategory;
      const q = productSearch.toLowerCase().trim();
      if (!q) return matchCategory;
      const pName = (p.name || "").toLowerCase();
      const pSku = (p.sku || "").toLowerCase();
      return matchCategory && (pName.includes(q) || pSku.includes(q));
    });
  }, [displayedProducts, productSearch, selectedCategory]);

  // Fast 1-Click Add / Increment
  const handleQuickAdd = (product: SerializedProduct, variantId?: string) => {
    const variant = variantId
      ? product.variants.find((v) => v.id === variantId)
      : product.variants[0];

    const targetVariantId = variant?.id || null;
    const sku = variant ? variant.sku : product.sku;
    const unitPrice = variant?.price || product.defaultPrice;
    const mrp = variant?.mrp || product.mrp || unitPrice;
    const name = variant ? `${product.name} (${variant.name})` : product.name;

    setOrderItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.productId === product.id && it.variantId === targetVariantId
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      }

      return [
        ...prev,
        {
          productId: product.id,
          variantId: targetVariantId,
          sku,
          productName: name,
          variantName: variant?.name || null,
          quantity: 1,
          unitPrice,
          mrp,
          discountAmount: 0,
        },
      ];
    });

    showToast(`Added ${name} to order`);
  };

  // Decrement or Remove
  const handleQuickDecrement = (productId: string, variantId?: string | null) => {
    setOrderItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.productId === productId && it.variantId === (variantId || null)
      );

      if (existingIdx === -1) return prev;

      if (prev[existingIdx].quantity > 1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity - 1,
        };
        return updated;
      }

      return prev.filter((_, i) => i !== existingIdx);
    });
  };

  // Get item quantity in cart
  const getItemQtyInCart = (productId: string, variantId?: string | null) => {
    const item = orderItems.find(
      (it) => it.productId === productId && it.variantId === (variantId || null)
    );
    return item ? item.quantity : 0;
  };

  const handleUpdatePrice = (index: number, newPrice: number) => {
    setOrderItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, unitPrice: Math.max(0, newPrice) } : it))
    );
  };

  const handleUpdateRemarks = (index: number, remarks: string) => {
    setOrderItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, remarks } : it))
    );
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = orderItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const discountTotal = orderItems.reduce((sum, it) => sum + it.discountAmount, 0);
  const netSubtotal = subtotal - discountTotal;
  const taxTotal = netSubtotal * 0.13;
  const grandTotal = netSubtotal + taxTotal + freightTotal;
  const totalItemUnits = orderItems.reduce((sum, it) => sum + it.quantity, 0);

  const isCreditExceeded =
    currentDealer && currentDealer.availableCredit > 0 && grandTotal > currentDealer.availableCredit;

  // Submit Order
  const handleSubmit = async (submitForReview: boolean) => {
    if (!selectedDealerId) {
      setError("Please select a dealer first.");
      return;
    }
    if (orderItems.length === 0) {
      setError("Please add at least one product to the order.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerId: selectedDealerId,
          items: orderItems,
          notes: orderNotes.trim() || undefined,
          freightTotal,
          submitForReview,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.message || json?.error?.message || "Failed to create order.");
      }

      const targetRedirect = isDealer
        ? `/dealer/orders/${json.data.orderId}`
        : `/s/${sellerSlug}/admin/orders/${json.data.orderId}`;

      router.push(targetRedirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order creation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs flex items-center gap-2 shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Sticky Dealer Selection & Info Strip */}
      <div className="bg-white rounded-xl border p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Dealer Combobox or Fixed Dealer View */}
        <div className="flex-1 max-w-lg relative">
          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Target Dealer Account
          </Label>
          {isDealer ? (
            <div className="w-full h-10 px-3 border border-emerald-200 rounded-lg bg-emerald-50/70 flex items-center justify-between text-xs font-bold text-emerald-950">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span className="truncate">
                  {currentDealer
                    ? `${currentDealer.tradingName || currentDealer.legalName} (${currentDealer.code})`
                    : "My Dealership Account"}
                </span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Authorized Account</Badge>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDealerSearchOpen(!dealerSearchOpen)}
                className="w-full h-10 px-3 border rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">
                    {currentDealer
                      ? `${currentDealer.tradingName || currentDealer.legalName} (${currentDealer.code})`
                      : "Select a Dealer..."}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
              </button>

            {dealerSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border shadow-xl z-50 p-2 space-y-2 max-h-72 overflow-y-auto">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search dealer name, code, contact..."
                    value={dealerQuery}
                    onChange={(e) => setDealerQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-slate-50"
                    autoFocus
                  />
                </div>
                <div className="divide-y text-xs max-h-52 overflow-y-auto">
                  {filteredDealers.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => {
                        setSelectedDealerId(d.id);
                        setDealerSearchOpen(false);
                      }}
                      className={cn(
                        "p-2.5 hover:bg-blue-50 cursor-pointer rounded-lg flex items-center justify-between transition",
                        d.id === selectedDealerId && "bg-blue-50/80 font-bold"
                      )}
                    >
                      <div>
                        <div className="text-slate-900">{d.tradingName || d.legalName}</div>
                        <div className="text-[10px] text-slate-500">
                          {d.code} • {d.phone || d.email}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-emerald-700 block">
                          Credit: {formatCurrency(d.availableCredit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

        {/* Selected Dealer Summary Metrics */}
        {currentDealer && (
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border">
              <span className="text-[10px] text-slate-400 block font-medium">Contact Person</span>
              <span className="font-bold text-slate-800">{currentDealer.contactName || "Direct"} ({currentDealer.phone || "N/A"})</span>
            </div>
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <span className="text-[10px] text-emerald-800 block font-medium">Available Credit Limit</span>
              <span className="font-black text-emerald-950 text-sm">{formatCurrency(currentDealer.availableCredit)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-App Tab Switcher for easy 1-click toggling */}
      <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMobileView("products")}
          className={cn(
            "flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2",
            mobileView === "products"
              ? "bg-[#0b2d55] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <Package className="h-4 w-4" />
          <span>Catalogue ({filteredProducts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("cart")}
          className={cn(
            "flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 relative",
            mobileView === "cart"
              ? "bg-[#0b2d55] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <ShoppingCart
            className={cn(
              "h-4 w-4",
              isCartBouncing && "animate-bounce text-emerald-400"
            )}
          />
          <span>Cart ({totalItemUnits})</span>
          {totalItemUnits > 0 && (
            <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0">
              {formatCurrency(grandTotal)}
            </Badge>
          )}
        </button>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Product Catalogue & 1-Click Add */}
        <div className={cn("lg:col-span-7 space-y-4", mobileView === "cart" ? "hidden lg:block" : "block")}>
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0b2d55]">
                <Package className="h-4 w-4 text-primary" /> Product Catalogue & Spare Parts
              </CardTitle>
              <div className="relative w-full sm:w-72">
                {isSearchingProducts ? (
                  <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary animate-spin" />
                ) : (
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                )}
                <Input
                  placeholder="Fast search SKU or name..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-9 pl-8 pr-7 text-xs bg-white rounded-lg"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Category Filter Pills */}
              {categories.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition",
                        selectedCategory === cat
                          ? "bg-[#0b2d55] text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Products List with 1-Click Add */}
              <div className="max-h-[600px] overflow-y-auto divide-y border rounded-xl divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                    <Package className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                    <div className="font-semibold text-slate-600">No products found</div>
                    <p className="text-[11px] text-slate-400">Try changing your search terms.</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const hasVariants = product.variants.length > 1;

                    return (
                      <div
                        key={product.id}
                        className="p-3.5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Product Info */}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-900 leading-snug">
                            {product.name}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              SKU: {product.sku}
                            </span>
                            <span>• Unit: {product.unitCode}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            <span className="font-bold text-emerald-700">
                              Dealer Rate: {formatCurrency(product.defaultPrice)}
                            </span>
                            {product.mrp > product.defaultPrice && (
                              <span className="text-[10px] text-slate-400 line-through">
                                MRP: {formatCurrency(product.mrp)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 1-Click Add / Increment Stepper */}
                        <div className="shrink-0 flex items-center gap-2">
                          {hasVariants ? (
                            <div className="space-y-1.5">
                              {product.variants.map((variant) => {
                                const qty = getItemQtyInCart(product.id, variant.id);
                                return (
                                  <div
                                    key={variant.id}
                                    className="flex items-center justify-between gap-2 p-1.5 bg-slate-100 rounded-lg text-xs"
                                  >
                                    <span className="text-[11px] font-medium truncate max-w-[120px]">
                                      {variant.name} ({formatCurrency(variant.price)})
                                    </span>
                                    {qty > 0 ? (
                                      <div className="flex items-center bg-white border border-emerald-300 rounded-md overflow-hidden shadow-2xs">
                                        <button
                                          type="button"
                                          onClick={() => handleQuickDecrement(product.id, variant.id)}
                                          className="p-1 hover:bg-slate-100 text-slate-700"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="px-2 text-xs font-bold text-emerald-800">{qty}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleQuickAdd(product, variant.id)}
                                          className="p-1 hover:bg-slate-100 text-emerald-700"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleQuickAdd(product, variant.id)}
                                        className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                      >
                                        + Add
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            (() => {
                              const defaultVarId = product.variants[0]?.id || null;
                              const qty = getItemQtyInCart(product.id, defaultVarId);

                              return qty > 0 ? (
                                <div className="flex items-center bg-white border-2 border-emerald-600 rounded-lg overflow-hidden shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickDecrement(product.id, defaultVarId)}
                                    className="p-1.5 hover:bg-emerald-50 text-slate-700 transition"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="px-3 text-xs font-extrabold text-emerald-950">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdd(product, defaultVarId || undefined)}
                                    className="p-1.5 hover:bg-emerald-50 text-emerald-700 transition"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleQuickAdd(product, defaultVarId || undefined)}
                                  className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Add
                                </Button>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 5 Columns: Persistent Live Order Cart */}
        <div className={cn("lg:col-span-5 space-y-4 lg:sticky lg:top-20", mobileView === "products" ? "hidden lg:block" : "block")}>
          <Card className="shadow-md border-slate-300">
            <CardHeader className="pb-3 border-b bg-gradient-to-r from-slate-900 to-[#0b2d55] text-white rounded-t-xl">
              {/* Mobile Back to Catalogue Button */}
              <div className="lg:hidden flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setMobileView("products")}
                  className="text-xs text-emerald-300 hover:text-white flex items-center gap-1 font-bold transition active:scale-95"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Product Catalogue
                </button>
              </div>

              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                  <ShoppingCart className="h-4 w-4 text-emerald-400" /> Sales Order Cart
                </CardTitle>
                <Badge className="bg-emerald-500 text-slate-950 font-extrabold text-xs px-2 py-0.5">
                  {totalItemUnits} units • {orderItems.length} items
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Order Items List */}
              {orderItems.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 space-y-2 border-2 border-dashed rounded-xl">
                  <ShoppingCart className="h-8 w-8 mx-auto text-slate-300" />
                  <div className="font-bold text-slate-600">Cart is empty</div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Click <strong>+ Add</strong> on any product in the catalogue on the left to add items.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border rounded-xl">
                  {orderItems.map((item, idx) => (
                    <div key={`${item.productId}-${item.variantId || idx}`} className="p-3 space-y-2 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {item.productName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.sku}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Quantity & Rate Stepper */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border rounded-md overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => handleQuickDecrement(item.productId, item.variantId)}
                            className="p-1 hover:bg-slate-200 text-slate-600"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-slate-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickAdd(
                                {
                                  id: item.productId,
                                  name: item.productName,
                                  sku: item.sku,
                                  unitCode: "PCS",
                                  defaultPrice: item.unitPrice,
                                  mrp: item.mrp,
                                  variants: [],
                                },
                                item.variantId || undefined
                              )
                            }
                            className="p-1 hover:bg-slate-200 text-emerald-700"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Price & Total */}
                        <div className="text-right">
                          <span className="font-black text-xs text-slate-900">
                            {formatCurrency(item.unitPrice * item.quantity * 1.13)}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-normal">
                            @{formatCurrency(item.unitPrice)}/ea + 13% VAT
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Commercial Summary Box */}
              <div className="p-3 bg-slate-50 rounded-xl border space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({totalItemUnits} units):</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT Tax (13%):</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(taxTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t">
                  <Label className="text-xs">Freight (NPR):</Label>
                  <input
                    type="number"
                    min="0"
                    value={freightTotal}
                    onChange={(e) => setFreightTotal(parseFloat(e.target.value) || 0)}
                    className="w-20 h-6 text-xs text-right border rounded px-1.5 font-bold bg-white"
                  />
                </div>
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t">
                  <span>Payable Grand Total:</span>
                  <span className="text-emerald-700 text-base">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Credit Limit Alert */}
              {isCreditExceeded && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-bold">Credit Limit Notice</div>
                    <div className="text-[11px] mt-0.5">
                      Order total exceeds available credit ({formatCurrency(currentDealer.availableCredit)}). Accounts review will verify credit extension.
                    </div>
                  </div>
                </div>
              )}

              {/* Order Notes */}
              <div>
                <Label className="text-[11px] font-semibold text-slate-600">
                  Sales Notes / Delivery Instructions
                </Label>
                <textarea
                  placeholder="e.g. Urgent dispatch requested by dealer, PO ref #..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2 border rounded-lg bg-white mt-1 outline-none resize-none"
                />
              </div>

              {/* Fast Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting || !selectedDealerId || orderItems.length === 0}
                  className="w-full h-11 text-xs font-black bg-[#0b2d55] hover:bg-[#124177] text-white flex items-center justify-center gap-2 shadow-md"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit for Accounts Review
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || !selectedDealerId || orderItems.length === 0}
                  className="w-full h-8 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" /> Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar (Quick Cart Summary & Action) */}
      {orderItems.length > 0 && mobileView === "products" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 border-t border-slate-800 shadow-2xl flex items-center justify-between lg:hidden animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "relative p-2.5 bg-emerald-600/20 rounded-xl border border-emerald-500/30 transition-transform",
                isCartBouncing && "scale-110"
              )}
            >
              <ShoppingCart className="h-5 w-5 text-emerald-400" />
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full h-4 w-4 flex items-center justify-center">
                {totalItemUnits}
              </span>
            </div>
            <div>
              <div className="text-xs font-black text-white">{formatCurrency(grandTotal)}</div>
              <div className="text-[10px] text-slate-400 font-medium">
                {orderItems.length} item{orderItems.length === 1 ? "" : "s"} in cart
              </div>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setMobileView("cart")}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 active:scale-95 transition"
          >
            <span>Review Cart</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Floating Toast Notification on Add */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-slate-950/95 text-white px-4 py-2.5 rounded-full shadow-2xl border border-slate-800 backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-none max-w-[90vw]">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold truncate">{toast.message}</span>
          <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0">
            {totalItemUnits} in cart
          </span>
        </div>
      )}
    </div>
  );
}
