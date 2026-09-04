import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { resolveDealerPrice } from "@/services/pricing.service";
import {
  SalesOrderCreator,
  SerializedDealer,
  SerializedProduct,
} from "@/components/admin/sales-order-creator";

export default async function DealerNewOrderPage() {
  const ctx = await getTenantContext("bageshwari", "/dealer/login");
  if (!ctx.dealerId) {
    redirect("/dealer/login");
  }

  const [dealer, products, categories] = await Promise.all([
    prisma.dealer.findUnique({
      where: { id: ctx.dealerId },
      include: {
        creditProfile: true,
        addresses: { where: { isDefault: true }, take: 1 },
      },
    }),
    prisma.product.findMany({
      where: { sellerId: ctx.sellerId, status: "ACTIVE", publishStatus: "PUBLISHED" },
      orderBy: { name: "asc" },
      take: 36,
      include: {
        category: { select: { name: true } },
        variants: {
          where: { status: "ACTIVE" },
          include: { prices: { take: 1 } },
        },
        prices: { where: { active: true } },
      },
    }),
    prisma.productCategory.findMany({
      where: { sellerId: ctx.sellerId, status: "ACTIVE" },
      select: { name: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  if (!dealer) {
    redirect("/dealer/login");
  }

  const serializedDealer: SerializedDealer = {
    id: dealer.id,
    code: dealer.code,
    tradingName: dealer.tradingName,
    legalName: dealer.legalName,
    contactName: dealer.contactName,
    phone: dealer.phone,
    email: dealer.email,
    availableCredit: dealer.creditProfile ? Number(dealer.creditProfile.availableCredit) : 500000,
    creditLimit: dealer.creditProfile ? Number(dealer.creditProfile.creditLimit) : 500000,
    addressSummary: dealer.addresses[0]
      ? `${dealer.addresses[0].addressLine1 || ""}, ${dealer.addresses[0].district || ""}`
      : undefined,
  };

  const serializedProducts: SerializedProduct[] = products.map((p) => {
    const variant = p.variants[0];
    const mrp = variant ? Number(variant.mrp) : (p.prices[0] ? Number(p.prices[0].amount) : 0);
    const dp = resolveDealerPrice(
      p.prices,
      {
        dealerId: dealer.id,
        dealerGroupId: dealer.dealerGroupId,
        pricingGroupId: dealer.pricingGroupId,
      },
      mrp
    );

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      unitCode: p.unitCode || "PCS",
      categoryName: p.category?.name || undefined,
      defaultPrice: dp,
      mrp,
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        mrp: v.prices[0] ? Number(v.prices[0].amount) : mrp,
        price: dp,
      })),
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div>
        <Link
          href="/dealer/orders"
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 font-medium mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Orders
        </Link>
        <div className="section-kicker">Dealer Direct Bulk Order</div>
        <h1 className="text-2xl font-black text-[#0b2d55]">Create Sales Order</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quickly select products, customize quantities with your unlocked dealer rates, and submit directly for Accounts review.
        </p>
      </div>

      <SalesOrderCreator
        sellerSlug="bageshwari"
        dealers={[serializedDealer]}
        products={serializedProducts}
        initialDealerId={dealer.id}
        isDealer={true}
        initialCategories={categories.map((c) => c.name)}
      />
    </div>
  );
}
