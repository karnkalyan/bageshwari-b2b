import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { generateOrderPdf, convertPdfToJpeg, parsePaperSize } from "@/lib/pdf";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id, kind } = await params;
  if (kind !== "challan" && kind !== "package-labels") {
    return apiError("DOCUMENT_TYPE_INVALID", "Unsupported shipment document type.", 404);
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      id,
      sellerId: session.sellerId,
      ...(session.dealerId ? { order: { dealerId: session.dealerId } } : {}),
    },
    select: { id: true, orderId: true, shipmentNumber: true, challanNumber: true },
  });

  if (!shipment) {
    return apiError("SHIPMENT_NOT_FOUND", "Shipment not found.", 404);
  }

  const { searchParams } = new URL(request.url);
  const rawLayout = searchParams.get("layout");
  const layout = (rawLayout === "a4_4" || rawLayout === "a4_2" || rawLayout === "a4_1" || rawLayout === "thermal") ? rawLayout : "a4_4";
  const paperSize = parsePaperSize(searchParams.get("pageSize") || searchParams.get("paperSize") || searchParams.get("size"));

  const documentKind = kind === "challan" ? "dispatch-challan" : "package-labels";
  const bytes = await generateOrderPdf(shipment.orderId, session.sellerId, documentKind, { layout, paperSize });
  if (!bytes) {
    return apiError("DOCUMENT_UNAVAILABLE", "Document data is unavailable.", 404);
  }

  const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
  const disposition = isDownload ? "attachment" : "inline";

  const formatParam = searchParams.get("format")?.toLowerCase();
  const isJpeg = formatParam === "jpeg" || formatParam === "jpg";
  const ext = isJpeg ? "jpg" : "pdf";
  const baseName = kind === "challan" ? `${shipment.challanNumber || shipment.shipmentNumber}-challan` : `${shipment.shipmentNumber}-package-labels`;
  const filename = `${baseName}.${ext}`;

  let responseBytes = bytes;
  let contentType = "application/pdf";

  if (isJpeg) {
    try {
      responseBytes = await convertPdfToJpeg(bytes, { scale: 2, quality: 92 });
      contentType = "image/jpeg";
    } catch (e: any) {
      console.error("Failed to convert shipment PDF to JPEG:", e);
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
