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
    <section className={`py-16 ${bgClass || "bg-[#0A0A0B] dark:bg-[#050505]"}`}>
      <div className="site-container">
        <div className="mb-10 flex items-end justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="inline-block rounded-full bg-blue-950 px-3 py-1 text-[10px] font-bold text-blue-400 mb-3">
              {isDealer ? "Unlocked Dealer Catalogue" : "Dealer catalogue"}
            </div>
            <h2 className="text-3xl font-black text-white">{title}</h2>
            {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <Link href={`${base}/products`} className="group flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-400 transition-colors">
            View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-4">
          {products.map((product) => {
            const mrp = Number(product.variants?.[0]?.mrp || 0);
            const dp = product.dealerPrice ?? mrp;
            const discountPercent = product.discountPercent ?? (mrp > 0 && dp < mrp ? Math.round(((mrp - dp) / mrp) * 100) : 0);

            return (
              <article
                key={product.id}
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl bg-slate-900 border-none shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-900/20"
              >
                <Link
                  href={`${base}/products/${product.sku}`}
                  className="relative flex items-center justify-center aspect-square bg-[#111113] overflow-hidden"
                >
                  {/* Subtle glow behind icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                     <div className="w-24 h-24 bg-red-500/20 rounded-full blur-2xl" />
                  </div>
                  <Package className="h-16 w-16 text-slate-700 transition-transform duration-500 group-hover:scale-110 group-hover:text-slate-500 relative z-10" />
                  
                  {(product.featured || product.newArrival) && (
                    <span className="absolute left-3 top-3 rounded-md bg-red-600 px-2 py-1 text-[9px] font-black uppercase text-white shadow-md z-20">
                      {product.newArrival ? "New Arrival" : "Featured"}
                    </span>
                  )}
                  {isDealer && discountPercent > 0 && (
                    <span className="absolute right-3 top-3 rounded-md bg-emerald-600 px-2 py-1 text-[9px] font-black text-white shadow-md z-20">
                      {discountPercent}% OFF
                    </span>
                  )}
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <div className="truncate text-[10px] font-bold uppercase tracking-wider text-red-500">
                    {product.category?.name || "Catalogue"}
                  </div>
                  <Link
                    href={`${base}/products/${product.sku}`}
                    className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-black leading-tight text-white hover:text-red-400 transition-colors"
                  >
                    {product.name}
                  </Link>
                  <div className="mt-2 truncate text-[10px] font-mono text-slate-500">SKU: {product.sku}</div>

                  <div className="mt-4 border-t border-slate-800 pt-3 space-y-1.5">
                    {isDealer ? (
                      <>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>MRP</span>
                          <span className="line-through">{formatCurrency(mrp)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-black text-emerald-400">
                          <span>DP</span>
                          <strong>{formatCurrency(dp)}</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>MRP</span>
                          <strong className="text-sm font-bold text-white">{formatCurrency(mrp)}</strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 mt-1">
                          <LockKeyhole className="h-3 w-3" /> Dealer pricing locked
                        </div>
                      </>
                    )}
                  </div>

                  {isDealer ? (
                    onAddToCart ? (
                      <div className="mt-4">
                        <AddToCartButton
                          productId={product.id}
                          quantity={1}
                          action={onAddToCart}
                          className="w-full h-10 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-colors border-none"
                        />
                      </div>
                    ) : (
                      <Link
                        href={`${base}/products/${product.sku}`}
                        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 h-10 text-xs font-black text-white hover:bg-emerald-500 transition-colors border-none"
                      >
                        <ShoppingCart className="h-4 w-4" /> Order Now
                      </Link>
                    )
                  ) : (
                    <Link
                      href="/inquiry"
                      className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-red-600 h-10 text-xs font-black text-white hover:bg-red-500 transition-colors border-none"
                    >
                      <ShoppingCart className="h-4 w-4" /> Add to Inquiry
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
