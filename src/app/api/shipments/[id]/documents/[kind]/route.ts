import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { generateOrderPdf } from "@/lib/pdf";
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

  const documentKind = kind === "challan" ? "dispatch-challan" : "package-labels";
  const bytes = await generateOrderPdf(shipment.orderId, session.sellerId, documentKind);
  if (!bytes) {
    return apiError("DOCUMENT_UNAVAILABLE", "Document data is unavailable.", 404);
  }

  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
  const disposition = isDownload ? "attachment" : "inline";
  const filename = kind === "challan" ? `${shipment.challanNumber || shipment.shipmentNumber}-challan.pdf` : `${shipment.shipmentNumber}-package-labels.pdf`;

  return new Response(new Uint8Array(bytes).buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
