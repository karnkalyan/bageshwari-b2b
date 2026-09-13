import { CompanyInfo, DealerInfo } from "../types";
import {
  COLORS,
  createPdfContext,
  drawText,
  drawRightText,
  drawCenteredText,
  drawBox,
  drawLine,
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
  const { pdf, regular, bold } = ctx;

  // 4 x 6 inches in PDF points (1 inch = 72 points)
  const PAGE_WIDTH = 288;
  const PAGE_HEIGHT = 432;
  const MARGIN = 12;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Outer Border (Clean solid/dashed line)
  drawBox(page, MARGIN, MARGIN, CONTENT_WIDTH, PAGE_HEIGHT - MARGIN * 2, {
    borderColor: COLORS.black,
    borderWidth: 1.5,
    color: COLORS.white,
  });

  // ==========================================
  // 1. TOP SECTION: SENDER "FROM" (Small) & QR CODE
  // ==========================================
  const fromY = PAGE_HEIGHT - MARGIN - 14;
  drawText(page, "FROM:", MARGIN + 8, fromY, { size: 7.5, font: bold, color: COLORS.black });
  
  const companyName = (data.company.legalName || data.company.tradingName || "Bageshwari Tractors Pvt. Ltd.").toUpperCase();
  drawText(page, companyName, MARGIN + 8, fromY - 11, {
    size: 8.5,
    font: bold,
    color: COLORS.black,
    maxWidth: CONTENT_WIDTH - 80,
  });

  const city = data.company.city || "Nepalgunj";
  const district = data.company.district || "Banke";
  const phone = data.company.phone || "+977-81-520123";
  drawText(page, `${city}, ${district}, Nepal | Ph: ${phone}`, MARGIN + 8, fromY - 22, {
    size: 7,
    font: regular,
    color: COLORS.black,
    maxWidth: CONTENT_WIDTH - 80,
  });

  // QR Code on the top right
  const qrImg = await generateQrImage(pdf, data.trackingUrl || `PKG:${data.packageNumber}|ORD:${data.orderNumber}|TO:${data.dealer.code}`, 56);
  if (qrImg) {
    page.drawImage(qrImg, {
      x: MARGIN + CONTENT_WIDTH - 64,
      y: PAGE_HEIGHT - MARGIN - 64,
      width: 56,
      height: 56,
    });
  }

  // Divider Line 1
  const div1Y = PAGE_HEIGHT - MARGIN - 70;
  drawLine(page, MARGIN, div1Y, MARGIN + CONTENT_WIDTH, div1Y, { color: COLORS.black, thickness: 1.5 });

  // ==========================================
  // 2. SHIP TO (CONSIGNEE) SECTION (BIG & PROMINENT)
  // ==========================================
  const shipToY = div1Y - 12;
  drawText(page, "SHIP TO (CONSIGNEE):", MARGIN + 8, shipToY, { size: 8.5, font: bold, color: COLORS.black });

  // HUGE Dealer Name
  const consigneeName = data.dealer.tradingName || data.dealer.legalName;
  drawText(page, consigneeName, MARGIN + 8, shipToY - 22, {
    size: 16,
    font: bold,
    color: COLORS.black,
    maxWidth: CONTENT_WIDTH - 16,
  });

  // Consignee Address & Contact
  const dealerAddr = [data.dealer.addressLine1, data.dealer.city, data.dealer.district].filter(Boolean).join(", ") || "Nepalgunj, Banke";
  drawText(page, `Address: ${dealerAddr}`, MARGIN + 8, shipToY - 38, {
    size: 8,
    font: bold,
    color: COLORS.black,
    maxWidth: CONTENT_WIDTH - 120,
  });

  drawRightText(page, `Phone: ${data.dealer.phone || "N/A"}`, MARGIN + CONTENT_WIDTH - 8, shipToY - 38, bold, {
    size: 8,
    color: COLORS.black,
  });

  drawText(page, `Contact Person: ${data.dealer.contactName || "Authorized Dealer"}`, MARGIN + 8, shipToY - 51, {
    size: 8,
    font: regular,
    color: COLORS.black,
    maxWidth: CONTENT_WIDTH - 120,
  });

  drawRightText(page, `Dealer Code: ${data.dealer.code}`, MARGIN + CONTENT_WIDTH - 8, shipToY - 51, regular, {
    size: 8,
    color: COLORS.black,
  });

  // Divider Line 2
  const div2Y = div1Y - 76;
  drawLine(page, MARGIN, div2Y, MARGIN + CONTENT_WIDTH, div2Y, { color: COLORS.black, thickness: 1.5 });

  // ==========================================
  // 3. 2-COLUMN GRID: PACKAGE DETAILS | ORDER DETAILS
  // ==========================================
  const gridMidX = MARGIN + Math.floor(CONTENT_WIDTH / 2);
  const gridY = div2Y - 12;

  // Left Column: Package Details
  drawText(page, "PACKAGE NUMBER:", MARGIN + 8, gridY, { size: 7.5, font: bold, color: COLORS.black });
  drawText(page, data.packageNumber, MARGIN + 8, gridY - 14, { size: 13, font: bold, color: COLORS.black });
  drawText(page, `Box ${data.cartonIndex || 1} of ${data.totalCartons || 1}`, MARGIN + 8, gridY - 26, { size: 8, font: regular, color: COLORS.black });
  drawText(page, `GROSS WEIGHT: ${Number(data.weight).toFixed(2)} KG`, MARGIN + 8, gridY - 38, { size: 8, font: bold, color: COLORS.black });
  const dimStr = data.length && data.width && data.height ? `${data.length}x${data.width}x${data.height} CM` : (data.packageType || "Standard Carton");
  drawText(page, `Dims: ${dimStr}`, MARGIN + 8, gridY - 49, { size: 7.5, font: regular, color: COLORS.black });

  // Vertical Separator
  drawLine(page, gridMidX, div2Y, gridMidX, div2Y - 72, { color: COLORS.black, thickness: 1.5 });

  // Right Column: Order Details
  drawText(page, "ORDER #:", gridMidX + 8, gridY, { size: 7.5, font: bold, color: COLORS.black });
  drawText(page, data.orderNumber, gridMidX + 8, gridY - 14, { size: 13, font: bold, color: COLORS.black });
  drawText(page, `Challan #: ${data.challanNumber || "Pending"}`, gridMidX + 8, gridY - 26, { size: 8.5, font: bold, color: COLORS.black });
  drawText(page, "Carrier:", gridMidX + 8, gridY - 38, { size: 8, font: regular, color: COLORS.black });
  drawText(page, data.transporterName || "Direct Transport / Courier", gridMidX + 8, gridY - 49, {
    size: 7.5,
    font: regular,
    color: COLORS.black,
    maxWidth: Math.floor(CONTENT_WIDTH / 2) - 16,
  });

  // Divider Line 3
  const div3Y = div2Y - 72;
  drawLine(page, MARGIN, div3Y, MARGIN + CONTENT_WIDTH, div3Y, { color: COLORS.black, thickness: 1.5 });

  // ==========================================
  // 4. FULL-WIDTH LOGISTICS BARCODE & TEXT
  // ==========================================
  const barcodeY = div3Y - 58;
  const barcodeImg = await generateBarcodeImage(pdf, data.packageNumber, { height: 16, scale: 2.5 });
  if (barcodeImg) {
    page.drawImage(barcodeImg, {
      x: MARGIN + (CONTENT_WIDTH - 210) / 2,
      y: barcodeY,
      width: 210,
      height: 46,
    });
  }
  drawCenteredText(page, data.packageNumber, MARGIN + CONTENT_WIDTH / 2, barcodeY - 12, bold, {
    size: 11,
    color: COLORS.black,
  });

  // ==========================================
  // 5. BOTTOM SOLID BLACK HANDLING INSTRUCTIONS BANNER
  // ==========================================
  const bannerHeight = 36;
  drawBox(page, MARGIN, MARGIN, CONTENT_WIDTH, bannerHeight, {
    color: COLORS.black,
    borderColor: COLORS.black,
    borderWidth: 1,
  });

  drawCenteredText(page, "WARNING / HANDLING INSTRUCTIONS", MARGIN + CONTENT_WIDTH / 2, MARGIN + bannerHeight - 13, bold, {
    size: 8,
    color: COLORS.white,
  });

  const instructions = (data.handlingInstructions || "FRAGILE - HANDLE WITH CARE | THIS SIDE UP ^ | KEEP DRY").toUpperCase();
  drawCenteredText(page, instructions, MARGIN + CONTENT_WIDTH / 2, MARGIN + bannerHeight - 25, bold, {
    size: 7,
    color: COLORS.white,
  });

  return pdf.save();
}
