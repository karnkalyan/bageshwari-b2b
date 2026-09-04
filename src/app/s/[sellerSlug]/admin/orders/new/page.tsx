import { prisma } from "@/lib/db";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Plus } from "lucide-react";
import {
  SalesOrderCreator,
  SerializedDealer,
  SerializedProduct,
} from "@/components/admin/sales-order-creator";

interface NewOrderPageProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<{ dealerId?: string }>;
}

export default async function NewSalesOrderPage({ params, searchParams }: NewOrderPageProps) {
  const { sellerSlug } = await params;
  const { dealerId } = await searchParams;
  const ctx = await getTenantContext(sellerSlug);

  const isAuthorized =
    hasRole(
      ctx,
      "SUPER_ADMIN",
      "PLATFORM_ADMIN",
      "SELLER_OWNER",
      "ADMIN",
      "STAFF",
      "SALESPERSON",
      "SALES_REP",
      "SALES_MANAGER",
      "ACCOUNTANT",
      "ACCOUNTS_MANAGER"
    ) ||
    hasPermission(ctx, "order.submit") ||
    hasPermission(ctx, "order.manage");

  if (!isAuthorized) {
    redirect("/admin/orders");
  }

  const [dealers, products, categories] = await Promise.all([
    prisma.dealer.findMany({
      where: { sellerId: ctx.sellerId },
      orderBy: { legalName: "asc" },
      include: {
        creditProfile: true,
        addresses: { where: { isDefault: true }, take: 1 },
      },
    }),
    prisma.product.findMany({
      where: { sellerId: ctx.sellerId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      take: 36,
      include: {
        category: { select: { name: true } },
        variants: {
          where: { status: "ACTIVE" },
          include: { prices: { take: 1 } },
        },
        prices: { take: 1 },
      },
    }),
    prisma.productCategory.findMany({
      where: { sellerId: ctx.sellerId, status: "ACTIVE" },
      select: { name: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const serializedDealers: SerializedDealer[] = dealers.map((d) => ({
    id: d.id,
    code: d.code,
    tradingName: d.tradingName,
    legalName: d.legalName,
    contactName: d.contactName,
    phone: d.phone,
    email: d.email,
    availableCredit: d.creditProfile ? Number(d.creditProfile.availableCredit) : 500000,
    creditLimit: d.creditProfile ? Number(d.creditProfile.creditLimit) : 500000,
    addressSummary: d.addresses[0]
      ? `${d.addresses[0].addressLine1 || ""}, ${d.addresses[0].district || ""}`
      : undefined,
  }));

  const serializedProducts: SerializedProduct[] = products.map((p) => {
    const defaultPrice = p.prices[0] ? Number(p.prices[0].amount) : 0;
    const mrp = defaultPrice;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      unitCode: p.unitCode || "PCS",
      categoryName: p.category?.name || undefined,
      defaultPrice,
      mrp,
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        mrp: v.prices[0] ? Number(v.prices[0].amount) : defaultPrice,
        price: v.prices[0] ? Number(v.prices[0].amount) : defaultPrice,
      })),
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      {/* Top Header */}
      <div>
        <Link
          href={`/s/${sellerSlug}/admin/orders`}
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 font-medium mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Orders Directory
        </Link>
        <div className="section-kicker">Sales desk operations</div>
        <h1 className="text-2xl font-black text-[#0b2d55]">Create New Sales Order</h1>
        <p className="text-sm text-slate-500 mt-1">
          Select any authorized dealer, customize items & quantities, and submit directly to Accounts review.
        </p>
      </div>

      {/* Interactive Creator */}
      <SalesOrderCreator
        sellerSlug={sellerSlug}
        dealers={serializedDealers}
        products={serializedProducts}
        initialDealerId={dealerId}
        initialCategories={categories.map((c) => c.name)}
      />
    </div>
  );
}
