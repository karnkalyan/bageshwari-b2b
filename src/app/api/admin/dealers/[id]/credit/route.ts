import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const updateCreditSchema = z.object({
  creditLimit: z.coerce.number().min(0).optional(),
  availableCredit: z.coerce.number().min(0).optional(),
  creditPeriodDays: z.coerce.number().int().min(0).max(365).optional(),
  holdStatus: z.boolean().optional(),
  holdReason: z.string().trim().max(500).optional().nullable(),
  creditEligible: z.boolean().optional(),
  resetAvailable: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id: dealerId } = await params;
  const sellerId = session.sellerId || "bageshwari-tractors";

  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, sellerId },
    include: { creditProfile: true },
  });

  if (!dealer) {
    return apiError("NOT_FOUND", "Dealer not found.", 404);
  }

  return apiSuccess({
    dealerId: dealer.id,
    dealerCode: dealer.code,
    dealerName: dealer.tradingName || dealer.legalName,
    creditEligible: dealer.creditEligible,
    creditProfile: dealer.creditProfile
      ? {
          id: dealer.creditProfile.id,
          creditLimit: Number(dealer.creditProfile.creditLimit),
          availableCredit: Number(dealer.creditProfile.availableCredit),
          currentOutstanding: Number(dealer.creditProfile.currentOutstanding),
          creditPeriodDays: dealer.creditProfile.creditPeriodDays,
          holdStatus: dealer.creditProfile.holdStatus,
          holdReason: dealer.creditProfile.holdReason,
          approvedAt: dealer.creditProfile.approvedAt,
        }
      : null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id: dealerId } = await params;
  const sellerId = session.sellerId || "bageshwari-tractors";

  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, sellerId },
    include: { creditProfile: true },
  });

  if (!dealer) {
    return apiError("NOT_FOUND", "Dealer not found.", 404);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_INPUT", "Invalid JSON payload.", 400);
  }

  const parsed = updateCreditSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_FAILED", "Invalid fields provided.", 422, parsed.error.format());
  }

  const data = parsed.data;

  // Update dealer eligibility if provided
  if (data.creditEligible !== undefined) {
    await prisma.dealer.update({
      where: { id: dealerId },
      data: { creditEligible: data.creditEligible },
    });
  }

  const existingProfile = dealer.creditProfile;
  const currentLimit = data.creditLimit !== undefined ? data.creditLimit : (existingProfile ? Number(existingProfile.creditLimit) : 0);
  const currentOutstanding = existingProfile ? Number(existingProfile.currentOutstanding) : 0;
  
  let newAvailableCredit: number;
  if (data.resetAvailable) {
    newAvailableCredit = Math.max(0, currentLimit - currentOutstanding);
  } else if (data.availableCredit !== undefined) {
    newAvailableCredit = data.availableCredit;
  } else if (data.creditLimit !== undefined && existingProfile) {
    // If limit changed without explicit available, adjust available by difference
    const diff = data.creditLimit - Number(existingProfile.creditLimit);
    newAvailableCredit = Math.max(0, Number(existingProfile.availableCredit) + diff);
  } else {
    newAvailableCredit = existingProfile ? Number(existingProfile.availableCredit) : currentLimit;
  }

  const periodDays = data.creditPeriodDays !== undefined ? data.creditPeriodDays : (existingProfile?.creditPeriodDays ?? 30);
  const hold = data.holdStatus !== undefined ? data.holdStatus : (existingProfile?.holdStatus ?? false);
  const holdReason = data.holdReason !== undefined ? data.holdReason : (existingProfile?.holdReason ?? null);

  let updatedProfile;
  if (existingProfile) {
    updatedProfile = await prisma.dealerCreditProfile.update({
      where: { id: existingProfile.id },
      data: {
        creditEligible: data.creditEligible !== undefined ? data.creditEligible : existingProfile.creditEligible,
        creditLimit: new Prisma.Decimal(currentLimit),
        availableCredit: new Prisma.Decimal(newAvailableCredit),
        creditPeriodDays: periodDays,
        holdStatus: hold,
        holdReason,
        approvedAt: new Date(),
      },
    });
  } else {
    updatedProfile = await prisma.dealerCreditProfile.create({
      data: {
        sellerId,
        dealerId,
        creditEligible: data.creditEligible !== undefined ? data.creditEligible : true,
        creditLimit: new Prisma.Decimal(currentLimit),
        availableCredit: new Prisma.Decimal(newAvailableCredit),
        currentOutstanding: new Prisma.Decimal(0),
        creditPeriodDays: periodDays,
        holdStatus: hold,
        holdReason,
        approvedAt: new Date(),
      },
    });
  }

  return apiSuccess({
    message: "Dealer credit profile updated successfully.",
    creditEligible: data.creditEligible !== undefined ? data.creditEligible : dealer.creditEligible,
    creditProfile: {
      id: updatedProfile.id,
      creditLimit: Number(updatedProfile.creditLimit),
      availableCredit: Number(updatedProfile.availableCredit),
      currentOutstanding: Number(updatedProfile.currentOutstanding),
      creditPeriodDays: updatedProfile.creditPeriodDays,
      holdStatus: updatedProfile.holdStatus,
      holdReason: updatedProfile.holdReason,
      approvedAt: updatedProfile.approvedAt,
    },
  });
}
