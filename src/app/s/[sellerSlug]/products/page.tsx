import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { resolveDealerPrice } from "@/services/pricing.service";
import { productRepository } from "@/repositories/product.repository";
import { addItemToDealerCart, getDealerCartItemCount } from "@/services/cart.service";
import { PublicHeader } from "../_components/public-header";
import { PublicFooter } from "../_components/public-footer";
import { UtilityBar } from "../_components/utility-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Lock, ShoppingCart, Eye, Package, Filter, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

export const dynamic = "force-dynamic";

interface ProductsPageProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<{
    search?: string;
    category?: string;
    brand?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { sellerSlug } = await params;
  const query = await searchParams;
  const session = await auth();

  const search = query.search || "";
  const categorySlug = query.category || "";
  const brandSlug = query.brand || "";
  const sort = query.sort || "newest";
  const currentPage = parseInt(query.page || "1", 10);
  const pageSize = 16;

  const isDealer = Boolean(session?.dealerId);
  const isStaff = !isDealer && Boolean(session?.user?.id);

  const seller = await prisma.seller.findUnique({
    where: { slug: sellerSlug },
  });

  if (!seller) notFound();

  const where: any = {
    sellerId: seller.id,
    status: "ACTIVE",
    publishStatus: "PUBLISHED",
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (brandSlug) {
    where.brand = { slug: brandSlug };
  }

  let orderBy: any = { createdAt: "desc" };
  if (sort === "name_asc") orderBy = { name: "asc" };
  if (sort === "name_desc") orderBy = { name: "desc" };

  const [rawProducts, totalCount, categories, brands, dealer, cartItemCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        variants: { where: { isDefault: true }, take: 1 },
      },
    }),
    prisma.product.count({ where }),
    prisma.productCategory.findMany({
      where: { sellerId: seller.id, status: "ACTIVE" },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
    }),
    prisma.productBrand.findMany({
      where: { sellerId: seller.id, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    isDealer
      ? prisma.dealer.findFirst({
          where: { id: session!.dealerId!, sellerId: seller.id, status: "ACTIVE" },
          select: { id: true, dealerGroupId: true, pricingGroupId: true, tradingName: true },
        })
      : null,
    isDealer ? getDealerCartItemCount(seller.id, session?.dealerId) : Promise.resolve(0),
  ]);

  let products = rawProducts.map((p) => {
    const variant = p.variants?.[0];
    const mrp = variant ? Number(variant.mrp) : 0;
    return {
      ...p,
      mrp,
      dealerPrice: mrp,
      discountPercent: 0,
    };
  });

  if (isDealer && dealer) {
    const productIds = rawProducts.map((p) => p.id);
    const activePrices = await productRepository.listActivePrices(seller.id, productIds);

    products = rawProducts.map((p) => {
      const variant = p.variants?.[0];
      const mrp = variant ? Number(variant.mrp) : 0;
      const productPrices = activePrices.filter((price) => price.productId === p.id);
      const dp = resolveDealerPrice(
        productPrices,
        {
          dealerId: dealer.id,
          dealerGroupId: dealer.dealerGroupId,
          pricingGroupId: dealer.pricingGroupId,
        },
        mrp
      );
      const discountPercent = mrp > 0 && dp < mrp ? Math.round(((mrp - dp) / mrp) * 100) : 0;

      return {
        ...p,
        mrp,
        dealerPrice: dp,
        discountPercent,
      };
    });
  }

  // Server action to add item to dealer cart
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

    const productId = String(formData.get("productId") || "");
    const qty = Number(formData.get("quantity") || 1);

    await addItemToDealerCart({
      sellerId: currentSeller.id,
      dealerId: currentSession.dealerId,
      userId: currentSession.user.id,
      productId,
      quantity: qty,
    });

    revalidatePath("/products");
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const baseUrl = "/products";

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

      <div className="border-b border-slate-200 bg-[linear-gradient(110deg,#f4f8fd,#fff)] py-8">
        <div className="site-container">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <Link href="/" className="hover:text-red-600">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#0b2d55]">Product Catalogue</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="section-kicker">
                {isDealer ? "Unlocked Dealer Catalogue" : "B2B catalogue"}
              </div>
              <h1 className="mt-1 text-3xl font-black text-[#0b2d55]">
                Products for every dealer requirement
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Showing {products.length} of {totalCount} products
              </p>
            </div>

            {isDealer && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Pricing Unlocked: {dealer?.tradingName}</span>
                </div>
                <Link href="/dealer/cart">
                  <Button className="bg-[#0b2d55] hover:bg-[#124177] text-white">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Dealer Cart
                    {cartItemCount > 0 && (
                      <Badge className="ml-2 bg-red-600 text-white hover:bg-red-600 px-2 py-0.5 text-xs">
                        {cartItemCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="site-container flex-1 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr]">
          {/* Sidebar Filters */}
          <div className="space-y-6">
            <Card className="sticky top-24 border-slate-200 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    Filter Products
                  </h3>
                  {(categorySlug || brandSlug || search) && (
                    <Link href={baseUrl} className="text-xs text-red-600 hover:underline font-medium">
                      Reset
                    </Link>
                  )}
                </div>

                {/* Search */}
                <form action={baseUrl} method="GET" className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="search"
                      defaultValue={search}
                      placeholder="Search SKU, name..."
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                  {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
                  {brandSlug && <input type="hidden" name="brand" value={brandSlug} />}
                </form>

                {/* Categories */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Categories</label>
                  <div className="space-y-1 max-h-60 overflow-y-auto pr-1 text-xs">
                    <Link
                      href={baseUrl}
                      className={`flex items-center justify-between p-1.5 rounded hover:bg-muted ${!categorySlug ? "font-bold text-primary bg-primary/5" : "text-gray-600"}`}
                    >
                      <span>All Categories</span>
                    </Link>
                    {categories.map((cat: any) => (
                      <Link
                        key={cat.id}
                        href={`${baseUrl}?category=${cat.slug}${brandSlug ? `&brand=${brandSlug}` : ""}`}
                        className={`flex items-center justify-between p-1.5 rounded hover:bg-muted ${categorySlug === cat.slug ? "font-bold text-primary bg-primary/5" : "text-gray-600"}`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {cat._count?.products || 0}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                {brands.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <label className="text-xs font-medium text-muted-foreground">Brands</label>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1 text-xs">
                      {brands.map((b: any) => (
                        <Link
                          key={b.id}
                          href={`${baseUrl}?brand=${b.slug}${categorySlug ? `&category=${categorySlug}` : ""}`}
                          className={`block p-1.5 rounded hover:bg-muted ${brandSlug === b.slug ? "font-bold text-primary bg-primary/5" : "text-gray-600"}`}
                        >
                          {b.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Grid */}
          <div className="min-w-0 space-y-6">
            {products.length === 0 ? (
              <div className="text-center py-16 bg-card border rounded-xl space-y-3">
                <Package className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="font-semibold text-lg">No Products Found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  No products matched your criteria. Try adjusting your filters or search query.
                </p>
                <Link href={baseUrl}>
                  <Button variant="outline" size="sm">Clear All Filters</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {products.map((product: any) => {
                  return (
                    <Card key={product.id} className="group flex flex-col overflow-hidden rounded-xl border-slate-200 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg">
                      <div className="relative flex aspect-[4/3] items-center justify-center border-b bg-[radial-gradient(circle_at_center,#fff,#f1f5f9)] p-4">
                        <Package className="h-14 w-14 text-slate-300 transition-transform group-hover:scale-110" />
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {product.featured && <Badge className="bg-red-500 text-white text-[10px]">Featured</Badge>}
                          {product.newArrival && <Badge className="bg-emerald-500 text-white text-[10px]">New</Badge>}
                        </div>
                        {isDealer && product.discountPercent > 0 && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                              -{product.discountPercent}% DP
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardContent className="flex flex-1 flex-col justify-between space-y-3 p-3">
                        <div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                            <span>{product.category?.name || "Uncategorized"}</span>
                            {product.brand && <span>• {product.brand.name}</span>}
                          </div>
                          <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-[10px] text-muted-foreground mt-1">SKU: {product.sku}</p>
                        </div>

                        <div className="space-y-2 border-t pt-3">
                          {isDealer ? (
                            <div className="p-2.5 bg-slate-50 rounded-lg space-y-1 border border-slate-200">
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>MRP</span>
                                <span className="line-through">{formatCurrency(product.mrp)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm font-bold text-emerald-700">
                                <span>Dealer Price (DP)</span>
                                <span>{formatCurrency(product.dealerPrice)}</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">MRP</span>
                                <span className="font-semibold text-foreground">{formatCurrency(product.mrp)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Dealer Price</span>
                                <span className="text-amber-600 flex items-center gap-1 font-medium text-[11px]">
                                  <Lock className="h-3 w-3" /> Login to View
                                </span>
                              </div>
                            </>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Link href={`${baseUrl}/${product.sku}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                            </Link>
                            {isDealer ? (
                              <div className="flex-1">
                                <AddToCartButton
                                  productId={product.id}
                                  quantity={1}
                                  action={handleAddToCart}
                                  className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                />
                              </div>
                            ) : (
                              <Link href="/dealer/login" className="flex-1">
                                <Button size="sm" className="h-8 w-full bg-red-600 text-xs hover:bg-red-700">
                                  <ShoppingCart className="h-3 w-3 mr-1" /> Order
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                {Array.from({ length: Math.min(totalPages, 10) }).map((_, idx) => {
                  const p = idx + 1;
                  return (
                    <Link
                      key={p}
                      href={`${baseUrl}?page=${p}${categorySlug ? `&category=${categorySlug}` : ""}${brandSlug ? `&brand=${brandSlug}` : ""}${search ? `&search=${search}` : ""}`}
                    >
                      <Button
                        size="sm"
                        variant={currentPage === p ? "default" : "outline"}
                        className="h-8 w-8 p-0 text-xs"
                      >
                        {p}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <PublicFooter seller={seller} sellerSlug={sellerSlug} />
    </div>
  );
}
