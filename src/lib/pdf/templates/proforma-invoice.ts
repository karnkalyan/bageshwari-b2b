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

export interface ProformaInvoiceData {
  proformaNumber: string;
  issueDate: Date | string;
  validUntil?: Date | string | null;
  orderNumber: string;
  company: CompanyInfo;
  dealer: DealerInfo;
  items: LineItemDto[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  freightTotal: number;
  grandTotal: number;
  paymentTerms?: string | null;
  creditTerms?: string | null;
  remarks?: string | null;
  verificationUrl?: string | null;
  paperSize?: PaperSize;
}

export async function renderProformaInvoicePdf(data: ProformaInvoiceData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold, oblique } = ctx;

  const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = getPageDimensions(data.paperSize);
  const isA5 = data.paperSize === "A5";
  const MARGIN = isA5 ? 20 : 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // 1. TOP HEADER BANNER (Proforma Notice - Non-negotiable indicator)
  drawBox(page, MARGIN, y - 22, CONTENT_WIDTH, 22, {
    color: COLORS.bgHeader,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });
  drawCenteredText(page, "PROFORMA INVOICE COMMERCIAL ESTIMATE & QUOTATION (NOT A TAX INVOICE)", PAGE_WIDTH / 2, y - 15, bold, {
    size: isA5 ? 6.5 : 8.5,
    color: COLORS.primary,
  });

  y -= (isA5 ? 26 : 30);

  // 2. COMPANY & INVOICE HEADER BOX
  const compBoxH = isA5 ? 56 : 64;
  drawBox(page, MARGIN, y - compBoxH, CONTENT_WIDTH, compBoxH, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  // Company Details (Left)
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
  drawText(page, companyAddress, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 25 : 32), {
    size: isA5 ? 6.8 : 8,
    font: regular,
    color: COLORS.secondary,
    maxWidth: isA5 ? CONTENT_WIDTH * 0.55 : undefined,
  });
  drawText(page, `Tel: ${data.company.phone || "+977-81-520123"} | Email: ${data.company.email || "info@bageshwari.com.np"}`, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 35 : 44), {
    size: isA5 ? 6.8 : 8,
    font: regular,
    color: COLORS.secondary,
    maxWidth: isA5 ? CONTENT_WIDTH * 0.55 : undefined,
  });
  drawText(page, `PAN No: ${data.company.panNumber || data.company.vatNumber || "302918239"}`, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 46 : 56), {
    size: isA5 ? 7.2 : 8.5,
    font: bold,
    color: COLORS.primary,
  });

  // Proforma Details (Right)
  drawRightText(page, "PROFORMA INVOICE", MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 16 : 20), bold, {
    size: isA5 ? 11 : 13,
    color: COLORS.primary,
  });
  const cleanProformaNumber = (data.proformaNumber || "").replace(/--+/g, "-");
  drawRightText(page, `PI No: ${cleanProformaNumber}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 27 : 34), bold, {
    size: isA5 ? 7.5 : 9,
    color: COLORS.primary,
  });
  drawRightText(page, `Issue Date: ${new Date(data.issueDate).toISOString().slice(0, 10)}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 37 : 46), regular, {
    size: isA5 ? 6.8 : 8,
    color: COLORS.secondary,
  });
  const validDate = data.validUntil ? new Date(data.validUntil).toISOString().slice(0, 10) : "15 Days from Issue Date";
  drawRightText(page, `Valid Until: ${validDate}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 47 : 58), bold, {
    size: isA5 ? 6.8 : 8,
    color: COLORS.danger,
  });

  y -= compBoxH + (isA5 ? 8 : 10);

  // 3. BUYER & TERMS BOX
  const infoBoxHeight = isA5 ? 70 : 78;
  drawBox(page, MARGIN, y - infoBoxHeight, CONTENT_WIDTH, infoBoxHeight, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  page.drawLine({
    start: { x: MARGIN + CONTENT_WIDTH / 2, y },
    end: { x: MARGIN + CONTENT_WIDTH / 2, y: y - infoBoxHeight },
    color: COLORS.borderLight,
    thickness: 0.75,
  });

  // Buyer Info
  const leftX = MARGIN + 6;
  const colHalfW = CONTENT_WIDTH / 2 - 12;
  drawText(page, "PROSPECTIVE BUYER / DEALER", leftX, y - (isA5 ? 11 : 13), { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, data.dealer.tradingName || data.dealer.legalName, leftX, y - (isA5 ? 22 : 26), { size: isA5 ? 8 : 9.5, font: bold, color: COLORS.primary, maxWidth: colHalfW });
  drawText(page, `PAN / VAT: ${data.dealer.taxNumber || "N/A"} | Code: ${data.dealer.code}`, leftX, y - (isA5 ? 33 : 38), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });
  drawText(page, `Location: ${data.dealer.city || "Nepalgunj"}, ${data.dealer.district || "Banke"}`, leftX, y - (isA5 ? 44 : 50), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });
  drawText(page, `Contact: ${data.dealer.contactName || "Authorized Dealer"} (${data.dealer.phone || "N/A"})`, leftX, y - (isA5 ? 55 : 62), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });

  // Order References & Commercial Terms
  const rightColX = MARGIN + CONTENT_WIDTH / 2 + 6;
  drawText(page, "COMMERCIAL & PAYMENT TERMS", rightColX, y - (isA5 ? 11 : 13), { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, `Sales Order: ${data.orderNumber}`, rightColX, y - (isA5 ? 22 : 26), { size: isA5 ? 7.5 : 8.5, font: bold, color: COLORS.primary, maxWidth: colHalfW });
  drawText(page, `Payment Terms: ${data.paymentTerms || "Advance Transfer / Credit"}`, rightColX, y - (isA5 ? 33 : 38), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });
  drawText(page, `Credit Terms: ${data.creditTerms || "30-Day B2B Schedule"}`, rightColX, y - (isA5 ? 44 : 50), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });
  drawText(page, "Price Basis: Ex-Warehouse Nepalgunj", rightColX, y - (isA5 ? 55 : 62), { size: isA5 ? 6.5 : 7.5, font: oblique, color: COLORS.muted });

  y -= infoBoxHeight + (isA5 ? 8 : 10);

  // 4. ITEMS TABLE
  const colX = {
    sn: MARGIN,
    sku: MARGIN + (isA5 ? 18 : 24),
    desc: MARGIN + (isA5 ? 68 : 95),
    qty: MARGIN + CONTENT_WIDTH - (isA5 ? 180 : 230),
    rate: MARGIN + CONTENT_WIDTH - (isA5 ? 120 : 160),
    total: MARGIN + CONTENT_WIDTH,
  };

  const tableHeaderHeight = 18;
  drawBox(page, MARGIN, y - tableHeaderHeight, CONTENT_WIDTH, tableHeaderHeight, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "S.N.", colX.sn + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawText(page, "SKU", colX.sku + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawText(page, "Description & Specs", colX.desc + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawRightText(page, "Qty", colX.rate - 6, y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });
  drawRightText(page, "Rate (NPR)", colX.total - (isA5 ? 60 : 75), y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });
  drawRightText(page, "Total (NPR)", colX.total - 6, y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });

  y -= tableHeaderHeight;

  const rowHeight = isA5 ? 17 : 18;
  let rowIndex = 0;
  for (const item of data.items) {
    if (y < (isA5 ? 150 : 200)) {
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
    drawRightText(page, item.unitPrice.toFixed(2), colX.total - (isA5 ? 60 : 75), y - (isA5 ? 11 : 12), regular, { size: isA5 ? 6.8 : 7.5, color: COLORS.secondary });
    drawRightText(page, item.lineTotal.toFixed(2), colX.total - 6, y - (isA5 ? 11 : 12), bold, { size: isA5 ? 6.8 : 7.5, color: COLORS.primary });

    y -= rowHeight;
    rowIndex++;
  }

  y -= 8;

  // 5. TOTALS & BANK DETAILS
  const summaryBoxWidth = isA5 ? 180 : 220;
  const summaryBoxHeight = isA5 ? 96 : 104;
  const summaryX = MARGIN + CONTENT_WIDTH - summaryBoxWidth;

  drawBox(page, summaryX, y - summaryBoxHeight, summaryBoxWidth, summaryBoxHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  let sumY = y - (isA5 ? 12 : 14);
  const drawSum = (label: string, value: number, isBold = false) => {
    drawText(page, label, summaryX + 6, sumY, { size: isA5 ? 7.2 : 8, font: isBold ? bold : regular, color: COLORS.secondary });
    drawRightText(page, formatNpr(value), summaryX + summaryBoxWidth - 6, sumY, isBold ? bold : regular, { size: isA5 ? 7.2 : 8, color: COLORS.secondary });
    sumY -= (isA5 ? 14 : 15);
  };

  drawSum("Item Subtotal:", data.subtotal);
  drawSum("Value Added Tax (VAT):", data.taxTotal);
  drawSum("Estimated Freight:", data.freightTotal);

  page.drawLine({
    start: { x: summaryX, y: sumY + 4 },
    end: { x: summaryX + summaryBoxWidth, y: sumY + 4 },
    color: COLORS.primary,
    thickness: 1,
  });

  drawText(page, "TOTAL PROFORMA (NPR):", summaryX + 6, sumY - 6, { size: isA5 ? 7.8 : 9, font: bold, color: COLORS.primary });
  drawRightText(page, formatNpr(data.grandTotal), summaryX + summaryBoxWidth - 6, sumY - 6, bold, { size: isA5 ? 8.8 : 10, color: COLORS.primary });

  // Bank Info (Left)
  const leftBoxWidth = CONTENT_WIDTH - summaryBoxWidth - (isA5 ? 8 : 10);
  drawBox(page, MARGIN, y - summaryBoxHeight, leftBoxWidth, summaryBoxHeight, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, "PROFORMA AMOUNT IN WORDS:", MARGIN + 6, y - (isA5 ? 12 : 14), { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  const amountWords = numberToWordsNpr(data.grandTotal);
  drawText(page, amountWords, MARGIN + 6, y - (isA5 ? 22 : 25), { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.primary, maxWidth: leftBoxWidth - 12 });

  drawText(page, "BANK PAYMENT DEPOSIT INSTRUCTIONS:", MARGIN + 6, y - (isA5 ? 50 : 56), { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, `Bank: ${data.company.bankName || "NIC ASIA Bank Ltd."} (${data.company.bankBranch || "Nepalgunj"})`, MARGIN + 6, y - (isA5 ? 62 : 68), { size: isA5 ? 6.5 : 7.5, font: regular, color: COLORS.secondary, maxWidth: leftBoxWidth - 12 });
  drawText(page, `A/C: ${data.company.bankAccountNumber || "0194291823901928"} (${data.company.bankAccountName || data.company.legalName || data.company.tradingName || "Company"})`, MARGIN + 6, y - (isA5 ? 74 : 80), { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.primary, maxWidth: leftBoxWidth - 12 });

  y -= summaryBoxHeight + (isA5 ? 10 : 12);

  // 6. DEALER ACCEPTANCE & SIGNATORY BLOCK
  const footerHeight = isA5 ? 74 : 85;
  drawBox(page, MARGIN, y - footerHeight, CONTENT_WIDTH, footerHeight, {
    color: COLORS.white,
    borderColor: COLORS.borderLight,
    borderWidth: 0.75,
  });

  // Dealer Acceptance Box (Left)
  drawText(page, "DEALER ORDER ACCEPTANCE", MARGIN + 8, y - 13, { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.primary });
  drawText(page, "I/We hereby accept this Proforma Invoice and authorize dispatch as per terms.", MARGIN + 8, y - 24, { size: isA5 ? 6 : 6.5, font: regular, color: COLORS.secondary, maxWidth: isA5 ? 170 : 240 });
  const acceptLineW = isA5 ? 160 : 220;
  page.drawLine({
    start: { x: MARGIN + 8, y: y - footerHeight + 22 },
    end: { x: MARGIN + 8 + acceptLineW, y: y - footerHeight + 22 },
    color: COLORS.border,
    thickness: 0.75,
  });
  drawText(page, "Dealer Signature & Rubber Stamp", MARGIN + 8, y - footerHeight + 12, { size: isA5 ? 6.2 : 7, font: oblique, color: COLORS.muted });

  // Verification QR (Center)
  const qrSize = isA5 ? 54 : 65;
  const qrX = MARGIN + acceptLineW + (isA5 ? 12 : 25);
  const qrImage = await generateQrImage(pdf, data.verificationUrl || `PI:${data.proformaNumber}|ORD:${data.orderNumber}|VAL:${data.grandTotal}`, qrSize);
  if (qrImage) {
    page.drawImage(qrImage, {
      x: qrX,
      y: y - footerHeight + 10,
      width: qrSize,
      height: qrSize,
    });
  }

  // Company Authorized Stamp (Right)
  const sigW = isA5 ? 110 : 140;
  const sigX = MARGIN + CONTENT_WIDTH - sigW - 8;
  page.drawLine({
    start: { x: sigX, y: y - footerHeight + 26 },
    end: { x: sigX + sigW, y: y - footerHeight + 26 },
    color: COLORS.border,
    thickness: 0.75,
  });
  drawCenteredText(page, "Authorized Commercial Signatory", sigX + sigW / 2, y - footerHeight + 16, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.primary });
  drawCenteredText(page, `For ${data.company.legalName || data.company.tradingName || "Company"}`, sigX + sigW / 2, y - footerHeight + 7, regular, { size: isA5 ? 5.8 : 6.5, color: COLORS.muted });

  return pdf.save();
}
