import { PDFDocument, PDFPage } from "pdf-lib";
import { CompanyInfo, DealerInfo, LineItemDto } from "../types";
import {
  COLORS,
  PaperSize,
  getPageDimensions,
  PdfContext,
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

export interface TaxInvoiceData {
  invoiceNumber: string;
  issueDate: Date | string;
  dueDate?: Date | string | null;
  orderNumber: string;
  purchaseOrderNumber?: string | null;
  challanNumber?: string | null;
  company: CompanyInfo;
  dealer: DealerInfo;
  items: LineItemDto[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  freightTotal: number;
  grandTotal: number;
  paymentTerms?: string | null;
  remarks?: string | null;
  verificationUrl?: string | null;
  paperSize?: PaperSize;
}

export async function renderTaxInvoicePdf(data: TaxInvoiceData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold, oblique } = ctx;

  const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = getPageDimensions(data.paperSize);
  const isA5 = data.paperSize === "A5";
  const MARGIN = isA5 ? 20 : 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // 1. TOP BANNER / HEADER
  const bannerH = isA5 ? 54 : 64;
  drawBox(page, MARGIN, y - bannerH, CONTENT_WIDTH, bannerH, {
    color: COLORS.bgLight,
    borderColor: COLORS.primary,
    borderWidth: 1,
  });

  // Company Information (Left)
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
  drawText(page, companyAddress, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 26 : 32), {
    size: isA5 ? 6.8 : 8,
    font: regular,
    color: COLORS.secondary,
    maxWidth: isA5 ? CONTENT_WIDTH * 0.55 : undefined,
  });
  drawText(page, `Tel: ${data.company.phone || "+977-81-520123"} | Email: ${data.company.email || "info@bageshwari.com.np"}`, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 36 : 44), {
    size: isA5 ? 6.8 : 8,
    font: regular,
    color: COLORS.secondary,
    maxWidth: isA5 ? CONTENT_WIDTH * 0.55 : undefined,
  });
  drawText(page, `PAN / VAT: ${data.company.panNumber || data.company.vatNumber || "302918239"}`, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 46 : 56), {
    size: isA5 ? 7.2 : 8.5,
    font: bold,
    color: COLORS.primary,
  });

  // Document Title & Stamp (Right)
  drawRightText(page, "TAX INVOICE", MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 16 : 20), bold, {
    size: isA5 ? 11 : 14,
    color: COLORS.primary,
  });
  drawRightText(page, "(VAT INVOICE - NEPAL IRD)", MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 26 : 32), bold, {
    size: isA5 ? 6 : 7,
    color: COLORS.danger,
  });
  const cleanInvoiceNo = (data.invoiceNumber || "").replace(/--+/g, "-");
  drawRightText(page, `Invoice No: ${cleanInvoiceNo}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 36 : 46), bold, {
    size: isA5 ? 7.5 : 9,
    color: COLORS.primary,
  });
  drawRightText(page, `Date: ${new Date(data.issueDate).toISOString().slice(0, 10)}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 46 : 57), regular, {
    size: isA5 ? 6.8 : 8,
    color: COLORS.secondary,
  });

  y -= bannerH + (isA5 ? 8 : 10);

  // 2. INVOICE META & BUYER DETAILS BOX
  const infoBoxHeight = isA5 ? 72 : 82;
  drawBox(page, MARGIN, y - infoBoxHeight, CONTENT_WIDTH, infoBoxHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  // Vertical Divider in info box
  page.drawLine({
    start: { x: MARGIN + CONTENT_WIDTH / 2, y },
    end: { x: MARGIN + CONTENT_WIDTH / 2, y: y - infoBoxHeight },
    color: COLORS.borderLight,
    thickness: 0.75,
  });

  // Buyer Details (Left Column)
  const leftX = MARGIN + 6;
  const colHalfW = CONTENT_WIDTH / 2 - 12;
  drawText(page, "BUYER (DEALER) DETAILS", leftX, y - (isA5 ? 11 : 13), { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, data.dealer.tradingName || data.dealer.legalName, leftX, y - (isA5 ? 22 : 26), { size: isA5 ? 8 : 9.5, font: bold, color: COLORS.primary, maxWidth: colHalfW });
  drawText(page, `PAN / VAT: ${data.dealer.taxNumber || "N/A"}`, leftX, y - (isA5 ? 33 : 38), { size: isA5 ? 7.2 : 8, font: bold, color: COLORS.primary });
  drawText(page, `Address: ${data.dealer.addressLine1 || ""}, ${data.dealer.city || ""}, ${data.dealer.district || ""}`, leftX, y - (isA5 ? 44 : 50), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });
  drawText(page, `Contact: ${data.dealer.contactName || "N/A"} (Ph: ${data.dealer.phone || "N/A"})`, leftX, y - (isA5 ? 55 : 62), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });

  // Invoice / Shipment References (Right Column)
  const rightColX = MARGIN + CONTENT_WIDTH / 2 + 6;
  drawText(page, "ORDER & LOGISTICS REFERENCES", rightColX, y - (isA5 ? 11 : 13), { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, `Order Ref: ${data.orderNumber}`, rightColX, y - (isA5 ? 22 : 26), { size: isA5 ? 7.5 : 8.5, font: bold, color: COLORS.primary, maxWidth: colHalfW });
  drawText(page, `PO: ${data.purchaseOrderNumber || "Direct B2B"}`, rightColX, y - (isA5 ? 33 : 38), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });
  drawText(page, `Challan: ${data.challanNumber || "Pending"}`, rightColX, y - (isA5 ? 44 : 50), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });
  drawText(page, `Terms: ${data.paymentTerms || "Credit 30 Days"}`, rightColX, y - (isA5 ? 55 : 62), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });

  y -= infoBoxHeight + (isA5 ? 8 : 10);

  // 3. LINE ITEMS TABLE
  const colX = {
    sn: MARGIN,
    sku: MARGIN + (isA5 ? 18 : 22),
    desc: MARGIN + (isA5 ? 68 : 90),
    qty: MARGIN + CONTENT_WIDTH - (isA5 ? 185 : 235),
    rate: MARGIN + CONTENT_WIDTH - (isA5 ? 135 : 175),
    disc: MARGIN + CONTENT_WIDTH - (isA5 ? 85 : 110),
    total: MARGIN + CONTENT_WIDTH,
  };

  // Header Row
  const tableHeaderHeight = 18;
  drawBox(page, MARGIN, y - tableHeaderHeight, CONTENT_WIDTH, tableHeaderHeight, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "S.N.", colX.sn + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawText(page, "SKU / Part #", colX.sku + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawText(page, "Item Description", colX.desc + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawRightText(page, "Qty", colX.rate - 6, y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });
  drawRightText(page, "Rate", colX.disc - 6, y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });
  drawRightText(page, "Disc", colX.total - (isA5 ? 50 : 65), y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });
  drawRightText(page, "Total (NPR)", colX.total - 6, y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });

  y -= tableHeaderHeight;

  // Item Rows
  const rowHeight = isA5 ? 17 : 18;
  let rowIndex = 0;
  for (const item of data.items) {
    if (y < (isA5 ? 160 : 200)) {
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
    drawText(page, item.sku.slice(0, 14), colX.sku + 3, y - (isA5 ? 11 : 12), { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.primary, maxWidth: isA5 ? 46 : 64 });
    drawText(page, item.description.slice(0, 42), colX.desc + 3, y - (isA5 ? 11 : 12), { size: isA5 ? 6.8 : 7.5, font: regular, color: COLORS.black, maxWidth: isA5 ? 110 : 190 });
    drawRightText(page, `${item.quantity} ${item.unit || "PCS"}`, colX.rate - 6, y - (isA5 ? 11 : 12), regular, { size: isA5 ? 6.8 : 7.5, color: COLORS.secondary });
    drawRightText(page, item.unitPrice.toFixed(2), colX.disc - 6, y - (isA5 ? 11 : 12), regular, { size: isA5 ? 6.8 : 7.5, color: COLORS.secondary });
    drawRightText(page, (item.discountAmount || 0).toFixed(2), colX.total - (isA5 ? 50 : 65), y - (isA5 ? 11 : 12), regular, { size: isA5 ? 6.8 : 7.5, color: COLORS.secondary });
    drawRightText(page, item.lineTotal.toFixed(2), colX.total - 6, y - (isA5 ? 11 : 12), bold, { size: isA5 ? 6.8 : 7.5, color: COLORS.primary });

    y -= rowHeight;
    rowIndex++;
  }

  y -= 8;

  // 4. FINANCIAL SUMMARY & WORDS SECTION
  const summaryBoxWidth = isA5 ? 180 : 220;
  const summaryBoxHeight = isA5 ? 104 : 112;
  const summaryX = MARGIN + CONTENT_WIDTH - summaryBoxWidth;

  // Summary Table (Right)
  drawBox(page, summaryX, y - summaryBoxHeight, summaryBoxWidth, summaryBoxHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  let sumY = y - (isA5 ? 12 : 14);
  const drawSummaryRow = (label: string, value: number, isBold = false, isHighlight = false) => {
    drawText(page, label, summaryX + 6, sumY, { size: isA5 ? 7.2 : 8, font: isBold ? bold : regular, color: isHighlight ? COLORS.primary : COLORS.secondary });
    drawRightText(page, formatNpr(value), summaryX + summaryBoxWidth - 6, sumY, isBold ? bold : regular, {
      size: isA5 ? 7.2 : 8,
      color: isHighlight ? COLORS.primary : COLORS.secondary,
    });
    sumY -= (isA5 ? 14 : 15);
  };

  drawSummaryRow("Gross Subtotal:", data.subtotal);
  drawSummaryRow("Total Discount:", -data.discountTotal);
  drawSummaryRow("Value Added Tax (VAT):", data.taxTotal);
  drawSummaryRow("Freight / Logistics:", data.freightTotal);

  // Grand Total separator line
  page.drawLine({
    start: { x: summaryX, y: sumY + 4 },
    end: { x: summaryX + summaryBoxWidth, y: sumY + 4 },
    color: COLORS.primary,
    thickness: 1,
  });

  drawText(page, "GRAND TOTAL (NPR):", summaryX + 6, sumY - 6, { size: isA5 ? 7.8 : 9, font: bold, color: COLORS.primary });
  drawRightText(page, formatNpr(data.grandTotal), summaryX + summaryBoxWidth - 6, sumY - 6, bold, {
    size: isA5 ? 8.8 : 10,
    color: COLORS.primary,
  });

  // Words & Bank Remittance Box (Left)
  const leftBoxWidth = CONTENT_WIDTH - summaryBoxWidth - (isA5 ? 8 : 10);
  drawBox(page, MARGIN, y - summaryBoxHeight, leftBoxWidth, summaryBoxHeight, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, "AMOUNT IN WORDS:", MARGIN + 6, y - (isA5 ? 12 : 14), { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  const amountWords = numberToWordsNpr(data.grandTotal);
  drawText(page, amountWords, MARGIN + 6, y - (isA5 ? 22 : 25), { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.primary, maxWidth: leftBoxWidth - 12 });

  drawText(page, "BANK PAYMENT REMITTANCE:", MARGIN + 6, y - (isA5 ? 50 : 56), { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, `Bank: ${data.company.bankName || "NIC ASIA Bank Ltd."} (${data.company.bankBranch || "Nepalgunj"})`, MARGIN + 6, y - (isA5 ? 62 : 68), { size: isA5 ? 6.5 : 7.5, font: regular, color: COLORS.secondary, maxWidth: leftBoxWidth - 12 });
  if (data.company.bankAccountName || data.company.legalName) {
    drawText(page, `A/C: ${data.company.bankAccountName || data.company.legalName}`, MARGIN + 6, y - (isA5 ? 74 : 80), { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.primary, maxWidth: leftBoxWidth - 12 });
  }
  drawText(page, `No: ${data.company.bankAccountNumber || "0194291823901928"} | SWIFT: ${data.company.bankSwiftCode || "NICA-NP"}`, MARGIN + 6, y - (isA5 ? 86 : 92), { size: isA5 ? 6.5 : 7.5, font: regular, color: COLORS.secondary, maxWidth: leftBoxWidth - 12 });

  y -= summaryBoxHeight + (isA5 ? 10 : 12);

  // 5. BARCODE, QR CODE & SIGNATORY / COMPLIANCE FOOTER
  const footerHeight = isA5 ? 74 : 85;
  drawBox(page, MARGIN, y - footerHeight, CONTENT_WIDTH, footerHeight, {
    color: COLORS.white,
    borderColor: COLORS.borderLight,
    borderWidth: 0.75,
  });

  // QR Code on Left
  const qrSize = isA5 ? 55 : 65;
  const qrImage = await generateQrImage(pdf, data.verificationUrl || `INV:${data.invoiceNumber}|ORD:${data.orderNumber}|TOTAL:${data.grandTotal}`, qrSize);
  if (qrImage) {
    page.drawImage(qrImage, {
      x: MARGIN + 8,
      y: y - footerHeight + (isA5 ? 8 : 10),
      width: qrSize,
      height: qrSize,
    });
  }

  // Barcode in Middle
  const midX = MARGIN + qrSize + 16;
  const barcodeImage = await generateBarcodeImage(pdf, data.invoiceNumber, { height: 10, scale: 2 });
  if (barcodeImage) {
    page.drawImage(barcodeImage, {
      x: midX,
      y: y - footerHeight + (isA5 ? 30 : 35),
      width: isA5 ? 110 : 140,
      height: isA5 ? 20 : 25,
    });
  }
  drawText(page, `Invoice: ${data.invoiceNumber}`, midX, y - footerHeight + (isA5 ? 18 : 22), { size: isA5 ? 6.2 : 7, font: regular, color: COLORS.muted });
  drawText(page, "Computer generated tax invoice.", midX, y - footerHeight + (isA5 ? 8 : 12), { size: isA5 ? 5.8 : 6.5, font: oblique, color: COLORS.muted });

  // Authorized Signatory on Right
  const sigW = isA5 ? 110 : 140;
  const sigX = MARGIN + CONTENT_WIDTH - sigW - 10;
  page.drawLine({
    start: { x: sigX, y: y - footerHeight + 26 },
    end: { x: sigX + sigW, y: y - footerHeight + 26 },
    color: COLORS.border,
    thickness: 0.75,
  });
  drawCenteredText(page, "Authorized Signatory", sigX + sigW / 2, y - footerHeight + 16, bold, { size: isA5 ? 6.8 : 7.5, color: COLORS.primary });
  drawCenteredText(page, `For ${data.company.legalName || data.company.tradingName || "Company"}`, sigX + sigW / 2, y - footerHeight + 7, regular, { size: isA5 ? 5.8 : 6.5, color: COLORS.muted });

  return pdf.save();
}
