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
