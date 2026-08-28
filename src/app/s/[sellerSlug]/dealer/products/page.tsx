import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveDealerPrice } from "@/services/pricing.service";
import { addItemToDealerCart, getDealerCartItemCount } from "@/services/cart.service";
import { DealerCardAddToCart } from "@/components/cart/dealer-card-add-to-cart";

interface DealerProductsProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<{ search?: string }>;
}

export default async function DealerProductsPage({ params, searchParams }: DealerProductsProps) {
  const { sellerSlug } = await params;
  const query = await searchParams;
  const ctx = await getTenantContext(sellerSlug, "/dealer/login");
  if (!ctx.dealerId) redirect("/dealer/login");

  const search = query.search || "";

  const where: any = {
    sellerId: ctx.sellerId,
    status: "ACTIVE",
    publishStatus: "PUBLISHED",
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
    ];
  }

  const [products, dealer, cartItemCount] = await Promise.all([
    prisma.product.findMany({
      where,
      take: 40,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        variants: { where: { isDefault: true }, take: 1 },
        prices: { where: { active: true } },
        inventories: { select: { availableQuantity: true } },
      },
    }),
    prisma.dealer.findFirst({
      where: { id: ctx.dealerId, sellerId: ctx.sellerId, status: "ACTIVE" },
      select: { id: true, dealerGroupId: true, pricingGroupId: true, tradingName: true },
    }),
    getDealerCartItemCount(ctx.sellerId, ctx.dealerId),
  ]);

  // Server Action to add product to dealer draft cart
  async function addToCartAction(formData: FormData) {
    "use server";
    const actionContext = await getTenantContext(sellerSlug, "/dealer/login");
    const productId = String(formData.get("productId") || "");
    const qty = Number(formData.get("quantity") || 1);
    if (!actionContext.dealerId || !Number.isFinite(qty) || qty <= 0) return;

    await addItemToDealerCart({
      sellerId: actionContext.sellerId,
      dealerId: actionContext.dealerId,
      userId: actionContext.userId,
      productId,
      quantity: qty,
    });

    revalidatePath(`/s/${sellerSlug}/dealer/products`);
    revalidatePath("/dealer/products");
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-kicker">Unlocked dealer pricing</div>
          <h1 className="text-2xl font-black text-[#0b2d55]">Dealer Ordering Catalogue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Exclusive Dealer Prices (DP) & Shopping Cart Order Placement
          </p>
        </div>

        <Link href="/dealer/cart">
          <Button className="bg-[#0b2d55] hover:bg-[#124177] text-white">
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Dealer Cart
            {cartItemCount > 0 && (
              <Badge className="ml-2 bg-red-600 text-white hover:bg-red-600 px-2 py-0.5 text-xs">
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <form action={`/s/${sellerSlug}/dealer/products`} method="GET" className="w-full sm:w-96">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search}
                placeholder="Search SKU or product name..."
                className="pl-9 h-9 text-xs"
              />
            </div>
          </form>
          <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md font-semibold border border-emerald-200">
            Dealer Unlocked Pricing Active ({dealer?.tradingName || "Authorized Dealer"})
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => {
          const variant = p.variants[0];
          const mrp = variant ? Number(variant.mrp) : 0;
          const dp = dealer ? resolveDealerPrice(p.prices, { dealerId: dealer.id, dealerGroupId: dealer.dealerGroupId, pricingGroupId: dealer.pricingGroupId }, mrp) : mrp;
          const discountPercent = mrp > 0 ? Math.round(((mrp - dp) / mrp) * 100) : 0;
          const stock = p.inventories[0]?.availableQuantity ? Number(p.inventories[0].availableQuantity) : 0;

          return (
            <Card key={p.id} className="hover:border-emerald-500/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">{p.category?.name} • SKU: {p.sku}</span>
                    {discountPercent > 0 && (
                      <Badge className="bg-emerald-600 text-white text-[10px]">{discountPercent}% Dealer Discount</Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2">{p.name}</h3>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1 border">
                  <div className="flex justify-between text-xs text-slate-400 line-through">
                    <span>MRP</span>
                    <span>{formatCurrency(mrp)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-emerald-700">
                    <span>Dealer Price (DP)</span>
                    <span>{formatCurrency(dp)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">+ 13% VAT Tax</div>
                </div>

                <div className="text-xs text-slate-500 flex justify-between">
                  <span>Available Stock:</span>
                  <span className="font-semibold text-slate-900">{stock} {p.unitCode}</span>
                </div>

                <DealerCardAddToCart
                  productId={p.id}
                  minQuantity={Number(p.minimumOrderQuantity) || 1}
                  action={addToCartAction}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
