import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  generateRandomPassword: z.boolean().optional(),
});

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let randomStr = "";
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Dealer#${randomStr}!`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id: rawDealerId } = await params;
  const dealerId = decodeURIComponent(rawDealerId);
  let sellerId = session.sellerId;
  if (!sellerId) {
    const activeSeller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } });
    sellerId = activeSeller?.id;
  }
  if (!sellerId) {
    return apiError("SELLER_NOT_FOUND", "Active seller context required.", 404);
  }

  const dealer = await prisma.dealer.findFirst({
    where: {
      sellerId,
      OR: [
        { id: dealerId },
        { code: dealerId },
        { email: dealerId },
      ],
    },
    include: {
      memberships: {
        where: { status: "active" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              status: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
        },
        take: 1,
      },
      employees: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              status: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!dealer) {
    return apiError("NOT_FOUND", "Dealer not found.", 404);
  }

  let user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    status: string;
    createdAt: Date;
    lastLoginAt: Date | null;
  } | null = dealer.memberships[0]?.user || dealer.employees[0]?.user || null;

  if (!user && dealer.email) {
    user = await prisma.user.findUnique({
      where: { email: dealer.email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  }

  return apiSuccess({
    dealer: {
      id: dealer.id,
      code: dealer.code,
      name: dealer.tradingName || dealer.legalName,
      contactName: dealer.contactName,
      email: dealer.email,
      phone: dealer.phone,
      status: dealer.status,
    },
    hasCredentials: Boolean(user),
    user,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  const currentUserId = session.user.id;

  const { id: rawDealerId } = await params;
  const dealerId = decodeURIComponent(rawDealerId);
  let sellerId = session.sellerId;
  if (!sellerId) {
    const activeSeller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } });
    sellerId = activeSeller?.id;
  }
  if (!sellerId) {
    return apiError("SELLER_NOT_FOUND", "Active seller context required.", 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input parameters.", 422, parsed.error.format());
  }

  const dealer = await prisma.dealer.findFirst({
    where: {
      sellerId,
      OR: [
        { id: dealerId },
        { code: dealerId },
        { email: dealerId },
      ],
    },
  });

  if (!dealer) {
    return apiError("NOT_FOUND", "Dealer not found.", 404);
  }

  const email = (parsed.data.email || dealer.email || "").trim().toLowerCase();
  if (!email) {
    return apiError("VALIDATION_ERROR", "Dealer does not have a valid email address.", 422);
  }

  const rawPassword = parsed.data.generateRandomPassword || !parsed.data.password
    ? generateSecurePassword()
    : parsed.data.password.trim();

  const passwordHash = await bcrypt.hash(rawPassword, 10);
  const contactName = parsed.data.name || dealer.contactName || dealer.legalName;
  const phone = parsed.data.phone || dealer.phone || null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create user
      let user = await tx.user.findUnique({ where: { email } });
      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            status: "ACTIVE",
            name: user.name || contactName,
            phone: user.phone || phone,
            emailVerified: user.emailVerified || new Date(),
            loginAttempts: 0,
            lockedUntil: null,
          },
        });
      } else {
        user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name: contactName,
            phone,
            status: "ACTIVE",
            emailVerified: new Date(),
          },
        });
      }

      // 2. Link UserSellerMembership with dealerId
      await tx.userSellerMembership.upsert({
        where: {
          userId_sellerId: {
            userId: user.id,
            sellerId,
          },
        },
        create: {
          userId: user.id,
          sellerId,
          dealerId: dealer.id,
          status: "active",
          isDefault: true,
        },
        update: {
          dealerId: dealer.id,
          status: "active",
        },
      });

      // 3. Link DealerEmployee record
      await tx.dealerEmployee.upsert({
        where: {
          sellerId_dealerId_userId: {
            sellerId,
            dealerId: dealer.id,
            userId: user.id,
          },
        },
        create: {
          sellerId,
          dealerId: dealer.id,
          userId: user.id,
          designation: "Primary Dealer Admin",
          isPrimary: true,
          status: "active",
        },
        update: {
          status: "active",
          isPrimary: true,
        },
      });

      // 4. Assign DEALER role
      let dealerRole = await tx.role.findFirst({
        where: { code: "DEALER", OR: [{ sellerId }, { sellerId: null }] },
      });

      if (!dealerRole) {
        dealerRole = await tx.role.create({
          data: {
            code: "DEALER",
            name: "Dealer Portal User",
            sellerId,
            systemRole: true,
            description: "Authorized dealer portal access",
          },
        });
      }

      await tx.userRole.upsert({
        where: {
          userId_roleId_sellerId: {
            userId: user.id,
            roleId: dealerRole.id,
            sellerId,
          },
        },
        create: {
          userId: user.id,
          roleId: dealerRole.id,
          sellerId,
        },
        update: {},
      });

      // 5. If dealer email was empty, update dealer email
      if (!dealer.email) {
        await tx.dealer.update({
          where: { id: dealer.id },
          data: { email },
        });
      }

      // 6. Audit Log
      await tx.auditLog.create({
        data: {
          sellerId,
          userId: currentUserId,
          action: "dealer.credentials.configured",
          entity: "Dealer",
          entityId: dealer.id,
          newValue: JSON.stringify({ email, userId: user.id }),
          severity: "MEDIUM",
        },
      });

      return { user };
    });

    return apiSuccess({
      dealerId: dealer.id,
      dealerCode: dealer.code,
      dealerName: dealer.tradingName || dealer.legalName,
      email: result.user.email,
      name: result.user.name,
      password: rawPassword,
      loginUrl: "/dealer/login",
      message: "Dealer login credentials successfully configured.",
    });
  } catch (err) {
    console.error("Dealer credentials setup error:", err);
    return apiError("INTERNAL_ERROR", "Failed to setup dealer credentials.", 500);
  }
}
