import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { generateProductBarcodeLabelPdf, convertPdfToJpeg, parsePaperSize } from "@/lib/pdf";
import { prisma } from "@/lib/db";

export async function GET(
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
    return apiError("SELLER_NOT_FOUND", "No active seller found.", 404);
  }

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: {
      sellerId,
      OR: [{ id }, { sku: id }],
    },
    select: { id: true, sku: true },
  });

  if (!product) {
    return apiError("PRODUCT_NOT_FOUND", "Product not found.", 404);
  }

  const { searchParams } = new URL(request.url);
  const count = parseInt(searchParams.get("count") || "1", 10);
  const rawSize = searchParams.get("size")?.toLowerCase();
  const rawPaper = searchParams.get("pageSize") || searchParams.get("paperSize");
  const paperSize = parsePaperSize(rawPaper || (rawSize === "a4_sheet" ? "A4" : rawSize === "a5_sheet" ? "A5" : undefined));

  let stickerSize: "32x20" | "standard" | "a4_sheet" | "a5_sheet" = "32x20";
  if (rawSize === "standard") stickerSize = "standard";
  else if (rawSize === "a4_sheet" || (rawPaper && parsePaperSize(rawPaper) === "A4" && rawSize !== "standard" && rawSize !== "32x20")) stickerSize = "a4_sheet";
  else if (rawSize === "a5_sheet" || (rawPaper && parsePaperSize(rawPaper) === "A5" && rawSize !== "standard" && rawSize !== "32x20")) stickerSize = "a5_sheet";

  const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
  const disposition = isDownload ? "attachment" : "inline";

  const bytes = await generateProductBarcodeLabelPdf(product.id, sellerId, count, stickerSize, paperSize);
  if (!bytes) {
    return apiError("DOCUMENT_UNAVAILABLE", "Barcode data is unavailable.", 404);
  }

  const formatParam = searchParams.get("format")?.toLowerCase();
  const isJpeg = formatParam === "jpeg" || formatParam === "jpg";
  const ext = isJpeg ? "jpg" : "pdf";
  const filename = `${product.sku}-barcode.${ext}`;

  let responseBytes = bytes;
  let contentType = "application/pdf";

  if (isJpeg) {
    try {
      responseBytes = await convertPdfToJpeg(bytes, { scale: 3, quality: 95 });
      contentType = "image/jpeg";
    } catch (e: any) {
      console.error("Failed to convert product barcode PDF to JPEG:", e);
    }
  }

  return new Response(new Uint8Array(responseBytes).buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
