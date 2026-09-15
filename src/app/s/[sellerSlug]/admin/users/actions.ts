"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updatePasswordAction(formData: FormData, sellerSlug: string) {
  const userId = String(formData.get("userId") || "");
  const password = String(formData.get("password") || "");

  if (!userId || !password) return;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  } catch (err) {
    console.error("Update password error:", err);
  }

  revalidatePath(`/s/${sellerSlug}/admin/users`);
}

export async function updateRolesAction(formData: FormData, sellerSlug: string) {
  const userId = String(formData.get("userId") || "");
  const sellerId = String(formData.get("sellerId") || "");
  const roles = formData.getAll("roles") as string[];

  if (!userId || !sellerId) return;

  try {
    await prisma.$transaction(async (tx) => {
      // Delete existing roles for this user and seller
      await tx.userRole.deleteMany({
        where: { userId, sellerId },
      });

      // Insert new roles
      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((roleId) => ({
            userId,
            roleId,
            sellerId,
          })),
        });
      }
    });
  } catch (err) {
    console.error("Update roles error:", err);
  }

      revalidatePath(`/s/${sellerSlug}/admin/users`);
}

export async function updateUserAction(formData: FormData, sellerSlug: string): Promise<{ success: boolean; error?: string }> {
  const userId = String(formData.get("userId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const status = String(formData.get("status") || "ACTIVE") as any;

  if (!userId) {
    return { success: false, error: "User ID is required" };
  }

  if (!name) {
    return { success: false, error: "Name is required" };
  }

  if (!email) {
    return { success: false, error: "Valid email is required" };
  }

  try {
    // Check if another user has this email
    const existing = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
    });

    if (existing) {
      return { success: false, error: "This email is already in use by another account." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone: phone || null,
        status: status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
      },
    });

    revalidatePath(`/s/${sellerSlug}/admin/users`);
    return { success: true };
  } catch (err: any) {
    console.error("Update user error:", err);
    return { success: false, error: err?.message || "Failed to update user profile" };
  }
}
