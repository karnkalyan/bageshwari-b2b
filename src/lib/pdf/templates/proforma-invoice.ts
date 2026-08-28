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
  verificationUrl?: string;
}

export async function renderProformaInvoicePdf(data: ProformaInvoiceData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold, oblique } = ctx;

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // 1. TOP NOTICE BADGE
  drawBox(page, MARGIN, y - 18, CONTENT_WIDTH, 18, {
    color: COLORS.bgLight,
    borderColor: COLORS.danger,
    borderWidth: 0.75,
  });
  drawCenteredText(page, "PROFORMA INVOICE  —  COMMERCIAL ESTIMATE & QUOTATION  (NOT A TAX INVOICE)", MARGIN + CONTENT_WIDTH / 2, y - 13, bold, {
    size: 7.5,
    color: COLORS.danger,
  });

  y -= 26;

  // 2. COMPANY & PROFORMA HEADER
  drawBox(page, MARGIN, y - 64, CONTENT_WIDTH, 64, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  // Company Details (Left)
  drawText(page, data.company.legalName || "BAGESHWARI TRACTORS PVT. LTD.", MARGIN + 12, y - 18, {
    size: 13,
    font: bold,
    color: COLORS.primary,
  });
  drawText(page, `${data.company.address || "Main Road"}, ${data.company.city || "Nepalgunj"}, ${data.company.district || "Banke"}, Nepal`, MARGIN + 12, y - 32, {
    size: 8,
    font: regular,
    color: COLORS.secondary,
  });
  drawText(page, `Tel: ${data.company.phone || "+977-81-520123"} | Email: ${data.company.email || "orders@bageshwari.com.np"}`, MARGIN + 12, y - 44, {
    size: 8,
    font: regular,
    color: COLORS.secondary,
  });
  drawText(page, `PAN No: ${data.company.panNumber || "302918239"}`, MARGIN + 12, y - 56, {
    size: 8.5,
    font: bold,
    color: COLORS.primary,
  });

  // Proforma Details (Right)
  drawRightText(page, "PROFORMA INVOICE", MARGIN + CONTENT_WIDTH - 12, y - 20, bold, {
    size: 13,
    color: COLORS.primary,
  });
  drawRightText(page, `PI No: ${data.proformaNumber}`, MARGIN + CONTENT_WIDTH - 12, y - 34, bold, {
    size: 9,
    color: COLORS.primary,
  });
  drawRightText(page, `Issue Date: ${new Date(data.issueDate).toISOString().slice(0, 10)}`, MARGIN + CONTENT_WIDTH - 12, y - 46, regular, {
    size: 8,
    color: COLORS.secondary,
  });
  const validDate = data.validUntil ? new Date(data.validUntil).toISOString().slice(0, 10) : "15 Days from Issue Date";
  drawRightText(page, `Valid Until: ${validDate}`, MARGIN + CONTENT_WIDTH - 12, y - 58, bold, {
    size: 8,
    color: COLORS.danger,
  });

  y -= 74;

  // 3. BUYER & TERMS BOX
  const infoBoxHeight = 78;
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
  const leftX = MARGIN + 8;
  drawText(page, "PROSPECTIVE BUYER / DEALER", leftX, y - 13, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, data.dealer.tradingName || data.dealer.legalName, leftX, y - 26, { size: 9.5, font: bold, color: COLORS.primary });
  drawText(page, `PAN / VAT: ${data.dealer.taxNumber || "N/A"} | Code: ${data.dealer.code}`, leftX, y - 38, { size: 8, font: regular, color: COLORS.secondary });
  drawText(page, `Location: ${data.dealer.city || "Nepalgunj"}, ${data.dealer.district || "Banke"}`, leftX, y - 50, { size: 8, font: regular, color: COLORS.secondary });
  drawText(page, `Contact: ${data.dealer.contactName || "Authorized Dealer Representative"} (${data.dealer.phone || "N/A"})`, leftX, y - 62, { size: 8, font: regular, color: COLORS.secondary });

  // Order References & Commercial Terms
  const rightColX = MARGIN + CONTENT_WIDTH / 2 + 8;
  drawText(page, "COMMERCIAL & PAYMENT TERMS", rightColX, y - 13, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, `Sales Order: ${data.orderNumber}`, rightColX, y - 26, { size: 8.5, font: bold, color: COLORS.primary });
  drawText(page, `Payment Terms: ${data.paymentTerms || "100% Advance Bank Transfer or Approved Credit Limit"}`, rightColX, y - 38, { size: 8, font: regular, color: COLORS.secondary, maxWidth: 230 });
  drawText(page, `Credit Terms: ${data.creditTerms || "Standard 30-Day B2B Credit Schedule"}`, rightColX, y - 50, { size: 8, font: regular, color: COLORS.secondary, maxWidth: 230 });
  drawText(page, "Price Basis: Ex-Warehouse Nepalgunj (Transportation extra)", rightColX, y - 62, { size: 7.5, font: oblique, color: COLORS.muted });

  y -= infoBoxHeight + 10;

  // 4. ITEMS TABLE
  const colX = {
    sn: MARGIN,
    sku: MARGIN + 24,
    desc: MARGIN + 95,
    qty: MARGIN + 310,
    rate: MARGIN + 370,
    total: MARGIN + CONTENT_WIDTH,
  };

  const tableHeaderHeight = 18;
  drawBox(page, MARGIN, y - tableHeaderHeight, CONTENT_WIDTH, tableHeaderHeight, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "S.N.", colX.sn + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawText(page, "SKU", colX.sku + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawText(page, "Description & Specifications", colX.desc + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawRightText(page, "Approved Qty", colX.qty + 50, y - 12, bold, { size: 7.5, color: COLORS.white });
  drawRightText(page, "Dealer Rate (NPR)", colX.rate + 60, y - 12, bold, { size: 7.5, color: COLORS.white });
  drawRightText(page, "Estimated Total (NPR)", colX.total - 6, y - 12, bold, { size: 7.5, color: COLORS.white });

  y -= tableHeaderHeight;

  const rowHeight = 18;
  let rowIndex = 0;
  for (const item of data.items) {
    if (y < 200) {
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

  // 5. TOTALS & BANK DETAILS
  const summaryBoxWidth = 220;
  const summaryBoxHeight = 104;
  const summaryX = MARGIN + CONTENT_WIDTH - summaryBoxWidth;

  drawBox(page, summaryX, y - summaryBoxHeight, summaryBoxWidth, summaryBoxHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  let sumY = y - 14;
  const drawSum = (label: string, value: number, isBold = false) => {
    drawText(page, label, summaryX + 8, sumY, { size: 8, font: isBold ? bold : regular, color: COLORS.secondary });
    drawRightText(page, formatNpr(value), summaryX + summaryBoxWidth - 8, sumY, isBold ? bold : regular, { size: 8, color: COLORS.secondary });
    sumY -= 15;
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

  drawText(page, "TOTAL PROFORMA (NPR):", summaryX + 8, sumY - 6, { size: 9, font: bold, color: COLORS.primary });
  drawRightText(page, formatNpr(data.grandTotal), summaryX + summaryBoxWidth - 8, sumY - 6, bold, { size: 10, color: COLORS.primary });

  // Bank Info (Left)
  const leftBoxWidth = CONTENT_WIDTH - summaryBoxWidth - 10;
  drawBox(page, MARGIN, y - summaryBoxHeight, leftBoxWidth, summaryBoxHeight, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, "PROFORMA AMOUNT IN WORDS:", MARGIN + 8, y - 14, { size: 7.5, font: bold, color: COLORS.muted });
  const amountWords = numberToWordsNpr(data.grandTotal);
  drawText(page, amountWords, MARGIN + 8, y - 25, { size: 7.5, font: bold, color: COLORS.primary, maxWidth: leftBoxWidth - 16 });

  drawText(page, "BANK PAYMENT DEPOSIT INSTRUCTIONS:", MARGIN + 8, y - 56, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, `Bank: ${data.company.bankName || "NIC ASIA Bank Ltd."} | Branch: ${data.company.bankBranch || "Nepalgunj"}`, MARGIN + 8, y - 68, { size: 7.5, font: regular, color: COLORS.secondary });
  drawText(page, `A/C: ${data.company.bankAccountNumber || "0194291823901928"} (${data.company.bankAccountName || "Bageshwari Tractors"})`, MARGIN + 8, y - 80, { size: 7.5, font: bold, color: COLORS.primary });

  y -= summaryBoxHeight + 12;

  // 6. DEALER ACCEPTANCE & SIGNATORY BLOCK
  const footerHeight = 85;
  drawBox(page, MARGIN, y - footerHeight, CONTENT_WIDTH, footerHeight, {
    color: COLORS.white,
    borderColor: COLORS.borderLight,
    borderWidth: 0.75,
  });

  // Dealer Acceptance Box (Left)
  drawText(page, "DEALER ORDER ACCEPTANCE", MARGIN + 12, y - 14, { size: 7.5, font: bold, color: COLORS.primary });
  drawText(page, "I/We hereby accept this Proforma Invoice and authorize dispatch as per terms.", MARGIN + 12, y - 26, { size: 6.5, font: regular, color: COLORS.secondary, maxWidth: 240 });
  page.drawLine({
    start: { x: MARGIN + 12, y: y - footerHeight + 25 },
    end: { x: MARGIN + 220, y: y - footerHeight + 25 },
    color: COLORS.border,
    thickness: 0.75,
  });
  drawText(page, "Dealer Signature & Rubber Stamp", MARGIN + 12, y - footerHeight + 14, { size: 7, font: oblique, color: COLORS.muted });

  // Verification QR & Barcode (Center)
  const qrImage = await generateQrImage(pdf, data.verificationUrl || `PI:${data.proformaNumber}|ORD:${data.orderNumber}|VAL:${data.grandTotal}`, 65);
  if (qrImage) {
    page.drawImage(qrImage, {
      x: MARGIN + 260,
      y: y - footerHeight + 10,
      width: 65,
      height: 65,
    });
  }

  // Company Authorized Stamp (Right)
  const sigX = MARGIN + CONTENT_WIDTH - 150;
  page.drawLine({
    start: { x: sigX, y: y - footerHeight + 30 },
    end: { x: sigX + 140, y: y - footerHeight + 30 },
    color: COLORS.border,
    thickness: 0.75,
  });
  drawCenteredText(page, "Authorized Commercial Signatory", sigX + 70, y - footerHeight + 18, bold, { size: 7.5, color: COLORS.primary });
  drawCenteredText(page, "For Bageshwari Tractors Pvt. Ltd.", sigX + 70, y - footerHeight + 8, regular, { size: 6.5, color: COLORS.muted });

  return pdf.save();
}
