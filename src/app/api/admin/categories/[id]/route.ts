import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  slug: z.string().trim().max(100).optional(),
  code: z.string().trim().max(50).optional(),
  parentId: z.string().trim().optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  displayOrder: z.coerce.number().int().optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED", "OUT_OF_STOCK"]).optional(),
  seoTitle: z.string().trim().max(200).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await params;
  const category = await prisma.productCategory.findFirst({
    where: { id, sellerId: session.sellerId, deletedAt: null },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  if (!category) {
    return apiError("NOT_FOUND", "Category not found.", 404);
  }

  return apiSuccess({
    ...category,
    taxPercent: category.taxPercent !== null ? Number(category.taxPercent) : null,
    productCount: category._count.products,
    subCategoryCount: category._count.children,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await params;
  const sellerId = session.sellerId;

  const existing = await prisma.productCategory.findFirst({
    where: { id, sellerId, deletedAt: null },
  });
  if (!existing) {
    return apiError("NOT_FOUND", "Category not found.", 404);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid category data.", 422, parsed.error.format());
  }

  const data = parsed.data;

  // Prevent cycle in hierarchy
  if (data.parentId && data.parentId === id) {
    return apiError("INVALID_PARENT", "A category cannot be its own parent.", 400);
  }

  // Check unique constraints if slug or code changed
  if (data.slug && data.slug !== existing.slug) {
    const cleanSlug = generateSlug(data.slug);
    const dup = await prisma.productCategory.findFirst({
      where: { sellerId, slug: cleanSlug, id: { not: id }, deletedAt: null },
    });
    if (dup) {
      return apiError("DUPLICATE_SLUG", "Another category already uses this slug.", 409);
    }
  }

  if (data.code && data.code !== existing.code) {
    const cleanCode = data.code.trim().toUpperCase();
    const dup = await prisma.productCategory.findFirst({
      where: { sellerId, code: cleanCode, id: { not: id }, deletedAt: null },
    });
    if (dup) {
      return apiError("DUPLICATE_CODE", "Another category already uses this code.", 409);
    }
  }

  const updated = await prisma.productCategory.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.slug !== undefined ? { slug: generateSlug(data.slug || existing.name) } : {}),
      ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId || null } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      ...(data.taxPercent !== undefined
        ? { taxPercent: data.taxPercent !== null ? new Prisma.Decimal(data.taxPercent) : null }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
    },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
  });

  return apiSuccess(updated);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await params;
  const sellerId = session.sellerId;

  const existing = await prisma.productCategory.findFirst({
    where: { id, sellerId, deletedAt: null },
  });
  if (!existing) {
    return apiError("NOT_FOUND", "Category not found.", 404);
  }

  const body = await request.json().catch(() => null);
  const newStatus = body?.status || (existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");

  const updated = await prisma.productCategory.update({
    where: { id },
    data: { status: newStatus },
  });

  return apiSuccess(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await params;
  const sellerId = session.sellerId;

  const existing = await prisma.productCategory.findFirst({
    where: { id, sellerId, deletedAt: null },
    include: {
      _count: { select: { products: true, children: true } },
    },
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Category not found.", 404);
  }

  // If category has products attached, disassociate them or mark deletedAt
  if (existing._count.products > 0) {
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
  }

  // If category has children, remove parentId link
  if (existing._count.children > 0) {
    await prisma.productCategory.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });
  }

  await prisma.productCategory.delete({
    where: { id },
  });

  return apiSuccess({ deleted: true, id });
}
