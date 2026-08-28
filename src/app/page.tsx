import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveDealerPrice } from "@/services/pricing.service";
import { productRepository } from "@/repositories/product.repository";
import { addItemToDealerCart, getDealerCartItemCount } from "@/services/cart.service";
import { UtilityBar } from "@/app/s/[sellerSlug]/_components/utility-bar";
import { PublicHeader } from "@/app/s/[sellerSlug]/_components/public-header";
import { HeroSection } from "@/app/s/[sellerSlug]/_components/hero-section";
import { FeaturedCategories } from "@/app/s/[sellerSlug]/_components/featured-categories";
import { FeaturedProducts } from "@/app/s/[sellerSlug]/_components/featured-products";
import { HowItWorks } from "@/app/s/[sellerSlug]/_components/how-it-works";
import { DealerBenefits } from "@/app/s/[sellerSlug]/_components/dealer-benefits";
import { PlatformFeatures } from "@/app/s/[sellerSlug]/_components/platform-features";
import { DealerCTA } from "@/app/s/[sellerSlug]/_components/dealer-cta";
import { BusinessStats } from "@/app/s/[sellerSlug]/_components/business-stats";
import { PublicFooter } from "@/app/s/[sellerSlug]/_components/public-footer";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bageshwari Tractors | B2B Agricultural Products Nepal",
  description:
    "Browse tractors, genuine spare parts, implements, lubricants and workshop products from Bageshwari Tractors in Nepalgunj.",
};

type JsonObject = Record<string, unknown>;

function parseContent(value: string | null | undefined): JsonObject {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : {};
  } catch {
    return {};
  }
}

export default async function HomePage() {
  const [session, seller] = await Promise.all([
    auth(),
    prisma.seller.findFirst({
      where: { code: "BAGESHWARI", status: "ACTIVE", deletedAt: null },
      include: {
        homepageSections: {
          where: { enabled: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    }),
  ]);

  if (!seller) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-black text-[#092f5c]">Storefront setup required</h1>
          <p className="mt-2 text-sm text-slate-600">
            Run the database migration and seed to initialize Bageshwari Tractors.
          </p>
        </div>
      </main>
    );
  }

  const isDealer = Boolean(session?.dealerId);
  const isStaff = !isDealer && Boolean(session?.user?.id);

  const [
    categories,
    rawFeaturedProducts,
    rawNewArrivals,
    rawBestSellers,
    productsCount,
    categoryCount,
    dealersCount,
    warehousesCount,
    dealer,
    cartItemCount,
  ] = await Promise.all([
    prisma.productCategory.findMany({
      where: { sellerId: seller.id, status: "ACTIVE", parentId: null, deletedAt: null },
      orderBy: { displayOrder: "asc" },
      take: 6,
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.findMany({
      where: { sellerId: seller.id, status: "ACTIVE", publishStatus: "PUBLISHED", featured: true, deletedAt: null },
      take: 8,
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true } },
        variants: { where: { isDefault: true }, take: 1, select: { id: true, mrp: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
    }),
    prisma.product.findMany({
      where: { sellerId: seller.id, status: "ACTIVE", publishStatus: "PUBLISHED", newArrival: true, deletedAt: null },
      take: 8,
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true } },
        variants: { where: { isDefault: true }, take: 1, select: { id: true, mrp: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
    }),
    prisma.product.findMany({
      where: { sellerId: seller.id, status: "ACTIVE", publishStatus: "PUBLISHED", bestSeller: true, deletedAt: null },
      take: 8,
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true } },
        variants: { where: { isDefault: true }, take: 1, select: { id: true, mrp: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
    }),
    prisma.product.count({ where: { sellerId: seller.id, status: "ACTIVE", deletedAt: null } }),
    prisma.productCategory.count({ where: { sellerId: seller.id, status: "ACTIVE", deletedAt: null } }),
    prisma.dealer.count({ where: { sellerId: seller.id, status: "ACTIVE", deletedAt: null } }),
    prisma.warehouse.count({ where: { sellerId: seller.id, isActive: true } }),
    isDealer
      ? prisma.dealer.findFirst({
          where: { id: session!.dealerId!, sellerId: seller.id, status: "ACTIVE" },
          select: { id: true, dealerGroupId: true, pricingGroupId: true, tradingName: true },
        })
      : null,
    isDealer ? getDealerCartItemCount(seller.id, session?.dealerId) : Promise.resolve(0),
  ]);

  // If dealer is logged in, resolve dealer prices for all products
  let featuredProducts = rawFeaturedProducts;
  let newArrivals = rawNewArrivals;
  let bestSellers = rawBestSellers;

  if (isDealer && dealer) {
    const allProductIds = [
      ...new Set([
        ...rawFeaturedProducts.map((p) => p.id),
        ...rawNewArrivals.map((p) => p.id),
        ...rawBestSellers.map((p) => p.id),
      ]),
    ];

    const activePrices = await productRepository.listActivePrices(seller.id, allProductIds);

    const enrichProduct = (product: (typeof rawFeaturedProducts)[0]) => {
      const mrp = Number(product.variants?.[0]?.mrp || 0);
      const productPrices = activePrices.filter((p) => p.productId === product.id);
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
        ...product,
        dealerPrice: dp,
        discountPercent,
      };
    };

    featuredProducts = rawFeaturedProducts.map(enrichProduct);
    newArrivals = rawNewArrivals.map(enrichProduct);
    bestSellers = rawBestSellers.map(enrichProduct);
  }

  // Server action to add to cart from homepage
  async function handleAddToCart(formData: FormData) {
    "use server";
    const currentSession = await auth();
    if (!currentSession?.dealerId || !currentSession?.user?.id) {
      redirect("/dealer/login");
    }

    const currentSeller = await prisma.seller.findFirst({
      where: { code: "BAGESHWARI", status: "ACTIVE" },
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

    revalidatePath("/");
  }

  const section = (type: string) => seller.homepageSections.find((item) => item.sectionType === type);

  return (
    <div className="min-h-screen bg-white">
      <UtilityBar content={parseContent(section("UTILITY_BAR")?.contentJson)} />
      <PublicHeader
        seller={seller}
        sellerSlug="bageshwari"
        user={session?.user}
        isDealer={isDealer}
        isStaff={isStaff}
        cartItemCount={cartItemCount}
      />
      <main>
        <HeroSection
          section={section("HERO")}
          seller={seller}
          sellerSlug="bageshwari"
          isDealer={isDealer}
          isStaff={isStaff}
        />
        <FeaturedCategories categories={categories} sellerSlug="bageshwari" section={section("FEATURED_CATEGORIES")} />
        <FeaturedProducts
          products={featuredProducts}
          sellerSlug="bageshwari"
          title="Featured Products"
          subtitle={isDealer ? "Unlocked dealer catalogue pricing" : "Dealer-ready products from our live catalogue"}
          isDealer={isDealer}
          onAddToCart={isDealer ? handleAddToCart : undefined}
        />
        <FeaturedProducts
          products={newArrivals}
          sellerSlug="bageshwari"
          title="New Arrivals"
          subtitle={isDealer ? "Recently added with exclusive dealer prices" : "Recently added tractors, parts and workshop supplies"}
          bgClass="bg-slate-50"
          isDealer={isDealer}
          onAddToCart={isDealer ? handleAddToCart : undefined}
        />
        <FeaturedProducts
          products={bestSellers}
          sellerSlug="bageshwari"
          title="Best Sellers"
          subtitle={isDealer ? "Top volume products with best dealer rates" : "Frequently ordered by authorized dealers"}
          isDealer={isDealer}
          onAddToCart={isDealer ? handleAddToCart : undefined}
        />
        <HowItWorks />
        <DealerBenefits content={parseContent(section("DEALER_BENEFITS")?.contentJson)} />
        <PlatformFeatures content={parseContent(section("PLATFORM_FEATURES")?.contentJson)} />
        <DealerCTA sellerSlug="bageshwari" isDealer={isDealer} />
        <BusinessStats stats={{ products: productsCount, categories: categoryCount, dealers: dealersCount, warehouses: warehousesCount }} />
      </main>
      <PublicFooter seller={seller} sellerSlug="bageshwari" />
    </div>
  );
}
