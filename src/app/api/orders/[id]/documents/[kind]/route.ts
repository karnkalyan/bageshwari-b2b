import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { generateOrderPdf, convertPdfToJpeg, type OrderDocumentKind, parsePaperSize } from "@/lib/pdf";
import { prisma } from "@/lib/db";

const kinds = new Set<string>([
  "sales-order",
  "proforma",
  "pick-list",
  "final-invoice",
  "dispatch-challan",
  "shipping-label",
  "package-labels",
  "packing-list",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> }
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

  const { id, kind } = await params;
  let normalizedKind = kind;
  if (kind === "tax-invoice" || kind === "invoice") normalizedKind = "final-invoice";
  if (kind === "challan") normalizedKind = "dispatch-challan";
  if (kind === "carton-labels" || kind === "carton-label" || kind === "cartons") normalizedKind = "package-labels";
  if (kind === "packaging-list") normalizedKind = "packing-list";

  if (!kinds.has(normalizedKind)) {
    return apiError("DOCUMENT_TYPE_INVALID", "Unsupported document type.", 404);
  }

  const allowed = await prisma.order.findFirst({
    where: {
      sellerId,
      OR: [{ id }, { orderNumber: id }],
      ...(session.dealerId ? { dealerId: session.dealerId } : {}),
    },
    include: {
      payments: { where: { status: "CONFIRMED" } },
      creditApprovals: { where: { status: "APPROVED" } },
    },
  });

  if (!allowed) {
    return apiError("ORDER_NOT_FOUND", "Order not found.", 404);
  }

  const isWarehouseKind = [
    "pick-list",
    "packing-list",
    "dispatch-challan",
    "shipping-label",
    "package-labels",
  ].includes(kind);

  const isSentToWarehouse = [
    "READY_FOR_WAREHOUSE",
    "PICK_LIST_GENERATED",
    "PICKING_IN_PROGRESS",
    "PARTIALLY_PICKED",
    "PICKING_COMPLETED",
    "PICKING_EXCEPTION",
    "PICK_LIST_COMPLETED",
    "FINAL_INVOICE_ISSUED",
    "PAYMENT_PENDING",
    "PARTIALLY_PAID",
    "PAID",
    "CREDIT_PENDING",
    "CREDIT_APPROVED",
    "PAYMENT_ON_HOLD",
    "PAYMENT_OVERDUE",
    "PACKING_IN_PROGRESS",
    "PACKED",
    "PACKED_AND_LABELLED",
    "SHIPPED",
    "IN_TRANSIT",
    "PARTIALLY_DELIVERED",
    "DELIVERED",
    "COMPLETED",
  ].includes(allowed.status);

  if (normalizedKind === "sales-order" && !isSentToWarehouse) {
    return apiError(
      "ORDER_NOT_RELEASED_TO_WAREHOUSE",
      "Sales Order document is available only after the order is released to warehouse for fulfillment.",
      403
    );
  }

  const isPaymentConfirmed =
    allowed.payments.length > 0 ||
    allowed.creditApprovals.length > 0 ||
    [
      "PROFORMA_INVOICE_CONFIRMED",
      "READY_FOR_WAREHOUSE",
      "PICK_LIST_GENERATED",
      "PICKING_IN_PROGRESS",
      "PARTIALLY_PICKED",
      "PICKING_COMPLETED",
      "PICK_LIST_COMPLETED",
      "FINAL_INVOICE_ISSUED",
      "PACKING_IN_PROGRESS",
      "PACKED",
      "PACKED_AND_LABELLED",
      "SHIPPED",
      "IN_TRANSIT",
      "PARTIALLY_DELIVERED",
      "DELIVERED",
      "COMPLETED",
    ].includes(allowed.status);

  if (isWarehouseKind && !isPaymentConfirmed) {
    return apiError(
      "PAYMENT_CONFIRMATION_REQUIRED",
      "Warehouse documents (Pick List, Packaging List, Delivery Challan, Carton Labels) are available only after payment or dealer credit is confirmed.",
      403
    );
  }

  const { searchParams } = new URL(request.url);
  const rawLayout = searchParams.get("layout");
  const layout = (rawLayout === "a4_4" || rawLayout === "a4_2" || rawLayout === "a4_1" || rawLayout === "thermal") ? rawLayout : "a4_4";
  const paperSize = parsePaperSize(searchParams.get("pageSize") || searchParams.get("paperSize") || searchParams.get("size"));

  const bytes = await generateOrderPdf(allowed.id, sellerId, normalizedKind as OrderDocumentKind, { layout, paperSize });
  if (!bytes) {
    return apiError("DOCUMENT_UNAVAILABLE", "Document data is unavailable.", 404);
  }

  const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
  const disposition = isDownload ? "attachment" : "inline";

  const formatParam = searchParams.get("format")?.toLowerCase();
  const isJpeg = formatParam === "jpeg" || formatParam === "jpg";

  let responseBytes = bytes;
  let contentType = "application/pdf";
  let extension = "pdf";

  if (isJpeg) {
    try {
      responseBytes = await convertPdfToJpeg(bytes, { scale: 2, quality: 92 });
      contentType = "image/jpeg";
      extension = "jpg";
    } catch (e: any) {
      console.error("Failed to convert document PDF to JPEG:", e);
    }
  }

  return new Response(new Uint8Array(responseBytes).buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${allowed.orderNumber}-${normalizedKind}.${extension}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
