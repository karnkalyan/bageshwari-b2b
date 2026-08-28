import { prisma } from "@/lib/db";
import { PublicHeader } from "@/app/s/[sellerSlug]/_components/public-header";
import { PublicFooter } from "@/app/s/[sellerSlug]/_components/public-footer";
import { FeaturedProducts } from "@/app/s/[sellerSlug]/_components/featured-products";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const seller = await prisma.seller.findFirst({ where: { code: "BAGESHWARI", status: "ACTIVE" } });
  if (!seller) return <main className="p-10 text-center">Company profile not initialized.</main>;
  const products = await prisma.product.findMany({
    where: { sellerId: seller.id, onOffer: true, status: "ACTIVE", publishStatus: "PUBLISHED", deletedAt: null },
    include: { category: { select: { name: true, slug: true } }, brand: { select: { name: true } }, variants: { where: { isDefault: true }, take: 1, select: { mrp: true } } },
  });
  return <div className="min-h-screen bg-slate-50"><PublicHeader seller={seller} sellerSlug="bageshwari" /><main><section className="site-container py-10"><div className="section-kicker">Current catalogue</div><h1 className="mt-2 text-3xl font-black text-[#092f5c]">Dealer offers</h1></section><FeaturedProducts products={products} sellerSlug="bageshwari" title="Products on offer" subtitle="Sign in to see your protected dealer price" /></main><PublicFooter seller={seller} sellerSlug="bageshwari" /></div>;
}
