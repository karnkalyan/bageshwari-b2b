import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoriesTableClient, type SerializedCategory } from "./categories-table-client";
import { Boxes, CheckCircle2, Percent, Package, FolderTree } from "lucide-react";

interface AdminCategoriesProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<{ search?: string; status?: string }>;
}

export default async function AdminCategoriesPage({ params, searchParams }: AdminCategoriesProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  const [categories, companyProfile, totalProducts] = await Promise.all([
    prisma.productCategory.findMany({
      where: {
        sellerId: ctx.sellerId,
        deletedAt: null,
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    }),
    prisma.companyProfile.findFirst({
      where: { sellerId: ctx.sellerId },
      select: { defaultVatPercent: true },
    }),
    prisma.product.count({
      where: { sellerId: ctx.sellerId, deletedAt: null },
    }),
  ]);

  const globalVat = companyProfile?.defaultVatPercent ? Number(companyProfile.defaultVatPercent) : 13.0;

  const serializedCategories: SerializedCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    code: c.code,
    parentId: c.parentId,
    parentName: c.parent?.name || null,
    description: c.description,
    imageUrl: c.imageUrl,
    displayOrder: c.displayOrder,
    taxPercent: c.taxPercent !== null ? Number(c.taxPercent) : null,
    status: c.status,
    productCount: c._count.products,
    subCategoryCount: c._count.children,
    createdAt: c.createdAt.toISOString(),
  }));

  const activeCategoriesCount = categories.filter((c) => c.status === "ACTIVE").length;
  const customVatCategoriesCount = categories.filter((c) => c.taxPercent !== null).length;
  const categorizedProductsCount = categories.reduce((acc, c) => acc + c._count.products, 0);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-kicker flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <Boxes className="h-3.5 w-3.5" /> Catalog Operations
          </div>
          <h1 className="text-2xl font-black text-foreground mt-1">Category & Subcategory Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize products hierarchically, set category-level VAT rate overrides, and activate/deactivate catalogue sections.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Categories
            </CardTitle>
            <Boxes className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{categories.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">All catalog departments</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Categories
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCategoriesCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Visible in catalogue</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              VAT Overrides
            </CardTitle>
            <Percent className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{customVatCategoriesCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Default Global: {globalVat}%</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Linked Products
            </CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{categorizedProductsCount} / {totalProducts}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Catalog items assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border">
        <CardContent className="p-0">
          <CategoriesTableClient
            categories={serializedCategories}
            sellerSlug={sellerSlug}
            globalVatPercent={globalVat}
          />
        </CardContent>
      </Card>
    </div>
  );
}
