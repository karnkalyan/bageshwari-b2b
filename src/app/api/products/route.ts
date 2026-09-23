import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { listProducts } from "@/controllers/product.controller";

export const GET = listProducts;

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSku(name: string): string {
  const prefix = name
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, "P");
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${rand}`;
}

const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(255),
  sku: z.string().trim().max(50).optional(),
  slug: z.string().trim().max(100).optional(),
  categoryId: z.string().trim().optional().nullable(),
  brandId: z.string().trim().optional().nullable(),
  unitCode: z.string().trim().max(20).default("PCS"),
  taxPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  mrp: z.coerce.number().min(0, "MRP must be >= 0"),
  dealerPrice: z.coerce.number().min(0, "Dealer price must be >= 0").default(0),
  stock: z.coerce.number().min(0).default(0),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED", "OUT_OF_STOCK"]).default("ACTIVE"),
  publishStatus: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).default("PUBLISHED"),
  shortDescription: z.string().trim().max(1000).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  images: z.array(
    z.object({
      url: z.string().min(1),
      altText: z.string().optional().nullable(),
      isPrimary: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    })
  ).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const sellerId = session.sellerId;
  const userId = session.user?.id;

  const body = await request.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid product data.", 422, parsed.error.format());
  }

  const data = parsed.data;
  const sku = data.sku && data.sku.trim().length > 0 ? data.sku.trim().toUpperCase() : generateSku(data.name);
  const slug = data.slug && data.slug.trim().length > 0 ? generateSlug(data.slug) : generateSlug(data.name);

  // Check unique constraints for seller
  const existingSku = await prisma.product.findFirst({
    where: { sellerId, sku, deletedAt: null },
  });
  if (existingSku) {
    return apiError("DUPLICATE_SKU", `A product with SKU "${sku}" already exists.`, 409);
  }

  let finalSlug = slug;
  const existingSlug = await prisma.product.findFirst({
    where: { sellerId, slug: finalSlug, deletedAt: null },
  });
  if (existingSlug) {
    finalSlug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  try {
    const createdProduct = await prisma.$transaction(async (tx) => {
      // 1. Create Core Product
      const product = await tx.product.create({
        data: {
          sellerId,
          name: data.name,
          sku,
          slug: finalSlug,
          categoryId: data.categoryId || null,
          brandId: data.brandId || null,
          unitCode: data.unitCode,
          taxPercent: data.taxPercent !== undefined && data.taxPercent !== null ? new Prisma.Decimal(data.taxPercent) : null,
          status: data.status,
          publishStatus: data.publishStatus,
          shortDescription: data.shortDescription || null,
          description: data.description || null,
          createdById: userId || null,
        },
      });

      // 2. Create Default Variant
      const variant = await tx.productVariant.create({
        data: {
          sellerId,
          productId: product.id,
          name: "Standard",
          sku: `${sku}-DEF`,
          isDefault: true,
          status: data.status,
          mrp: new Prisma.Decimal(data.mrp),
        },
      });

      // 3. Create Default Dealer Price
      await tx.productPrice.create({
        data: {
          sellerId,
          productId: product.id,
          variantId: variant.id,
          priceType: "DEFAULT_DEALER",
          amount: new Prisma.Decimal(data.dealerPrice),
          createdById: userId || null,
        },
      });

      // 4. Create Initial Inventory in Primary Warehouse
      const warehouse = await tx.warehouse.findFirst({
        where: { sellerId, isActive: true },
      });

      if (warehouse) {
        await tx.inventory.create({
          data: {
            sellerId,
            warehouseId: warehouse.id,
            productId: product.id,
            variantId: variant.id,
            availableQuantity: new Prisma.Decimal(data.stock),
          },
        });
      }

      // 5. Create Images if provided
      if (data.images && data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img, idx) => ({
            sellerId,
            productId: product.id,
            url: img.url,
            altText: img.altText || data.name,
            isPrimary: img.isPrimary ?? idx === 0,
            displayOrder: img.displayOrder ?? idx,
          })),
        });
      }

      return product;
    });

    return apiSuccess(createdProduct, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create product.";
    return apiError("PRODUCT_CREATE_FAILED", msg, 500);
  }
}
