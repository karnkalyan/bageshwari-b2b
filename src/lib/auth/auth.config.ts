import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, getClientAddress } from "@/lib/security/request-guard";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  loginScope: z.enum(["staff", "dealer"]).default("staff"),
});

export const authConfig: NextAuthConfig = {
  // Required for verified seller custom domains and reverse-proxy deployments.
  // The application still resolves and authorizes the seller independently.
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginScope: { label: "Login scope", type: "text" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        const { password, loginScope } = parsed.data;
        const clientIp = getClientAddress(request);
        const rateLimit = checkRateLimit(`login:${clientIp}:${email}`, {
          limit: 30,
          windowMs: 15 * 60 * 1000,
        });
        if (!rateLimit.allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              where: { status: "active", seller: { status: "ACTIVE" } },
              include: {
                seller: { select: { id: true, slug: true, tradingName: true, status: true, code: true } },
              },
            },
            userRoles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!user || !user.passwordHash) return null;
        if (user.status === "SUSPENDED") return null;

        // Check if user is locked
        if (user.status === "LOCKED") {
          if (user.lockedUntil && new Date() < user.lockedUntil) {
            return null;
          }
          if (!user.lockedUntil) {
            return null;
          }
        }

        const isPlatformAdmin = user.userRoles.some((ur) =>
          ["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(ur.role.code)
        );

        const defaultMembership = user.memberships[0];
        let defaultSeller = defaultMembership?.seller;

        // If platform super admin without membership, assign first active seller
        if (isPlatformAdmin && !defaultMembership) {
          const firstSeller = await prisma.seller.findFirst({
            where: { status: "ACTIVE" },
            select: { id: true, slug: true, tradingName: true, status: true, code: true },
          });
          if (firstSeller) {
            defaultSeller = firstSeller;
          }
        }

        const isDealer = Boolean(defaultMembership?.dealerId);

        // Platform admins and staff users log in via 'staff', dealers log in via 'dealer'
        const isAuthorizedScope = loginScope === "dealer" ? isDealer : (!isDealer || isPlatformAdmin);

        if (!isAuthorizedScope || (!defaultMembership && !isPlatformAdmin)) {
          await prisma.loginHistory.create({
            data: {
              userId: user.id,
              ipAddress: clientIp,
              userAgent: request?.headers ? (typeof request.headers.get === "function" ? request.headers.get("user-agent") : null) : null,
              success: false,
              reason: "Account is not authorized for this login portal",
            },
          });
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          // Increment login attempts
          const attempts = user.loginAttempts + 1;
          const lockData: Record<string, unknown> = { loginAttempts: attempts };

          if (attempts >= 5) {
            lockData.status = "LOCKED";
            lockData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lockout
          }

          await prisma.user.update({ where: { id: user.id }, data: lockData });
          await prisma.loginHistory.create({
            data: {
              userId: user.id,
              ipAddress: clientIp,
              userAgent: request?.headers ? (typeof request.headers.get === "function" ? request.headers.get("user-agent") : null) : null,
              success: false,
              reason: "Invalid password",
            },
          });
          return null;
        }

        // Reset login attempts and lock on success
        await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: 0, status: "ACTIVE", lockedUntil: null, lastLoginAt: new Date() },
        });

        await prisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: clientIp,
            userAgent: request?.headers ? (typeof request.headers.get === "function" ? request.headers.get("user-agent") : null) : null,
            success: true,
          },
        });

        // Never merge roles from unrelated seller workspaces into one token.
        const permissions = new Set<string>();
        const roles: string[] = [];
        user.userRoles
          .filter((userRole) => isPlatformAdmin || userRole.sellerId === null || userRole.sellerId === defaultSeller?.id)
          .forEach((ur) => {
            roles.push(ur.role.code);
            ur.role.permissions.forEach((rp) => {
              permissions.add(rp.permission.code);
            });
          });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          roles,
          permissions: Array.from(permissions),
          sellerId: defaultSeller?.id || null,
          sellerSlug: defaultSeller?.slug || null,
          sellerName: defaultSeller?.tradingName || null,
          dealerId: defaultMembership?.dealerId || null,
          memberships: user.memberships.map((m) => ({
            sellerId: m.sellerId,
            sellerSlug: m.seller.slug,
            sellerName: m.seller.tradingName,
            dealerId: m.dealerId,
            isDefault: m.isDefault,
          })),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.permissions = user.permissions;
        token.sellerId = user.sellerId;
        token.sellerSlug = user.sellerSlug;
        token.sellerName = user.sellerName;
        token.dealerId = user.dealerId;
        token.memberships = user.memberships;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles;
        session.user.permissions = token.permissions;
        session.user.sellerId = token.sellerId;
        session.user.sellerSlug = token.sellerSlug;
        session.user.sellerName = token.sellerName;
        session.user.dealerId = token.dealerId;
        session.user.memberships = token.memberships;
      }
      session.roles = token.roles;
      session.permissions = token.permissions;
      session.sellerId = token.sellerId;
      session.sellerSlug = token.sellerSlug;
      session.sellerName = token.sellerName;
      session.dealerId = token.dealerId;
      session.memberships = token.memberships;
      return session;
    },
  },
  pages: {
    signIn: "/staff/login",
    error: "/staff/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};
