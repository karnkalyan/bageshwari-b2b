import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CatalogueFilters = {
  search?: string;
  category?: string;
  brand?: string;
  page: number;
  pageSize: number;
};

const publicProductSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  shortDescription: true,
  featured: true,
  newArrival: true,
  bestSeller: true,
  onOffer: true,
  minimumOrderQuantity: true,
  maximumOrderQuantity: true,
  quantityIncrement: true,
  unitCode: true,
  taxPercent: true,
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true, slug: true } },
  variants: {
    where: { status: "ACTIVE" as const, deletedAt: null },
    orderBy: { isDefault: "desc" as const },
    select: { id: true, name: true, sku: true, mrp: true, isDefault: true },
  },
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true, altText: true },
  },
} satisfies Prisma.ProductSelect;

export class ProductRepository {
  async getCompanyId() {
    const company = await prisma.seller.findFirst({
      where: { code: "BAGESHWARI", status: "ACTIVE", deletedAt: null },
      select: { id: true },
    });
    return company?.id ?? null;
  }

  async listPublic(sellerId: string, filters: CatalogueFilters) {
    const where: Prisma.ProductWhereInput = {
      sellerId,
      status: "ACTIVE",
      publishStatus: "PUBLISHED",
      deletedAt: null,
      ...(filters.search
        ? { OR: [{ name: { contains: filters.search } }, { sku: { contains: filters.search } }] }
        : {}),
      ...(filters.category ? { category: { slug: filters.category } } : {}),
      ...(filters.brand ? { brand: { slug: filters.brand } } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        select: publicProductSelect,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  async getDealerContext(sellerId: string, dealerId: string) {
    return prisma.dealer.findFirst({
      where: { id: dealerId, sellerId, status: "ACTIVE", deletedAt: null },
      select: { id: true, dealerGroupId: true, pricingGroupId: true },
    });
  }

  async listActivePrices(sellerId: string, productIds: string[]) {
    const now = new Date();
    return prisma.productPrice.findMany({
      where: {
        sellerId,
        productId: { in: productIds },
        active: true,
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  }

  async listInventory(sellerId: string, variantIds: string[]) {
    return prisma.inventory.groupBy({
      by: ["variantId"],
      where: { sellerId, variantId: { in: variantIds } },
      _sum: { availableQuantity: true, reservedQuantity: true },
    });
  }
}

export const productRepository = new ProductRepository();
