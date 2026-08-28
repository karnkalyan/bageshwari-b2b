import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { generateProductBarcodeLabelPdf } from "@/lib/pdf";
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
  const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
  const disposition = isDownload ? "attachment" : "inline";

  const bytes = await generateProductBarcodeLabelPdf(product.id, sellerId, count);
  if (!bytes) {
    return apiError("DOCUMENT_UNAVAILABLE", "Barcode data is unavailable.", 404);
  }

  return new Response(new Uint8Array(bytes).buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${product.sku}-barcode.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
