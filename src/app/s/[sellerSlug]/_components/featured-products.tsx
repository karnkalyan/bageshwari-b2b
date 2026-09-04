import Link from "next/link";
import { ArrowRight, LockKeyhole, Package, ShoppingCart, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

type Product = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  featured?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  category?: { name: string; slug: string } | null;
  brand?: { name: string } | null;
  variants?: Array<{ mrp: unknown }>;
  images?: Array<{ url?: string | null }>;
  dealerPrice?: number;
  discountPercent?: number;
};

type Props = {
  products: Product[];
  sellerSlug: string;
  title: string;
  subtitle?: string;
  bgClass?: string;
  isDealer?: boolean;
  onAddToCart?: (formData: FormData) => Promise<void>;
};

export function FeaturedProducts({
  products,
  sellerSlug,
  title,
  subtitle,
  bgClass,
  isDealer = false,
  onAddToCart,
}: Props) {
  if (!products.length) return null;
  const base = "";

  return (
    <section className={`py-12 ${bgClass || "bg-white"}`}>
      <div className="site-container">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="section-kicker">
              {isDealer ? "Unlocked Dealer Catalogue" : "Dealer catalogue"}
            </div>
            <h2 className="mt-1 text-2xl font-black text-[#092f5c]">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <Link href={`${base}/products`} className="flex items-center gap-1 text-xs font-extrabold text-red-600">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6">
          {products.map((product) => {
            const mrp = Number(product.variants?.[0]?.mrp || 0);
            const dp = product.dealerPrice ?? mrp;
            const discountPercent = product.discountPercent ?? (mrp > 0 && dp < mrp ? Math.round(((mrp - dp) / mrp) * 100) : 0);

            return (
              <article
                key={product.id}
                className="group flex min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:border-red-200 hover:shadow-md"
              >
                <div>
                  <Link
                    href={`${base}/products/${product.sku}`}
                    className="relative grid aspect-square place-items-center bg-gradient-to-br from-slate-50 to-slate-100"
                  >
                    <Package className="h-14 w-14 text-slate-200 transition group-hover:scale-110" />
                    {(product.featured || product.newArrival) && (
                      <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white shadow-xs">
                        {product.newArrival ? "New" : "Featured"}
                      </span>
                    )}
                    {isDealer && discountPercent > 0 && (
                      <span className="absolute right-2 top-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[8px] font-black text-white shadow-xs">
                        -{discountPercent}% DP
                      </span>
                    )}
                  </Link>

                  <div className="p-3">
                    <div className="truncate text-[9px] font-bold uppercase tracking-wide text-red-600">
                      {product.category?.name || "Catalogue"}
                    </div>
                    <Link
                      href={`${base}/products/${product.sku}`}
                      className="mt-1 line-clamp-2 min-h-[32px] text-xs font-bold leading-tight text-[#092f5c] hover:text-red-600 transition-colors"
                      title={product.name}
                    >
                      {product.name}
                    </Link>
                    <div className="mt-1 truncate font-mono text-[9px] text-slate-400">SKU: {product.sku}</div>
                  </div>
                </div>

                <div className="p-3 pt-0">
                  <div className="border-t border-slate-100 pt-2 space-y-1.5">
                    {isDealer ? (
                      <div className="rounded-lg bg-emerald-50/50 p-2 border border-emerald-100/70">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400">
                          <span>MRP</span>
                          <span className="line-through truncate max-w-[110px]">{formatCurrency(mrp)}</span>
                        </div>
                        <div className="flex flex-wrap items-baseline justify-between gap-1 text-xs font-bold text-emerald-800 mt-0.5">
                          <span className="text-[10px] font-semibold text-emerald-700">DP</span>
                          <strong className="text-xs sm:text-sm font-black text-emerald-950 tracking-tight tabular-nums truncate max-w-[125px]">
                            {formatCurrency(dp)}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-1 text-[10px] text-slate-500">
                          <span className="font-semibold">MRP</span>
                          <strong className="text-xs font-bold text-[#092f5c] tabular-nums truncate max-w-[125px]">
                            {formatCurrency(mrp)}
                          </strong>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700">
                          <LockKeyhole className="h-3 w-3 shrink-0" />
                          <span className="truncate">Dealer price after login</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {isDealer ? (
                    onAddToCart ? (
                      <div className="mt-3">
                        <AddToCartButton
                          productId={product.id}
                          quantity={1}
                          action={onAddToCart}
                          className="w-full h-8 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                        />
                      </div>
                    ) : (
                      <Link
                        href={`${base}/products/${product.sku}`}
                        className="mt-3 flex items-center justify-center gap-1 rounded-md bg-emerald-600 py-2 text-[9px] font-black text-white hover:bg-emerald-700 transition"
                      >
                        <ShoppingCart className="h-3 w-3" /> Order
                      </Link>
                    )
                  ) : (
                    <Link
                      href="/inquiry"
                      className="mt-3 flex items-center justify-center gap-1 rounded-md bg-red-600 py-2 text-[9px] font-black text-white hover:bg-red-700 transition"
                    >
                      <ShoppingCart className="h-3 w-3" /> Add to inquiry
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
