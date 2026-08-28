import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { checkRateLimit, getClientAddress } from "@/lib/security/request-guard";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const clientAddress = getClientAddress(request);
  const rateLimit = checkRateLimit(`upload_doc:${clientAddress}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many upload attempts. Please wait before uploading more files." },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as string) || "OTHER";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided for upload." }, { status: 422 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file format (${file.type}). Supported formats are PDF, PNG, JPG, and WebP.`,
        },
        { status: 422 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Document file size exceeds 10MB limit." }, { status: 422 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalExt = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".png");
    const safeExt = originalExt.toLowerCase().replace(/[^a-z0-9.]/g, "");
    const randomHash = crypto.randomBytes(8).toString("hex");
    const timestamp = Date.now();
    const cleanDocType = documentType.toLowerCase().replace(/[^a-z0-9]/g, "");
    const fileName = `doc_${cleanDocType}_${timestamp}_${randomHash}${safeExt}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "dealers");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/dealers/${fileName}`;

    // Get default seller
    const seller = await prisma.seller.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    let fileAssetId: string | null = null;
    if (seller) {
      const fileAsset = await prisma.fileAsset.create({
        data: {
          sellerId: seller.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          storageKey: `uploads/dealers/${fileName}`,
          url: publicUrl,
          visibility: "PRIVATE",
        },
      });
      fileAssetId = fileAsset.id;
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileAssetId,
      mimeType: file.type,
      documentType,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Dealership document upload error:", err);
    return NextResponse.json({ error: "Failed to upload document." }, { status: 500 });
  }
}
