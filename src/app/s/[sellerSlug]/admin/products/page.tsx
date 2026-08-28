import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ProductsTableClient, type SerializedProduct } from "./products-table-client";
import { Pagination } from "@/components/ui/pagination";

interface AdminProductsProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function AdminProductsPage({ params, searchParams }: AdminProductsProps) {
  const { sellerSlug } = await params;
  const query = await searchParams;
  const ctx = await getTenantContext(sellerSlug);

  const search = query.search || "";
  const currentPage = parseInt(query.page || "1", 10);
  const pageSize = 20;

  const where: any = { sellerId: ctx.sellerId };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
    ];
  }

  const [products, totalCount, companyRows, categoryRows] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { name: true } },
        images: { orderBy: { displayOrder: "asc" } },
        variants: { where: { isDefault: true }, take: 1 },
        prices: { where: { priceType: "DEFAULT_DEALER" }, take: 1 },
        inventories: { select: { availableQuantity: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.$queryRaw<any[]>`
      SELECT defaultVatPercent FROM CompanyProfile WHERE id = 'bageshwari-tractors' LIMIT 1
    `.catch(() => []),
    prisma.$queryRaw<any[]>`
      SELECT id, taxPercent FROM ProductCategory WHERE sellerId = ${ctx.sellerId}
    `.catch(() => []),
  ]);

  const globalVat = companyRows?.[0]?.defaultVatPercent ? Number(companyRows[0].defaultVatPercent) : 13.0;
  const categoryTaxMap = new Map<string, number | null>();
  if (Array.isArray(categoryRows)) {
    for (const cat of categoryRows) {
      if (cat.taxPercent !== null && cat.taxPercent !== undefined) {
        categoryTaxMap.set(cat.id, Number(cat.taxPercent));
      }
    }
  }

  // Convert Decimal and complex Prisma fields to plain JSON-serializable primitives for Client Components
  const plainProducts: SerializedProduct[] = products.map((p: any) => {
    const variant = p.variants[0];
    const price = p.prices[0];
    const mrp = variant ? Number(variant.mrp) : 0;
    const dp = price ? Number(price.amount) : 0;
    const stock = p.inventories[0]?.availableQuantity ? Number(p.inventories[0].availableQuantity) : 0;
    const customTax = p.taxPercent !== null && p.taxPercent !== undefined ? Number(p.taxPercent) : null;
    const catTax = p.categoryId && categoryTaxMap.has(p.categoryId) ? categoryTaxMap.get(p.categoryId)! : null;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      slug: p.slug,
      status: p.status,
      unitCode: p.unitCode || "PCS",
      taxPercent: customTax,
      categoryTaxPercent: catTax,
      effectiveVatPercent: customTax !== null ? customTax : (catTax !== null ? catTax : globalVat),
      shortDescription: p.shortDescription,
      categoryName: p.category?.name ?? null,
      brandName: p.brand?.name ?? null,
      mrp,
      dealerPrice: dp,
      stock,
      images: (p.images || []).map((img: any) => ({
        id: img.id,
        url: img.url || "",
        altText: img.altText ?? null,
        isPrimary: img.isPrimary,
        displayOrder: img.displayOrder,
      })),
    };
  });

  const baseUrl = `/admin/products`;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-kicker">Catalog Operations</div>
          <h1 className="text-2xl font-black text-foreground">Product Catalogue, Pricing & VAT Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage catalogue items, set individual & category VAT % rates, upload product photos, and print barcode price stickers with VAT included.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <form action={baseUrl} method="GET" className="flex items-center gap-2 w-full sm:w-96">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search}
                placeholder="Search products by SKU or name..."
                className="pl-9 h-9 text-xs"
              />
            </div>
          </form>
          <div className="text-xs text-muted-foreground">
            Showing {plainProducts.length} of {totalCount} products
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ProductsTableClient products={plainProducts} sellerSlug={sellerSlug} globalVatPercent={globalVat} />
          <Pagination totalPages={Math.ceil(totalCount / pageSize)} />
        </CardContent>
      </Card>
    </div>
  );
}
