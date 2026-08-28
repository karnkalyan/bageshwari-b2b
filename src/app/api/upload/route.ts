import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  // 1. RBAC Authentication Check
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required to upload assets.", 401);
  }

  const userRoles = session.roles || [];
  const userPermissions = session.permissions || [];
  const isAuthorized =
    userRoles.some((role) =>
      ["SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF", "ACCOUNTANT", "WAREHOUSE_MANAGER"].includes(role)
    ) || userPermissions.some((perm) =>
      ["product.manage", "order.revise", "order.review"].includes(perm)
    );

  if (!isAuthorized) {
    return apiError("FORBIDDEN", "You do not have permission to upload product assets.", 403);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string") {
      return apiError("NO_FILE_PROVIDED", "Please select a file to upload.", 422);
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return apiError(
        "INVALID_FILE_TYPE",
        `Invalid file format (${file.type}). Allowed types: JPG, PNG, WebP, AVIF, GIF, SVG.`,
        422
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError("FILE_TOO_LARGE", "File size exceeds the 10MB limit.", 422);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate safe filename
    const originalExt = path.extname(file.name) || `.${file.type.split("/")[1] || "png"}`;
    const safeExt = originalExt.toLowerCase().replace(/[^a-z0-9.]/g, "");
    const randomHash = crypto.randomBytes(8).toString("hex");
    const timestamp = Date.now();
    const fileName = `prod_${timestamp}_${randomHash}${safeExt}`;

    // Target upload folder in public directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/products/${fileName}`;

    // 2. Persist FileAsset record in database
    const fileAsset = await prisma.fileAsset.create({
      data: {
        sellerId: session.sellerId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageKey: `uploads/products/${fileName}`,
        url: publicUrl,
        visibility: "PUBLIC",
        uploadedById: session.user.id,
      },
    });

    return apiSuccess({
      url: publicUrl,
      fileAssetId: fileAsset.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "File upload failed.";
    return apiError("UPLOAD_FAILED", message, 500);
  }
}
