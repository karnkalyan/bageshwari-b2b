import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const changePasswordSchema = z.object({
  email: z.string().email().optional(),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid input data", 422);
    }

    const { email: providedEmail, currentPassword, newPassword } = parsed.data;
    const session = await auth();

    // Determine target user
    let targetUser: any = null;

    if (session?.user?.id) {
      // Authenticated user session
      targetUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            include: { dealer: true },
          },
        },
      });
    } else if (providedEmail) {
      // Login page flow: user specifies email
      targetUser = await prisma.user.findUnique({
        where: { email: providedEmail.trim().toLowerCase() },
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            include: { dealer: true },
          },
        },
      });
    } else {
      return apiError("EMAIL_REQUIRED", "Email is required to change password.", 400);
    }

    if (!targetUser) {
      return apiError("USER_NOT_FOUND", "No dealer account found with the specified email.", 404);
    }

    // Verify dealer role / membership
    const isDealer = targetUser.memberships?.some((m: any) => Boolean(m.dealerId));
    if (!isDealer) {
      return apiError(
        "NOT_DEALER_ACCOUNT",
        "This account is not associated with an authorized dealer portal.",
        403
      );
    }

    // Verify current password
    let isPasswordCorrect = false;
    if (targetUser.passwordHash) {
      isPasswordCorrect = await bcrypt.compare(currentPassword, targetUser.passwordHash);
    }

    // Allow dev fallbacks if in non-production
    if (!isPasswordCorrect && process.env.NODE_ENV !== "production") {
      const devPasswords = [
        process.env.SEED_PASSWORD,
        "ChangeMe-Bageshwari-2026!",
        "quantumSql@123",
      ].filter(Boolean) as string[];
      if (devPasswords.includes(currentPassword)) {
        isPasswordCorrect = true;
      }
    }

    if (!isPasswordCorrect) {
      return apiError(
        "INVALID_CURRENT_PASSWORD",
        "The current password you entered is incorrect.",
        400
      );
    }

    // Check if new password is identical to current password
    const isSamePassword = await bcrypt.compare(newPassword, targetUser.passwordHash || "");
    if (isSamePassword) {
      return apiError(
        "SAME_PASSWORD",
        "Your new password must be different from your current password.",
        400
      );
    }

    // Hash new password with 10 salt rounds
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update user record and unlock if locked
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash: newPasswordHash,
        loginAttempts: 0,
        status: targetUser.status === "LOCKED" ? "ACTIVE" : targetUser.status,
        lockedUntil: null,
      },
    });

    // Record in AuditLog if available
    try {
      await prisma.auditLog.create({
        data: {
          action: "DEALER_PASSWORD_CHANGE",
          entity: "User",
          entityId: targetUser.id,
          userId: targetUser.id,
          severity: "MEDIUM",
          metadata: JSON.stringify({
            email: targetUser.email,
            changedAt: new Date().toISOString(),
          }),
        },
      });
    } catch {
      // Non-critical audit log failure
    }

    return apiSuccess({
      message: "Password updated successfully. You can now use your new password.",
    });
  } catch (error) {
    console.error("Dealer change password error:", error);
    return apiError("INTERNAL_ERROR", "Failed to update password. Please try again.", 500);
  }
}
