import { CompanyInfo, DealerInfo, LineItemDto } from "../types";
import {
  COLORS,
  createPdfContext,
  drawText,
  drawRightText,
  drawCenteredText,
  drawBox,
  formatNpr,
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
}

export async function renderSalesOrderPdf(data: SalesOrderData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold } = ctx;

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Header
  drawBox(page, MARGIN, y - 60, CONTENT_WIDTH, 60, {
    color: COLORS.bgLight,
    borderColor: COLORS.primary,
    borderWidth: 1,
  });

  drawText(page, data.company.legalName || "BAGESHWARI TRACTORS PVT. LTD.", MARGIN + 12, y - 18, {
    size: 13,
    font: bold,
    color: COLORS.primary,
  });
  drawText(page, `${data.company.address || "Nepalgunj"}, Nepal | Ph: ${data.company.phone || "+977-81-520123"}`, MARGIN + 12, y - 32, {
    size: 8,
    font: regular,
    color: COLORS.secondary,
  });
  drawText(page, `B2B Order Confirmation | PAN: ${data.company.panNumber || "302918239"}`, MARGIN + 12, y - 44, {
    size: 8,
    font: bold,
    color: COLORS.primary,
  });

  drawRightText(page, "SALES ORDER", MARGIN + CONTENT_WIDTH - 12, y - 18, bold, {
    size: 14,
    color: COLORS.primary,
  });
  drawRightText(page, `Order #: ${data.orderNumber}`, MARGIN + CONTENT_WIDTH - 12, y - 32, bold, {
    size: 9,
    color: COLORS.primary,
  });
  drawRightText(page, `Date: ${new Date(data.orderDate).toISOString().slice(0, 10)}`, MARGIN + CONTENT_WIDTH - 12, y - 44, regular, {
    size: 8,
    color: COLORS.secondary,
  });

  y -= 70;

  // Buyer Info
  const infoHeight = 65;
  drawBox(page, MARGIN, y - infoHeight, CONTENT_WIDTH, infoHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, "ORDER PLACED BY DEALER:", MARGIN + 8, y - 13, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, data.dealer.tradingName || data.dealer.legalName, MARGIN + 8, y - 26, { size: 9.5, font: bold, color: COLORS.primary });
  drawText(page, `Dealer Code: ${data.dealer.code} | Contact: ${data.dealer.contactName || "N/A"} (${data.dealer.phone || "N/A"})`, MARGIN + 8, y - 38, { size: 8, font: regular, color: COLORS.secondary });
  drawText(page, `Location: ${data.dealer.city || "Nepalgunj"}, ${data.dealer.district || "Banke"} | Status: ${data.status}`, MARGIN + 8, y - 50, { size: 8, font: bold, color: COLORS.primary });

  y -= infoHeight + 10;

  // Items Table
  const colX = {
    sn: MARGIN,
    sku: MARGIN + 24,
    desc: MARGIN + 95,
    qty: MARGIN + 310,
    rate: MARGIN + 370,
    total: MARGIN + CONTENT_WIDTH,
  };

  const headerHeight = 18;
  drawBox(page, MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "S.N.", colX.sn + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawText(page, "SKU", colX.sku + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawText(page, "Product & Specification", colX.desc + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawRightText(page, "Quantity", colX.qty + 50, y - 12, bold, { size: 7.5, color: COLORS.white });
  drawRightText(page, "Dealer Price (NPR)", colX.rate + 60, y - 12, bold, { size: 7.5, color: COLORS.white });
  drawRightText(page, "Line Total (NPR)", colX.total - 6, y - 12, bold, { size: 7.5, color: COLORS.white });

  y -= headerHeight;

  const rowHeight = 18;
  let rowIndex = 0;
  for (const item of data.items) {
    if (y < 160) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN - 20;
    }

    const rowBg = rowIndex % 2 === 1 ? COLORS.bgLight : COLORS.white;
    drawBox(page, MARGIN, y - rowHeight, CONTENT_WIDTH, rowHeight, {
      color: rowBg,
      borderColor: COLORS.borderLight,
      borderWidth: 0.5,
    });

    drawText(page, String(item.sn || rowIndex + 1), colX.sn + 4, y - 12, { size: 7.5, font: regular, color: COLORS.secondary });
    drawText(page, item.sku.slice(0, 14), colX.sku + 4, y - 12, { size: 7.5, font: bold, color: COLORS.primary });
    drawText(page, item.description.slice(0, 48), colX.desc + 4, y - 12, { size: 7.5, font: regular, color: COLORS.black, maxWidth: 210 });
    drawRightText(page, `${item.quantity} ${item.unit || "PCS"}`, colX.qty + 50, y - 12, regular, { size: 7.5, color: COLORS.secondary });
    drawRightText(page, item.unitPrice.toFixed(2), colX.rate + 60, y - 12, regular, { size: 7.5, color: COLORS.secondary });
    drawRightText(page, item.lineTotal.toFixed(2), colX.total - 6, y - 12, bold, { size: 7.5, color: COLORS.primary });

    y -= rowHeight;
    rowIndex++;
  }

  y -= 8;

  // Summary
  const summaryBoxWidth = 220;
  const summaryBoxHeight = 70;
  const summaryX = MARGIN + CONTENT_WIDTH - summaryBoxWidth;

  drawBox(page, summaryX, y - summaryBoxHeight, summaryBoxWidth, summaryBoxHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, "Order Subtotal:", summaryX + 8, y - 14, { size: 8, font: regular, color: COLORS.secondary });
  drawRightText(page, formatNpr(data.subtotal), summaryX + summaryBoxWidth - 8, y - 14, regular, { size: 8, color: COLORS.secondary });

  drawText(page, "13% VAT Tax:", summaryX + 8, y - 28, { size: 8, font: regular, color: COLORS.secondary });
  drawRightText(page, formatNpr(data.taxTotal), summaryX + summaryBoxWidth - 8, y - 28, regular, { size: 8, color: COLORS.secondary });

  page.drawLine({ start: { x: summaryX, y: y - 36 }, end: { x: summaryX + summaryBoxWidth, y: y - 36 }, color: COLORS.primary, thickness: 1 });

  drawText(page, "GRAND TOTAL (NPR):", summaryX + 8, y - 50, { size: 9, font: bold, color: COLORS.primary });
  drawRightText(page, formatNpr(data.grandTotal), summaryX + summaryBoxWidth - 8, y - 50, bold, { size: 10, color: COLORS.primary });

  // Words (Left)
  const leftBoxWidth = CONTENT_WIDTH - summaryBoxWidth - 10;
  drawBox(page, MARGIN, y - summaryBoxHeight, leftBoxWidth, summaryBoxHeight, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });
  drawText(page, "AMOUNT IN WORDS:", MARGIN + 8, y - 14, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, numberToWordsNpr(data.grandTotal), MARGIN + 8, y - 26, { size: 8, font: bold, color: COLORS.primary, maxWidth: leftBoxWidth - 16 });

  return pdf.save();
}
