import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandsTableClient, type SerializedBrand } from "./brands-table-client";
import { Store, CheckCircle2, XCircle, Package } from "lucide-react";

interface AdminBrandsProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<{ search?: string; status?: string }>;
}

export default async function AdminBrandsPage({ params, searchParams }: AdminBrandsProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  const [brands, totalProducts] = await Promise.all([
    prisma.productBrand.findMany({
      where: {
        sellerId: ctx.sellerId,
        deletedAt: null,
      },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    }),
    prisma.product.count({
      where: { sellerId: ctx.sellerId, deletedAt: null },
    }),
  ]);

  const serializedBrands: SerializedBrand[] = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description,
    logoUrl: b.logoUrl,
    status: b.status,
    productCount: b._count.products,
    createdAt: b.createdAt.toISOString(),
  }));

  const activeBrandsCount = brands.filter((b) => b.status === "ACTIVE").length;
  const inactiveBrandsCount = brands.filter((b) => b.status === "INACTIVE").length;
  const brandedProductsCount = brands.reduce((acc, b) => acc + b._count.products, 0);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-kicker flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <Store className="h-3.5 w-3.5" /> Catalog Operations
          </div>
          <h1 className="text-2xl font-black text-foreground mt-1">Brand & Manufacturer Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage spare parts manufacturers, tractor brands, and aftermarket suppliers.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Brands
            </CardTitle>
            <Store className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{brands.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Registered suppliers & OEMs</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Brands
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeBrandsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Enabled for ordering</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Inactive Brands
            </CardTitle>
            <XCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{inactiveBrandsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Hidden from catalogue</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Branded Items
            </CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{brandedProductsCount} / {totalProducts}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Linked catalog products</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border">
        <CardContent className="p-0">
          <BrandsTableClient
            brands={serializedBrands}
            sellerSlug={sellerSlug}
          />
        </CardContent>
      </Card>
    </div>
  );
}
