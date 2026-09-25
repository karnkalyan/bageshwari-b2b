import { CompanyInfo, DealerInfo, LineItemDto } from "../types";
import {
  COLORS,
  PaperSize,
  getPageDimensions,
  createPdfContext,
  drawText,
  drawRightText,
  drawCenteredText,
  drawBox,
  formatNpr,
  formatFullAddress,
  generateBarcodeImage,
  generateQrImage,
} from "../helpers";
import { numberToWordsNpr } from "../nepali-number-words";

export interface SalesOrderData {
  orderNumber: string;
  orderDate: Date | string;
  source: string;
  status: string;
  company: CompanyInfo;
  dealer: DealerInfo;
  items: LineItemDto[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  freightTotal: number;
  grandTotal: number;
  dealerNotes?: string | null;
  accountsNotes?: string | null;
  verificationUrl?: string;
  paperSize?: PaperSize;
}

export async function renderSalesOrderPdf(data: SalesOrderData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold } = ctx;

  const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = getPageDimensions(data.paperSize);
  const isA5 = data.paperSize === "A5";
  const MARGIN = isA5 ? 20 : 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Header
  const bannerH = isA5 ? 52 : 60;
  drawBox(page, MARGIN, y - bannerH, CONTENT_WIDTH, bannerH, {
    color: COLORS.bgLight,
    borderColor: COLORS.primary,
    borderWidth: 1,
  });

  drawText(page, data.company.legalName || "BAGESHWARI TRACTORS", MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 14 : 18), {
    size: isA5 ? 10.5 : 13,
    font: bold,
    color: COLORS.primary,
  });
  const companyAddress = formatFullAddress(
    data.company.address,
    data.company.city,
    data.company.district,
    "Nepal"
  );
  drawText(page, `${companyAddress} | Ph: ${data.company.phone || "+977-81-520123"}`, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 25 : 32), {
    size: isA5 ? 6.8 : 8,
    font: regular,
    color: COLORS.secondary,
    maxWidth: isA5 ? CONTENT_WIDTH * 0.55 : undefined,
  });
  drawText(page, `B2B Order Confirmation | PAN: ${data.company.panNumber || data.company.vatNumber || "302918239"}`, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 36 : 44), {
    size: isA5 ? 6.8 : 8,
    font: bold,
    color: COLORS.primary,
  });

  drawRightText(page, "SALES ORDER", MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 14 : 18), bold, {
    size: isA5 ? 11 : 14,
    color: COLORS.primary,
  });
  const cleanOrderNo = (data.orderNumber || "").replace(/--+/g, "-");
  drawRightText(page, `Order #: ${cleanOrderNo}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 26 : 32), bold, {
    size: isA5 ? 7.5 : 9,
    color: COLORS.primary,
  });
  drawRightText(page, `Date: ${new Date(data.orderDate).toISOString().slice(0, 10)}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 36 : 44), regular, {
    size: isA5 ? 6.8 : 8,
    color: COLORS.secondary,
  });

  y -= bannerH + (isA5 ? 8 : 10);

  // Buyer Info
  const infoHeight = isA5 ? 58 : 65;
  drawBox(page, MARGIN, y - infoHeight, CONTENT_WIDTH, infoHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, "ORDER PLACED BY DEALER:", MARGIN + 8, y - 13, { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, data.dealer.tradingName || data.dealer.legalName, MARGIN + 8, y - 24, { size: isA5 ? 8.5 : 9.5, font: bold, color: COLORS.primary });
  drawText(page, `Dealer Code: ${data.dealer.code} | Contact: ${data.dealer.contactName || "N/A"} (${data.dealer.phone || "N/A"})`, MARGIN + 8, y - 35, { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary });
  drawText(page, `Location: ${data.dealer.city || "Nepalgunj"}, ${data.dealer.district || "Banke"} | Status: ${data.status}`, MARGIN + 8, y - 46, { size: isA5 ? 6.8 : 8, font: bold, color: COLORS.primary });

  y -= infoHeight + (isA5 ? 8 : 10);

  // Items Table
  const colX = {
    sn: MARGIN,
    sku: MARGIN + (isA5 ? 18 : 24),
    desc: MARGIN + (isA5 ? 68 : 95),
    qty: MARGIN + CONTENT_WIDTH - (isA5 ? 175 : 220),
    rate: MARGIN + CONTENT_WIDTH - (isA5 ? 115 : 150),
    total: MARGIN + CONTENT_WIDTH,
  };

  const headerHeight = 18;
  drawBox(page, MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "S.N.", colX.sn + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawText(page, "SKU", colX.sku + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawText(page, "Product & Specification", colX.desc + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawRightText(page, "Qty", colX.rate - 6, y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });
  drawRightText(page, "Price (NPR)", colX.total - (isA5 ? 60 : 70), y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });
  drawRightText(page, "Total (NPR)", colX.total - 6, y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });

  y -= headerHeight;

  const rowHeight = isA5 ? 17 : 18;
  let rowIndex = 0;
  for (const item of data.items) {
    if (y < (isA5 ? 140 : 160)) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN - 20;
    }

    const rowBg = rowIndex % 2 === 1 ? COLORS.bgLight : COLORS.white;
    drawBox(page, MARGIN, y - rowHeight, CONTENT_WIDTH, rowHeight, {
      color: rowBg,
      borderColor: COLORS.borderLight,
      borderWidth: 0.5,
    });

    drawText(page, String(item.sn || rowIndex + 1), colX.sn + 3, y - (isA5 ? 11 : 12), { size: isA5 ? 6.5 : 7.5, font: regular, color: COLORS.secondary });
    drawText(page, item.sku.slice(0, 14), colX.sku + 3, y - (isA5 ? 11 : 12), { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.primary, maxWidth: isA5 ? 46 : 68 });
    drawText(page, item.description.slice(0, 48), colX.desc + 3, y - (isA5 ? 11 : 12), { size: isA5 ? 6.8 : 7.5, font: regular, color: COLORS.black, maxWidth: isA5 ? 110 : 210 });
    drawRightText(page, `${item.quantity} ${item.unit || "PCS"}`, colX.rate - 6, y - (isA5 ? 11 : 12), regular, { size: isA5 ? 6.8 : 7.5, color: COLORS.secondary });
    drawRightText(page, item.unitPrice.toFixed(2), colX.total - (isA5 ? 60 : 70), y - (isA5 ? 11 : 12), regular, { size: isA5 ? 6.8 : 7.5, color: COLORS.secondary });
    drawRightText(page, item.lineTotal.toFixed(2), colX.total - 6, y - (isA5 ? 11 : 12), bold, { size: isA5 ? 6.8 : 7.5, color: COLORS.primary });

    y -= rowHeight;
    rowIndex++;
  }

  y -= 8;

  // Summary
  const summaryBoxWidth = isA5 ? 180 : 220;
  const summaryBoxHeight = isA5 ? 64 : 70;
  const summaryX = MARGIN + CONTENT_WIDTH - summaryBoxWidth;

  drawBox(page, summaryX, y - summaryBoxHeight, summaryBoxWidth, summaryBoxHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, "Order Subtotal:", summaryX + 8, y - 14, { size: isA5 ? 7.2 : 8, font: regular, color: COLORS.secondary });
  drawRightText(page, formatNpr(data.subtotal), summaryX + summaryBoxWidth - 8, y - 14, regular, { size: isA5 ? 7.2 : 8, color: COLORS.secondary });

  drawText(page, "13% VAT Tax:", summaryX + 8, y - 28, { size: isA5 ? 7.2 : 8, font: regular, color: COLORS.secondary });
  drawRightText(page, formatNpr(data.taxTotal), summaryX + summaryBoxWidth - 8, y - 28, regular, { size: isA5 ? 7.2 : 8, color: COLORS.secondary });

  page.drawLine({ start: { x: summaryX, y: y - (isA5 ? 33 : 36) }, end: { x: summaryX + summaryBoxWidth, y: y - (isA5 ? 33 : 36) }, color: COLORS.primary, thickness: 1 });

  drawText(page, "GRAND TOTAL (NPR):", summaryX + 8, y - (isA5 ? 46 : 50), { size: isA5 ? 7.8 : 9, font: bold, color: COLORS.primary });
  drawRightText(page, formatNpr(data.grandTotal), summaryX + summaryBoxWidth - 8, y - (isA5 ? 46 : 50), bold, { size: isA5 ? 8.8 : 10, color: COLORS.primary });

  // Words (Left)
  const leftBoxWidth = CONTENT_WIDTH - summaryBoxWidth - (isA5 ? 8 : 10);
  drawBox(page, MARGIN, y - summaryBoxHeight, leftBoxWidth, summaryBoxHeight, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });
  drawText(page, "AMOUNT IN WORDS:", MARGIN + 8, y - 14, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, numberToWordsNpr(data.grandTotal), MARGIN + 8, y - 26, { size: isA5 ? 6.8 : 8, font: bold, color: COLORS.primary, maxWidth: leftBoxWidth - 16 });

  return pdf.save();
}
