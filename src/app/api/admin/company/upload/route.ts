import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assetType = (formData.get("assetType") as string) || "merchant_qr";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided for upload." }, { status: 422 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid image format (${file.type}). Supported formats are PNG, JPG, WebP, and SVG.`,
        },
        { status: 422 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image file size exceeds 10MB limit." }, { status: 422 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalExt = path.extname(file.name) || (file.type.includes("png") ? ".png" : ".jpg");
    const safeExt = originalExt.toLowerCase().replace(/[^a-z0-9.]/g, "");
    const randomHash = crypto.randomBytes(8).toString("hex");
    const timestamp = Date.now();
    const cleanAssetType = assetType.toLowerCase().replace(/[^a-z0-9]/g, "");
    const fileName = `${cleanAssetType}_${timestamp}_${randomHash}${safeExt}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "company");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/company/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    });
  } catch (err: any) {
    console.error("Company asset upload error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during upload." },
      { status: 500 }
    );
  }
}
