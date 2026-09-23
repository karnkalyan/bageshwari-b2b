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

const createBrandSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  logoUrl: z.string().trim().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED", "OUT_OF_STOCK"]).default("ACTIVE"),
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

  const where: Prisma.ProductBrandWhereInput = {
    sellerId,
    deletedAt: null,
    ...(status ? { status: status as any } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { slug: { contains: search } },
          ],
        }
      : {}),
  };

  const brands = await prisma.productBrand.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true } },
    },
  });

  const serialized = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description,
    logoUrl: b.logoUrl,
    status: b.status,
    productCount: b._count.products,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
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
  const parsed = createBrandSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid brand data.", 422, parsed.error.format());
  }

  const data = parsed.data;
  const slug = data.slug && data.slug.trim().length > 0 ? generateSlug(data.slug) : generateSlug(data.name);

  // Check unique slug for this seller
  const existing = await prisma.productBrand.findFirst({
    where: { sellerId, slug, deletedAt: null },
  });
  if (existing) {
    return apiError("DUPLICATE_SLUG", "A brand with this slug already exists.", 409);
  }

  const brand = await prisma.productBrand.create({
    data: {
      sellerId,
      name: data.name,
      slug,
      description: data.description || null,
      logoUrl: data.logoUrl || null,
      status: data.status,
    },
    include: {
      _count: { select: { products: true } },
    },
  });

  return apiSuccess(brand, { status: 201 });
}
