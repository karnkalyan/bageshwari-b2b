import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { generateOrderPdf, type OrderDocumentKind } from "@/lib/pdf";
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
  if (!kinds.has(kind)) {
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

  const bytes = await generateOrderPdf(allowed.id, sellerId, kind as OrderDocumentKind);
  if (!bytes) {
    return apiError("DOCUMENT_UNAVAILABLE", "Document data is unavailable.", 404);
  }

  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
  const disposition = isDownload ? "attachment" : "inline";

  return new Response(new Uint8Array(bytes).buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${allowed.orderNumber}-${kind}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
