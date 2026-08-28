import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export interface TenantContext {
  sellerId: string;
  sellerSlug: string;
  sellerName: string;
  userId: string;
  roles: string[];
  permissions: string[];
  dealerId?: string | null;
}

function normalizeHostname(value: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0] || null;
}

async function loadAuthorization(userId: string, sellerId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId, OR: [{ sellerId }, { sellerId: null }] },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  return {
    roles: [...new Set(userRoles.map((userRole) => userRole.role.code))],
    permissions: [...new Set(userRoles.flatMap((userRole) =>
      userRole.role.permissions.map((rolePermission) => rolePermission.permission.code)
    ))],
  };
}

export async function resolveSellerFromHostname(hostname: string | null) {
  const normalized = normalizeHostname(hostname);
  if (!normalized || normalized === "localhost" || normalized === "127.0.0.1") return null;

  const domain = await prisma.sellerDomain.findFirst({
    where: {
      hostname: normalized,
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      seller: { status: "ACTIVE" },
    },
    select: { seller: true },
  });
  if (domain) return domain.seller;

  const platformDomain = normalizeHostname(process.env.PLATFORM_DOMAIN || null);
  if (!platformDomain || !normalized.endsWith(`.${platformDomain}`)) return null;
  const slug = normalized.slice(0, -(platformDomain.length + 1));
  if (!slug || slug.includes(".")) return null;

  return prisma.seller.findFirst({ where: { slug, status: "ACTIVE" } });
}

/**
 * Resolves the active seller context from:
 * 1. Authenticated user membership
 * 2. Route parameter (sellerSlug)
 * 3. Development route fallback
 *
 * Never trusts a sellerId sent by the browser.
 */
export async function getTenantContext(
  sellerSlug?: string,
  loginPath = "/staff/login",
): Promise<TenantContext> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(loginPath);
  }

  const sessionData = session;

  // If a slug is provided via route, verify the user has access
  if (sellerSlug) {
    const seller = await prisma.seller.findUnique({
      where: { slug: sellerSlug },
      select: { id: true, slug: true, tradingName: true, status: true },
    });

    if (!seller || seller.status !== "ACTIVE") {
      redirect("/");
    }

    // Check if user has membership for this seller (or is platform admin)
    const isPlatformAdmin = (sessionData.roles || []).some((r: string) =>
      ["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(r)
    );

    const membership = await prisma.userSellerMembership.findUnique({
      where: {
        userId_sellerId: {
          userId: session.user.id,
          sellerId: seller.id,
        },
      },
    });

    if (!isPlatformAdmin) {
      if (!membership || membership.status !== "active") {
        redirect("/unauthorized");
      }
    }

    const authorization = await loadAuthorization(session.user.id, seller.id);
    return {
      sellerId: seller.id,
      sellerSlug: seller.slug,
      sellerName: seller.tradingName,
      userId: session.user.id,
      roles: authorization.roles,
      permissions: authorization.permissions,
      dealerId: membership?.dealerId || null,
    };
  }

  // Use the session's current seller context
  if (sessionData.sellerId) {
    const membership = await prisma.userSellerMembership.findFirst({
      where: {
        userId: session.user.id,
        sellerId: sessionData.sellerId,
        status: "active",
        seller: { status: "ACTIVE" },
      },
      include: { seller: { select: { id: true, slug: true, tradingName: true } } },
    });
    const isPlatformAdmin = (sessionData.roles || []).some((role: string) =>
      ["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(role)
    );
    const seller = membership?.seller || (isPlatformAdmin
      ? await prisma.seller.findFirst({
          where: { id: sessionData.sellerId, status: "ACTIVE" },
          select: { id: true, slug: true, tradingName: true },
        })
      : null);
    if (!seller) redirect("/unauthorized");
    const authorization = await loadAuthorization(session.user.id, seller.id);

    return {
      sellerId: seller.id,
      sellerSlug: seller.slug,
      sellerName: seller.tradingName,
      userId: session.user.id,
      roles: authorization.roles,
      permissions: authorization.permissions,
      dealerId: membership?.dealerId || null,
    };
  }

  redirect(loginPath);
}

/**
 * Gets seller context for public pages (no auth required)
 * Resolves from route slug or domain
 */
export async function getPublicSellerContext(sellerSlug?: string) {
  const requestHeaders = await headers();
  const domainSeller = await resolveSellerFromHostname(requestHeaders.get("host"));
  const seller = domainSeller || await prisma.seller.findFirst({
    where: { slug: sellerSlug, status: "ACTIVE" },
    select: {
      id: true,
      slug: true,
      legalName: true,
      tradingName: true,
      description: true,
      email: true,
      phone: true,
      website: true,
      countryCode: true,
      country: true,
      province: true,
      district: true,
      city: true,
      addressLine1: true,
      currencyCode: true,
      timeZone: true,
      taxNumber: true,
      registrationNumber: true,
      status: true,
      industry: true,
    },
  });

  if (!seller || seller.status !== "ACTIVE") {
    return null;
  }

  return seller;
}

/**
 * Check if the current user has a specific permission
 */
export function hasPermission(
  ctx: TenantContext,
  permission: string
): boolean {
  if (ctx.roles.includes("SUPER_ADMIN") || ctx.roles.includes("PLATFORM_ADMIN")) {
    return true;
  }
  return ctx.permissions.includes(permission);
}

/**
 * Check if the current user has any of the specified roles
 */
export function hasRole(ctx: TenantContext, ...roles: string[]): boolean {
  return roles.some((r) => ctx.roles.includes(r));
}

/**
 * Require a specific permission, redirect if not authorized
 */
export async function requirePermission(
  ctx: TenantContext,
  permission: string
): Promise<void> {
  if (!hasPermission(ctx, permission)) {
    redirect("/unauthorized");
  }
}

/**
 * Require any of the specified roles, redirect if not authorized
 */
export async function requireRole(
  ctx: TenantContext,
  ...roles: string[]
): Promise<void> {
  if (!hasRole(ctx, ...roles)) {
    redirect("/unauthorized");
  }
}
