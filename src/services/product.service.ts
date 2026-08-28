import "server-only";
import { productRepository, type CatalogueFilters } from "@/repositories/product.repository";
import { resolveDealerPrice } from "@/services/pricing.service";
import { toDealerVariant, toPublicVariant } from "@/services/product-visibility";

export type CatalogueViewer = { dealerId?: string | null };

export class ProductService {
  async list(filters: CatalogueFilters, viewer: CatalogueViewer) {
    const sellerId = await productRepository.getCompanyId();
    if (!sellerId) throw new Error("COMPANY_NOT_CONFIGURED");
    const catalogue = await productRepository.listPublic(sellerId, filters);

    // This return path is deliberately constructed only from a Prisma select
    // that does not query ProductPrice, preventing accidental public leakage.
    if (!viewer.dealerId) return {
      ...catalogue,
      page: filters.page,
      pageSize: filters.pageSize,
      items: catalogue.items.map((product) => ({
        ...product,
        variants: product.variants.map(toPublicVariant),
      })),
    };

    const dealer = await productRepository.getDealerContext(sellerId, viewer.dealerId);
    if (!dealer) return { ...catalogue, page: filters.page, pageSize: filters.pageSize };
    const productIds = catalogue.items.map((product) => product.id);
    const variantIds = catalogue.items.flatMap((product) => product.variants.map((variant) => variant.id));
    const [prices, inventory] = await Promise.all([
      productRepository.listActivePrices(sellerId, productIds),
      productRepository.listInventory(sellerId, variantIds),
    ]);
    const stock = new Map(inventory.map((item) => [
      item.variantId,
      Number(item._sum.availableQuantity ?? 0) - Number(item._sum.reservedQuantity ?? 0),
    ]));

    return {
      ...catalogue,
      page: filters.page,
      pageSize: filters.pageSize,
      items: catalogue.items.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => {
          const mrp = Number(variant.mrp);
          const dealerPrice = resolveDealerPrice(
            prices.filter((price) => price.productId === product.id && (!price.variantId || price.variantId === variant.id)),
            { dealerId: dealer.id, dealerGroupId: dealer.dealerGroupId, pricingGroupId: dealer.pricingGroupId },
            mrp,
          );
          return toDealerVariant(variant, dealerPrice, stock.get(variant.id) ?? 0);
        }),
      })),
    };
  }
}

export const productService = new ProductService();
