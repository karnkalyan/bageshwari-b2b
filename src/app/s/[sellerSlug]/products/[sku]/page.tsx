import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { resolveDealerPrice } from "@/services/pricing.service";
import { addItemToDealerCart, getDealerCartItemCount } from "@/services/cart.service";
import { PublicHeader } from "../../_components/public-header";
import { PublicFooter } from "../../_components/public-footer";
import { UtilityBar } from "../../_components/utility-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Package, Lock, ShoppingCart, ShieldCheck, Truck, FileText, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ProductDetailAddToCart } from "@/components/cart/product-detail-add-to-cart";

export const dynamic = "force-dynamic";

interface ProductDetailsProps {
  params: Promise<{ sellerSlug: string; sku: string }>;
}

export default async function ProductDetailsPage({ params }: ProductDetailsProps) {
  const { sellerSlug, sku } = await params;
  const session = await auth();

  const isDealer = Boolean(session?.dealerId);
  const isStaff = !isDealer && Boolean(session?.user?.id);

  const seller = await prisma.seller.findUnique({
    where: { slug: sellerSlug },
  });

  if (!seller) notFound();

  const [product, dealer, cartItemCount] = await Promise.all([
    prisma.product.findFirst({
      where: {
        sellerId: seller.id,
        OR: [{ sku: sku }, { slug: sku }, { variants: { some: { sku: sku } } }],
      },
      include: {
        category: true,
        brand: true,
        variants: true,
        prices: { where: { active: true } },
      },
    }),
    isDealer
      ? prisma.dealer.findFirst({
          where: { id: session!.dealerId!, sellerId: seller.id, status: "ACTIVE" },
          select: { id: true, dealerGroupId: true, pricingGroupId: true, tradingName: true },
        })
      : null,
    isDealer ? getDealerCartItemCount(seller.id, session?.dealerId) : Promise.resolve(0),
  ]);

  if (!product) notFound();

  const defaultVariant = product.variants.find((v: any) => v.isDefault) || product.variants[0];
  const mrp = defaultVariant ? Number(defaultVariant.mrp) : 0;
  const moq = Number(product.minimumOrderQuantity || 1);

  let dp = mrp;
  let discountPercent = 0;

  if (isDealer && dealer) {
    dp = resolveDealerPrice(
      product.prices,
      {
        dealerId: dealer.id,
        dealerGroupId: dealer.dealerGroupId,
        pricingGroupId: dealer.pricingGroupId,
      },
      mrp
    );
    discountPercent = mrp > 0 && dp < mrp ? Math.round(((mrp - dp) / mrp) * 100) : 0;
  }

  // Server action to add product to dealer draft order cart
  async function handleAddToCart(formData: FormData) {
    "use server";
    const currentSession = await auth();
    if (!currentSession?.dealerId || !currentSession?.user?.id) {
      redirect("/dealer/login");
    }

    const currentSeller = await prisma.seller.findUnique({
      where: { slug: sellerSlug },
      select: { id: true },
    });
    if (!currentSeller) return;

    const qty = Number(formData.get("quantity") || moq);

    await addItemToDealerCart({
      sellerId: currentSeller.id,
      dealerId: currentSession.dealerId,
      userId: currentSession.user.id,
      productId: product!.id,
      quantity: qty,
    });

    revalidatePath(`/products/${sku}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UtilityBar content={null} />
      <PublicHeader
        seller={seller}
        sellerSlug={sellerSlug}
        user={session?.user}
        isDealer={isDealer}
        isStaff={isStaff}
        cartItemCount={cartItemCount}
      />

      <div className="border-b border-slate-200 bg-slate-50 py-4">
        <div className="site-container flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-red-600">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/products" className="hover:text-red-600">Products</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate font-semibold text-[#0b2d55]">{product.name}</span>
        </div>
      </div>

      <div className="site-container flex-1 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative flex aspect-[4/3] items-center justify-center rounded-2xl border bg-[radial-gradient(circle_at_center,#fff,#eef3f8)] p-8 shadow-sm">
              <Package className="h-40 w-40 text-gray-300" />
              <div className="absolute top-4 left-4 flex flex-col gap-1">
                {product.featured && <Badge className="bg-red-500 text-white">Featured</Badge>}
                {product.newArrival && <Badge className="bg-emerald-500 text-white">New Arrival</Badge>}
                {isDealer && discountPercent > 0 && (
                  <Badge className="bg-emerald-600 text-white font-bold">
                    {discountPercent}% Dealer Discount
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {product.category && (
                  <Badge variant="secondary" className="text-xs">{product.category.name}</Badge>
                )}
                {product.brand && (
                  <Badge variant="outline" className="text-xs">{product.brand.name}</Badge>
                )}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#0b2d55]">{product.name}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                SKU: {product.sku} | Unit: {product.unitCode}
              </p>
            </div>

            {/* Price Box */}
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm font-medium text-slate-600">Maximum Retail Price (MRP)</span>
                  <span className={`text-xl font-bold ${isDealer ? "text-slate-400 line-through" : "text-slate-900 text-2xl"}`}>
                    {formatCurrency(mrp)}
                  </span>
                </div>

                {isDealer ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <div>
                          <div className="font-extrabold text-sm text-emerald-950">Dealer Exclusive Price (DP)</div>
                          <div className="text-xs text-emerald-700">Pricing tier unlocked for {dealer?.tradingName}</div>
                        </div>
                      </div>
                      <span className="text-2xl font-black text-emerald-700">{formatCurrency(dp)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 text-right">+ {Number(product.taxPercent || 13)}% VAT applies at checkout</div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 text-sm">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-xs">Dealer Exclusive Pricing</div>
                        <div className="text-[11px] text-amber-700">Special dealer discount applies upon login</div>
                      </div>
                    </div>
                    <Link href="/dealer/login">
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                        Login to View Price
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ordering specifications */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block">Minimum Order Quantity (MOQ)</span>
                <span className="font-bold text-sm text-foreground">{moq} {product.unitCode}</span>
              </div>
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block">HSN Code</span>
                <span className="font-bold text-sm text-foreground">{product.hsnCode || "N/A"}</span>
              </div>
            </div>

            {/* CTA Section */}
            {isDealer ? (
              <ProductDetailAddToCart
                productId={product.id}
                moq={moq}
                unitCode={product.unitCode}
                quantityIncrement={Number(product.quantityIncrement) || 1}
                initialCartCount={cartItemCount}
                action={handleAddToCart}
              />
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/dealer/login" className="flex-1">
                  <Button size="lg" className="h-12 w-full bg-red-600 hover:bg-red-700 font-extrabold">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Dealer Order Login
                  </Button>
                </Link>
                <Link href="/request-dealership" className="flex-1">
                  <Button size="lg" variant="outline" className="w-full h-12 border-red-500 text-red-600 hover:bg-red-50 font-bold">
                    Request Dealership
                  </Button>
                </Link>
              </div>
            )}

            {/* Trust markers */}
            <div className="grid grid-cols-3 gap-2 border-t pt-4 text-center text-[11px] text-muted-foreground">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Genuine Quality</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Truck className="h-4 w-4 text-primary" />
                <span>Direct Dispatch</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <FileText className="h-4 w-4 text-primary" />
                <span>Tax Invoice</span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Tabs */}
        <div className="mt-12">
          <Tabs defaultValue="description">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
              <TabsTrigger value="description" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Description
              </TabsTrigger>
              <TabsTrigger value="specifications" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Specifications
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="p-6 bg-card border border-t-0 rounded-b-xl space-y-4">
              <h3 className="font-semibold text-base">Product Overview</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.description || product.shortDescription || "High-quality genuine product supplied directly by Bageshwari Tractors."}
              </p>
            </TabsContent>
            <TabsContent value="specifications" className="p-6 bg-card border border-t-0 rounded-b-xl">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">SKU Code</span>
                  <span className="font-medium">{product.sku}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Unit of Measure</span>
                  <span className="font-medium">{product.unitCode}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tax Percentage</span>
                  <span className="font-medium">{Number(product.taxPercent || 13)}%</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Minimum Order</span>
                  <span className="font-medium">{Number(product.minimumOrderQuantity)}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PublicFooter seller={seller} sellerSlug={sellerSlug} />
    </div>
  );
}
