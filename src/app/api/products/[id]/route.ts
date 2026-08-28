import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  sku: z.string().trim().min(1).max(50).optional(),
  shortDescription: z.string().trim().max(1000).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED", "OUT_OF_STOCK"]).optional(),
  unitCode: z.string().max(20).optional(),
  minimumOrderQuantity: z.coerce.number().min(1).optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  mrp: z.coerce.number().min(0).optional(),
  dealerPrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).optional(),
  images: z.array(
    z.object({
      id: z.string().optional(),
      url: z.string().min(1),
      altText: z.string().optional().nullable(),
      isPrimary: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    })
  ).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const { id } = await params;
  const sellerId = session.sellerId;

  const product = await prisma.product.findFirst({
    where: { id, sellerId },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { displayOrder: "asc" } },
      variants: { where: { isDefault: true }, take: 1 },
      prices: { where: { priceType: "DEFAULT_DEALER" }, take: 1 },
      inventories: true,
    },
  });

  if (!product) return apiError("PRODUCT_NOT_FOUND", "Product not found.", 404);

  return apiSuccess(product);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const sellerId: string = session.sellerId;
  const userId: string = session.user.id;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid product data.", 422, parsed.error.format());
  }

  const { mrp, dealerPrice, stock, images, ...productFields } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({
        where: { id, sellerId },
        include: {
          variants: { where: { isDefault: true }, take: 1 },
          prices: { where: { priceType: "DEFAULT_DEALER" }, take: 1 },
          inventories: { take: 1 },
        },
      });

      if (!existing) throw new Error("PRODUCT_NOT_FOUND");

      // 1. Update Product core fields (including taxPercent)
      const product = await tx.product.update({
        where: { id: existing.id },
        data: {
          ...(productFields.name ? { name: productFields.name } : {}),
          ...(productFields.sku ? { sku: productFields.sku } : {}),
          ...(productFields.shortDescription !== undefined ? { shortDescription: productFields.shortDescription } : {}),
          ...(productFields.description !== undefined ? { description: productFields.description } : {}),
          ...(productFields.categoryId !== undefined ? { categoryId: productFields.categoryId } : {}),
          ...(productFields.brandId !== undefined ? { brandId: productFields.brandId } : {}),
          ...(productFields.status ? { status: productFields.status } : {}),
          ...(productFields.unitCode ? { unitCode: productFields.unitCode } : {}),
          ...(productFields.minimumOrderQuantity !== undefined ? { minimumOrderQuantity: productFields.minimumOrderQuantity } : {}),
          ...(productFields.taxPercent !== undefined ? { taxPercent: productFields.taxPercent !== null ? new Prisma.Decimal(productFields.taxPercent) : null } : {}),
        },
      });

      // 2. Update Default Variant MRP if provided
      if (mrp !== undefined) {
        if (existing.variants[0]) {
          await tx.productVariant.update({
            where: { id: existing.variants[0].id },
            data: { mrp: new Prisma.Decimal(mrp) },
          });
        } else {
          await tx.productVariant.create({
            data: {
              sellerId,
              productId: product.id,
              name: "Default",
              sku: `${product.sku}-DEF`,
              isDefault: true,
              mrp: new Prisma.Decimal(mrp),
            },
          });
        }
      }

      // 3. Update Default Dealer Price if provided
      if (dealerPrice !== undefined) {
        if (existing.prices[0]) {
          await tx.productPrice.update({
            where: { id: existing.prices[0].id },
            data: { amount: new Prisma.Decimal(dealerPrice) },
          });
        } else {
          await tx.productPrice.create({
            data: {
              sellerId,
              productId: product.id,
              priceType: "DEFAULT_DEALER",
              amount: new Prisma.Decimal(dealerPrice),
              createdById: userId,
            },
          });
        }
      }

      // 4. Update Stock in default warehouse if provided
      if (stock !== undefined) {
        const defaultWarehouse = await tx.warehouse.findFirst({
          where: { sellerId, isActive: true },
        });

        if (defaultWarehouse) {
          const defaultVariant = existing.variants[0] || (await tx.productVariant.findFirst({ where: { productId: product.id } }));
          if (defaultVariant) {
            await tx.inventory.upsert({
              where: {
                sellerId_warehouseId_variantId: {
                  sellerId,
                  warehouseId: defaultWarehouse.id,
                  variantId: defaultVariant.id,
                },
              },
              update: { availableQuantity: new Prisma.Decimal(stock) },
              create: {
                sellerId,
                warehouseId: defaultWarehouse.id,
                productId: product.id,
                variantId: defaultVariant.id,
                availableQuantity: new Prisma.Decimal(stock),
              },
            });
          }
        }
      }

      // 5. Update Product Images if provided
      if (images !== undefined) {
        await tx.productImage.deleteMany({
          where: { productId: product.id },
        });

        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((img, idx) => ({
              sellerId,
              productId: product.id,
              url: img.url,
              altText: img.altText || product.name,
              isPrimary: img.isPrimary ?? (idx === 0),
              displayOrder: img.displayOrder ?? idx,
            })),
          });
        }
      }

      return product;
    });

    return apiSuccess(updated, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update product.";
    return apiError("PRODUCT_UPDATE_FAILED", message, 500);
  }
}
