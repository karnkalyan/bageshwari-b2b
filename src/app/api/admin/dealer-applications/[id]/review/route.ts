import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";
import { sendWorkflowNotification } from "@/services/notification.service";
import { nextDocumentNumber } from "@/services/number-sequence.service";
import { Prisma } from "@prisma/client";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().trim().max(2000).optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  creditPeriodDays: z.coerce.number().int().min(0).max(365).optional().default(30),
  dealerGroupId: z.string().optional().nullable(),
  pricingGroupId: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  let sellerId = session.sellerId;
  if (!sellerId) {
    const activeSeller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } });
    sellerId = activeSeller?.id;
  }
  if (!sellerId) {
    return apiError("SELLER_NOT_FOUND", "Active seller context required.", 404);
  }

  const { id } = await params;
  const userId = session.user.id;
  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid review parameters.", 422, parsed.error.format());
  }

  const { action, rejectionReason, creditLimit = 500000, creditPeriodDays = 30, dealerGroupId, pricingGroupId } = parsed.data;

  if (action === "REJECT" && !rejectionReason) {
    return apiError("VALIDATION_ERROR", "Rejection comments/reason is mandatory for rejected applications.", 422);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.dealerApplication.findFirst({
        where: { id, sellerId },
      });

      if (!application) {
        throw new Error("APPLICATION_NOT_FOUND");
      }

      if (action === "REJECT") {
        const updated = await tx.dealerApplication.update({
          where: { id: application.id },
          data: {
            status: "REJECTED",
            rejectionReason: rejectionReason || "Application does not meet current dealership eligibility criteria.",
            reviewedById: userId,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            sellerId,
            userId,
            action: "dealer.application.rejected",
            entity: "DealerApplication",
            entityId: application.id,
            newValue: JSON.stringify({ reason: rejectionReason, email: application.email }),
            severity: "MEDIUM",
          },
        });

        return { application: updated, dealer: null };
      }

      // Action is APPROVE -> Convert to Dealer
      const dealerCode = await nextDocumentNumber(tx, sellerId, "DEALER_CODE", "DLR");

      const createdDealer = await tx.dealer.create({
        data: {
          sellerId,
          code: dealerCode,
          legalName: application.businessName,
          tradingName: application.businessName,
          contactName: application.contactName,
          email: application.email,
          phone: application.phone,
          taxNumber: application.taxNumber,
          registrationNumber: application.registrationNumber,
          status: "ACTIVE",
          creditEligible: application.creditRequested || creditLimit > 0,
          dealerGroupId: dealerGroupId || undefined,
          pricingGroupId: pricingGroupId || undefined,
          approvedById: userId,
          approvedAt: new Date(),
          notes: application.remarks || `Converted from application submitted on ${application.createdAt.toISOString()}`,
          addresses: application.addressLine1
            ? {
                create: {
                  sellerId,
                  type: "BOTH",
                  isDefault: true,
                  addressLine1: application.addressLine1,
                  city: application.city || "Nepalgunj",
                  district: application.district || "Banke",
                  province: application.province || "Lumbini",
                  contactName: application.contactName,
                  phone: application.phone || "",
                },
              }
            : undefined,
          creditProfile: {
            create: {
              sellerId,
              creditEligible: application.creditRequested || creditLimit > 0,
              creditLimit: new Prisma.Decimal(creditLimit),
              availableCredit: new Prisma.Decimal(creditLimit),
              currentOutstanding: new Prisma.Decimal(0),
              creditPeriodDays,
              approvedById: userId,
              approvedAt: new Date(),
            },
          },
        },
      });

      const updatedApp = await tx.dealerApplication.update({
        where: { id: application.id },
        data: {
          status: "APPROVED",
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          sellerId,
          userId,
          action: "dealer.application.approved",
          entity: "DealerApplication",
          entityId: application.id,
          newValue: JSON.stringify({ dealerId: createdDealer.id, code: dealerCode }),
          severity: "LOW",
        },
      });

      return { application: updatedApp, dealer: createdDealer };
    });

    // Cross-role notifications
    if (action === "REJECT") {
      await sendWorkflowNotification({
        sellerId,
        targetRoles: ["ADMIN", "SUPER_ADMIN", "SALES_MANAGER"],
        title: `Dealership Application Rejected: ${result.application.businessName}`,
        message: `Application for ${result.application.businessName} was rejected with comments: "${result.application.rejectionReason}". Notice sent to ${result.application.email}.`,
        linkUrl: `/admin/dealers`,
        excludeUserId: userId,
      });
    } else if (result.dealer) {
      await sendWorkflowNotification({
        sellerId,
        targetRoles: ["ADMIN", "SUPER_ADMIN", "SALES_MANAGER", "ACCOUNTANT"],
        title: `New Dealer Onboarded: ${result.dealer.legalName} (${result.dealer.code})`,
        message: `Dealership application approved. New dealer ${result.dealer.legalName} (${result.dealer.code}) is now active with credit limit NPR ${creditLimit.toLocaleString()}.`,
        linkUrl: `/admin/dealers`,
        excludeUserId: userId,
      });
    }

    return apiSuccess({
      success: true,
      status: result.application.status,
      rejectionReason: result.application.rejectionReason,
      dealer: result.dealer ? { id: result.dealer.id, code: result.dealer.code } : null,
    });
  } catch (error: unknown) {
    console.error("Dealer application review error:", error);
    const message = error instanceof Error ? error.message : "Failed to review dealer application.";
    return apiError("REVIEW_FAILED", message, 500);
  }
}
