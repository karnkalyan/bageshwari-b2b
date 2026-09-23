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

function generateCategoryCode(name: string): string {
  const clean = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const prefix = clean.slice(0, 4).padEnd(4, "X");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CAT-${prefix}-${rand}`;
}

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z.string().trim().max(100).optional(),
  code: z.string().trim().max(50).optional(),
  parentId: z.string().trim().optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  displayOrder: z.coerce.number().int().default(0),
  taxPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED", "OUT_OF_STOCK"]).default("ACTIVE"),
  seoTitle: z.string().trim().max(200).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const sellerId = session.sellerId;
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() || "";
  const status = url.searchParams.get("status")?.trim();

  const where: Prisma.ProductCategoryWhereInput = {
    sellerId,
    deletedAt: null,
    ...(status ? { status: status as any } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { slug: { contains: search } },
          ],
        }
      : {}),
  };

  const categories = await prisma.productCategory.findMany({
    where,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  const serialized = categories.map((c) => ({
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
    seoTitle: c.seoTitle,
    seoDescription: c.seoDescription,
    productCount: c._count.products,
    subCategoryCount: c._count.children,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return apiSuccess(serialized);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const sellerId = session.sellerId;
  const body = await request.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid category data.", 422, parsed.error.format());
  }

  const data = parsed.data;
  const slug = data.slug && data.slug.trim().length > 0 ? generateSlug(data.slug) : generateSlug(data.name);
  const code = data.code && data.code.trim().length > 0 ? data.code.trim().toUpperCase() : generateCategoryCode(data.name);

  // Check unique constraints for this seller
  const existingSlug = await prisma.productCategory.findFirst({
    where: { sellerId, slug, deletedAt: null },
  });
  if (existingSlug) {
    return apiError("DUPLICATE_SLUG", "A category with this slug already exists.", 409);
  }

  const existingCode = await prisma.productCategory.findFirst({
    where: { sellerId, code, deletedAt: null },
  });
  if (existingCode) {
    return apiError("DUPLICATE_CODE", "A category with this code already exists.", 409);
  }

  const category = await prisma.productCategory.create({
    data: {
      sellerId,
      name: data.name,
      slug,
      code,
      parentId: data.parentId || null,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      displayOrder: data.displayOrder,
      taxPercent: data.taxPercent !== undefined && data.taxPercent !== null ? new Prisma.Decimal(data.taxPercent) : null,
      status: data.status,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
    },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
  });

  return apiSuccess(category, { status: 201 });
}
