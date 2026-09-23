import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const updateBrandSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  slug: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  logoUrl: z.string().trim().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED", "OUT_OF_STOCK"]).optional(),
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
  const brand = await prisma.productBrand.findFirst({
    where: { id, sellerId: session.sellerId, deletedAt: null },
    include: {
      _count: { select: { products: true } },
    },
  });

  if (!brand) {
    return apiError("NOT_FOUND", "Brand not found.", 404);
  }

  return apiSuccess({
    ...brand,
    productCount: brand._count.products,
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

  const existing = await prisma.productBrand.findFirst({
    where: { id, sellerId, deletedAt: null },
  });
  if (!existing) {
    return apiError("NOT_FOUND", "Brand not found.", 404);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateBrandSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid brand data.", 422, parsed.error.format());
  }

  const data = parsed.data;

  // Check unique slug if changed
  if (data.slug && data.slug !== existing.slug) {
    const cleanSlug = generateSlug(data.slug);
    const dup = await prisma.productBrand.findFirst({
      where: { sellerId, slug: cleanSlug, id: { not: id }, deletedAt: null },
    });
    if (dup) {
      return apiError("DUPLICATE_SLUG", "Another brand already uses this slug.", 409);
    }
  }

  const updated = await prisma.productBrand.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.slug !== undefined ? { slug: generateSlug(data.slug || existing.name) } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    include: {
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

  const existing = await prisma.productBrand.findFirst({
    where: { id, sellerId, deletedAt: null },
  });
  if (!existing) {
    return apiError("NOT_FOUND", "Brand not found.", 404);
  }

  const body = await request.json().catch(() => null);
  const newStatus = body?.status || (existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");

  const updated = await prisma.productBrand.update({
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

  const existing = await prisma.productBrand.findFirst({
    where: { id, sellerId, deletedAt: null },
    include: {
      _count: { select: { products: true } },
    },
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Brand not found.", 404);
  }

  // Unlink brand from products
  if (existing._count.products > 0) {
    await prisma.product.updateMany({
      where: { brandId: id },
      data: { brandId: null },
    });
  }

  await prisma.productBrand.delete({
    where: { id },
  });

  return apiSuccess({ deleted: true, id });
}
