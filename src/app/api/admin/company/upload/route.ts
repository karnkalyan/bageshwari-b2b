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

    const publicUploadDir = path.join(process.cwd(), "public", "uploads", "company");
    const fallbackUploadDir = path.join(process.cwd(), "uploads", "company");
    await Promise.all([
      mkdir(publicUploadDir, { recursive: true }).catch(() => {}),
      mkdir(fallbackUploadDir, { recursive: true }).catch(() => {}),
    ]);

    const publicFilePath = path.join(publicUploadDir, fileName);
    const fallbackFilePath = path.join(fallbackUploadDir, fileName);
    await Promise.all([
      writeFile(publicFilePath, buffer),
      writeFile(fallbackFilePath, buffer).catch(() => {}),
    ]);

    const publicUrl = `/uploads/company/${fileName}`;

    let updatedMerchantQrs: any[] | null = null;
    let newQrItem: any = null;

    if (cleanAssetType.includes("qr")) {
      try {
        const { prisma } = await import("@/lib/db");
        let sellerId = session.sellerId;
        if (!sellerId) {
          const activeSeller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } }).catch(() => null);
          sellerId = activeSeller?.id;
        }

        const existingProfile = await prisma.companyProfile.findFirst({
          where: {
            OR: [
              ...(sellerId ? [{ sellerId }] : []),
              { id: "bageshwari-tractors" },
            ],
          },
        }).catch(() => null);

        let meta: any = {};
        if (existingProfile?.socialLinksJson) {
          try {
            meta = JSON.parse(existingProfile.socialLinksJson);
          } catch {}
        }

        newQrItem = {
          id: `qr_${timestamp}_${randomHash.slice(0, 4)}`,
          title: (formData.get("title") as string)?.trim() || `Merchant QR #${(Array.isArray(meta.merchantQrs) ? meta.merchantQrs.length : 0) + 1}`,
          qrUrl: publicUrl,
          accountName: (formData.get("accountName") as string)?.trim() || existingProfile?.companyName || "Bageshwari Tractors",
          accountNumber: (formData.get("accountNumber") as string)?.trim() || meta.upiId || "",
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        const currentQrs = Array.isArray(meta.merchantQrs) ? meta.merchantQrs : [];
        updatedMerchantQrs = [...currentQrs, newQrItem];
        meta.merchantQrs = updatedMerchantQrs;
        meta.merchantQrUrl = publicUrl;

        if (existingProfile) {
          await prisma.companyProfile.update({
            where: { id: existingProfile.id },
            data: {
              socialLinksJson: JSON.stringify(meta),
            },
          });
        } else if (sellerId) {
          await prisma.companyProfile.create({
            data: {
              id: "bageshwari-tractors",
              sellerId,
              companyName: "Bageshwari Tractors",
              tradingName: "Bageshwari Tractors",
              socialLinksJson: JSON.stringify(meta),
            },
          });
        }
      } catch (dbErr) {
        console.warn("Failed to auto-persist uploaded QR to company profile:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      newQrItem,
      merchantQrs: updatedMerchantQrs,
    });
  } catch (err: any) {
    console.error("Company asset upload error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during upload." },
      { status: 500 }
    );
  }
}
