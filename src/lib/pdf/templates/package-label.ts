import { CompanyInfo, DealerInfo } from "../types";
import {
  COLORS,
  createPdfContext,
  drawText,
  drawRightText,
  drawCenteredText,
  drawBox,
  generateBarcodeImage,
  generateQrImage,
} from "../helpers";

export interface PackageLabelData {
  packageNumber: string;
  cartonIndex: number;
  totalCartons: number;
  orderNumber: string;
  shipmentNumber?: string | null;
  challanNumber?: string | null;
  weight: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  packageType?: string | null;
  handlingInstructions?: string | null;
  company: CompanyInfo;
  dealer: DealerInfo;
  transporterName?: string | null;
  trackingUrl?: string;
}

export async function renderPackageLabelPdf(data: PackageLabelData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold, oblique } = ctx;

  // 4 x 6 inches in PDF points (1 inch = 72 points)
  const PAGE_WIDTH = 288;
  const PAGE_HEIGHT = 432;
  const MARGIN = 14;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Outer Border
  drawBox(page, MARGIN, MARGIN, CONTENT_WIDTH, PAGE_HEIGHT - MARGIN * 2, {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  });

  // 1. TOP SENDER BANNER
  drawBox(page, MARGIN, y - 36, CONTENT_WIDTH, 36, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "FROM:", MARGIN + 8, y - 12, { size: 6.5, font: bold, color: COLORS.white });
  drawText(page, data.company.legalName || "BAGESHWARI TRACTORS PVT. LTD.", MARGIN + 8, y - 22, {
    size: 9,
    font: bold,
    color: COLORS.white,
  });
  drawText(page, `${data.company.city || "Nepalgunj"}, ${data.company.district || "Banke"}, Nepal | Ph: ${data.company.phone || "+977-81-520123"}`, MARGIN + 8, y - 31, {
    size: 6.5,
    font: regular,
    color: COLORS.white,
  });

  y -= 42;

  // 2. SHIP TO (CONSIGNEE) SECTION (High Prominence)
  const shipToHeight = 90;
  drawBox(page, MARGIN + 4, y - shipToHeight, CONTENT_WIDTH - 8, shipToHeight, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 1,
  });

  drawText(page, "SHIP TO (CONSIGNEE):", MARGIN + 10, y - 12, { size: 7, font: bold, color: COLORS.danger });
  drawText(page, data.dealer.tradingName || data.dealer.legalName, MARGIN + 10, y - 26, {
    size: 11,
    font: bold,
    color: COLORS.primary,
    maxWidth: CONTENT_WIDTH - 28,
  });

  drawText(page, `Address: ${data.dealer.addressLine1 || ""}, ${data.dealer.city || ""}, ${data.dealer.district || ""}`, MARGIN + 10, y - 40, {
    size: 8,
    font: bold,
    color: COLORS.black,
    maxWidth: CONTENT_WIDTH - 28,
  });

  drawText(page, `Contact Person: ${data.dealer.contactName || "Authorized Dealer"}`, MARGIN + 10, y - 54, {
    size: 8,
    font: regular,
    color: COLORS.secondary,
  });

  drawText(page, `Phone: ${data.dealer.phone || "N/A"}`, MARGIN + 10, y - 68, {
    size: 9,
    font: bold,
    color: COLORS.primary,
  });

  drawText(page, `Dealer Code: ${data.dealer.code}`, MARGIN + 10, y - 82, {
    size: 7,
    font: regular,
    color: COLORS.muted,
  });

  y -= shipToHeight + 6;

  // 3. CARTON & PACKAGE STATS (Box 1 of N, Weight, Dim)
  const statsHeight = 44;
  drawBox(page, MARGIN + 4, y - statsHeight, CONTENT_WIDTH - 8, statsHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  // Box X of Y
  drawText(page, "PACKAGE NUMBER:", MARGIN + 10, y - 12, { size: 6.5, font: bold, color: COLORS.muted });
  drawText(page, data.packageNumber, MARGIN + 10, y - 24, { size: 10, font: bold, color: COLORS.primary });
  drawText(page, `Box ${data.cartonIndex || 1} of ${data.totalCartons || 1}`, MARGIN + 10, y - 36, { size: 8.5, font: bold, color: COLORS.danger });

  // Weight & Dims
  const midX = MARGIN + CONTENT_WIDTH / 2 + 10;
  drawText(page, "GROSS WEIGHT:", midX, y - 12, { size: 6.5, font: bold, color: COLORS.muted });
  drawText(page, `${Number(data.weight).toFixed(2)} KG`, midX, y - 24, { size: 10, font: bold, color: COLORS.primary });
  const dimStr = data.length && data.width && data.height ? `${data.length}x${data.width}x${data.height} CM` : (data.packageType || "Standard Carton");
  drawText(page, `Dims: ${dimStr}`, midX, y - 36, { size: 7.5, font: regular, color: COLORS.secondary });

  y -= statsHeight + 8;

  // 4. BIG LOGISTICS BARCODE & QR CODE
  const barcodeHeight = 85;
  drawBox(page, MARGIN + 4, y - barcodeHeight, CONTENT_WIDTH - 8, barcodeHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  // Barcode
  const barcodeImg = await generateBarcodeImage(pdf, data.packageNumber, { height: 14, scale: 2.2 });
  if (barcodeImg) {
    page.drawImage(barcodeImg, {
      x: MARGIN + 12,
      y: y - 55,
      width: 175,
      height: 40,
    });
  }
  drawCenteredText(page, data.packageNumber, MARGIN + 95, y - 68, bold, { size: 8, color: COLORS.primary });

  // QR Code on right
  const qrImg = await generateQrImage(pdf, data.trackingUrl || `PKG:${data.packageNumber}|ORD:${data.orderNumber}`, 60);
  if (qrImg) {
    page.drawImage(qrImg, {
      x: MARGIN + CONTENT_WIDTH - 72,
      y: y - 72,
      width: 60,
      height: 60,
    });
  }

  y -= barcodeHeight + 6;

  // 5. SHIPMENT & ORDER REFERENCES
  drawBox(page, MARGIN + 4, y - 38, CONTENT_WIDTH - 8, 38, {
    color: COLORS.bgLight,
    borderColor: COLORS.borderLight,
    borderWidth: 0.5,
  });

  drawText(page, `Order #: ${data.orderNumber}`, MARGIN + 10, y - 12, { size: 7.5, font: bold, color: COLORS.primary });
  drawText(page, `Challan #: ${data.challanNumber || "Pending"}`, MARGIN + 10, y - 24, { size: 7.5, font: bold, color: COLORS.primary });
  drawText(page, `Carrier: ${data.transporterName || "Direct Transport / Courier"}`, MARGIN + 10, y - 34, { size: 7, font: regular, color: COLORS.secondary });

  y -= 44;

  // 6. HANDLING ICONS / WARNING BADGES (Bottom)
  const warnHeight = 32;
  drawBox(page, MARGIN + 4, y - warnHeight, CONTENT_WIDTH - 8, warnHeight, {
    color: COLORS.white,
    borderColor: COLORS.danger,
    borderWidth: 1,
  });

  const instructions = data.handlingInstructions || "FRAGILE - HANDLE WITH CARE | THIS SIDE UP ^ | KEEP DRY";
  drawCenteredText(page, "WARNING / HANDLING INSTRUCTIONS:", MARGIN + CONTENT_WIDTH / 2, y - 12, bold, {
    size: 7,
    color: COLORS.danger,
  });
  drawCenteredText(page, instructions.toUpperCase(), MARGIN + CONTENT_WIDTH / 2, y - 24, bold, {
    size: 7.5,
    color: COLORS.danger,
  });

  return pdf.save();
}
