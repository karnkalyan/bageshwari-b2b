import { PDFDocument, PDFPage } from "pdf-lib";
import { CompanyInfo, DealerInfo, LineItemDto } from "../types";
import {
  COLORS,
  PdfContext,
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
  verificationUrl?: string;
}

export async function renderTaxInvoicePdf(data: TaxInvoiceData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold, oblique } = ctx;

  const PAGE_WIDTH = 595.28; // A4 portrait
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // 1. TOP BANNER / HEADER
  drawBox(page, MARGIN, y - 64, CONTENT_WIDTH, 64, {
    color: COLORS.bgLight,
    borderColor: COLORS.primary,
    borderWidth: 1,
  });

  // Company Information (Left)
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
  drawText(page, `Tel: ${data.company.phone || "+977-81-520123"} | Email: ${data.company.email || "info@bageshwari.com.np"}`, MARGIN + 12, y - 44, {
    size: 8,
    font: regular,
    color: COLORS.secondary,
  });
  drawText(page, `PAN / VAT No: ${data.company.panNumber || data.company.vatNumber || "302918239"}`, MARGIN + 12, y - 56, {
    size: 8.5,
    font: bold,
    color: COLORS.primary,
  });

  // Document Title & Stamp (Right)
  drawRightText(page, "TAX INVOICE", MARGIN + CONTENT_WIDTH - 12, y - 20, bold, {
    size: 14,
    color: COLORS.primary,
  });
  drawRightText(page, "(VAT INVOICE - NEPAL IRD COMPLIANT)", MARGIN + CONTENT_WIDTH - 12, y - 32, bold, {
    size: 7,
    color: COLORS.danger,
  });
  drawRightText(page, `Invoice No: ${data.invoiceNumber}`, MARGIN + CONTENT_WIDTH - 12, y - 46, bold, {
    size: 9,
    color: COLORS.primary,
  });
  drawRightText(page, `Date: ${new Date(data.issueDate).toISOString().slice(0, 10)}`, MARGIN + CONTENT_WIDTH - 12, y - 57, regular, {
    size: 8,
    color: COLORS.secondary,
  });

  y -= 74;

  // 2. INVOICE META & BUYER DETAILS BOX
  const infoBoxHeight = 82;
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
  const leftX = MARGIN + 8;
  drawText(page, "BUYER (DEALER) DETAILS", leftX, y - 13, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, data.dealer.tradingName || data.dealer.legalName, leftX, y - 26, { size: 9.5, font: bold, color: COLORS.primary });
  drawText(page, `PAN / VAT No: ${data.dealer.taxNumber || "N/A"}`, leftX, y - 38, { size: 8, font: bold, color: COLORS.primary });
  drawText(page, `Address: ${data.dealer.addressLine1 || ""}, ${data.dealer.city || ""}, ${data.dealer.district || ""}`, leftX, y - 50, { size: 8, font: regular, color: COLORS.secondary, maxWidth: 240 });
  drawText(page, `Contact: ${data.dealer.contactName || "N/A"} (Ph: ${data.dealer.phone || "N/A"})`, leftX, y - 62, { size: 8, font: regular, color: COLORS.secondary });
  drawText(page, `Dealer Code: ${data.dealer.code}`, leftX, y - 74, { size: 7.5, font: regular, color: COLORS.muted });

  // Invoice / Shipment References (Right Column)
  const rightColX = MARGIN + CONTENT_WIDTH / 2 + 8;
  drawText(page, "ORDER & LOGISTICS REFERENCES", rightColX, y - 13, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, `Order Reference: ${data.orderNumber}`, rightColX, y - 26, { size: 8.5, font: bold, color: COLORS.primary });
  drawText(page, `Purchase Order: ${data.purchaseOrderNumber || "Direct B2B Portal"}`, rightColX, y - 38, { size: 8, font: regular, color: COLORS.secondary });
  drawText(page, `Dispatch Challan: ${data.challanNumber || "Pending Dispatch"}`, rightColX, y - 50, { size: 8, font: regular, color: COLORS.secondary });
  drawText(page, `Payment Terms: ${data.paymentTerms || "Standard Credit / Bank Transfer"}`, rightColX, y - 62, { size: 8, font: regular, color: COLORS.secondary });
  if (data.dueDate) {
    drawText(page, `Payment Due Date: ${new Date(data.dueDate).toISOString().slice(0, 10)}`, rightColX, y - 74, { size: 8, font: bold, color: COLORS.danger });
  }

  y -= infoBoxHeight + 10;

  // 3. LINE ITEMS TABLE
  const colX = {
    sn: MARGIN,
    sku: MARGIN + 22,
    desc: MARGIN + 90,
    qty: MARGIN + 295,
    rate: MARGIN + 350,
    disc: MARGIN + 420,
    total: MARGIN + CONTENT_WIDTH,
  };

  // Header Row
  const tableHeaderHeight = 18;
  drawBox(page, MARGIN, y - tableHeaderHeight, CONTENT_WIDTH, tableHeaderHeight, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "S.N.", colX.sn + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawText(page, "SKU / Part #", colX.sku + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawText(page, "Item Description", colX.desc + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawRightText(page, "Qty", colX.qty + 45, y - 12, bold, { size: 7.5, color: COLORS.white });
  drawRightText(page, "Rate (NPR)", colX.rate + 60, y - 12, bold, { size: 7.5, color: COLORS.white });
  drawRightText(page, "Discount", colX.disc + 45, y - 12, bold, { size: 7.5, color: COLORS.white });
  drawRightText(page, "Line Total (NPR)", colX.total - 6, y - 12, bold, { size: 7.5, color: COLORS.white });

  y -= tableHeaderHeight;

  // Item Rows
  const rowHeight = 18;
  let rowIndex = 0;
  for (const item of data.items) {
    if (y < 200) {
      // Add new page for overflow
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
    drawText(page, item.description.slice(0, 42), colX.desc + 4, y - 12, { size: 7.5, font: regular, color: COLORS.black, maxWidth: 200 });
    drawRightText(page, `${item.quantity} ${item.unit || "PCS"}`, colX.qty + 45, y - 12, regular, { size: 7.5, color: COLORS.secondary });
    drawRightText(page, item.unitPrice.toFixed(2), colX.rate + 60, y - 12, regular, { size: 7.5, color: COLORS.secondary });
    drawRightText(page, (item.discountAmount || 0).toFixed(2), colX.disc + 45, y - 12, regular, { size: 7.5, color: COLORS.secondary });
    drawRightText(page, item.lineTotal.toFixed(2), colX.total - 6, y - 12, bold, { size: 7.5, color: COLORS.primary });

    y -= rowHeight;
    rowIndex++;
  }

  y -= 8;

  // 4. FINANCIAL SUMMARY & WORDS SECTION
  const summaryBoxWidth = 220;
  const summaryBoxHeight = 112;
  const summaryX = MARGIN + CONTENT_WIDTH - summaryBoxWidth;

  // Summary Table (Right)
  drawBox(page, summaryX, y - summaryBoxHeight, summaryBoxWidth, summaryBoxHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  let sumY = y - 14;
  const drawSummaryRow = (label: string, value: number, isBold = false, isHighlight = false) => {
    drawText(page, label, summaryX + 8, sumY, { size: 8, font: isBold ? bold : regular, color: isHighlight ? COLORS.primary : COLORS.secondary });
    drawRightText(page, formatNpr(value), summaryX + summaryBoxWidth - 8, sumY, isBold ? bold : regular, {
      size: 8,
      color: isHighlight ? COLORS.primary : COLORS.secondary,
    });
    sumY -= 15;
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

  drawText(page, "GRAND TOTAL (NPR):", summaryX + 8, sumY - 6, { size: 9, font: bold, color: COLORS.primary });
  drawRightText(page, formatNpr(data.grandTotal), summaryX + summaryBoxWidth - 8, sumY - 6, bold, {
    size: 10,
    color: COLORS.primary,
  });

  // Words & Bank Remittance Box (Left)
  const leftBoxWidth = CONTENT_WIDTH - summaryBoxWidth - 10;
  drawBox(page, MARGIN, y - summaryBoxHeight, leftBoxWidth, summaryBoxHeight, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, "AMOUNT IN WORDS:", MARGIN + 8, y - 14, { size: 7.5, font: bold, color: COLORS.muted });
  const amountWords = numberToWordsNpr(data.grandTotal);
  drawText(page, amountWords, MARGIN + 8, y - 25, { size: 7.5, font: bold, color: COLORS.primary, maxWidth: leftBoxWidth - 16 });

  drawText(page, "BANK PAYMENT REMITTANCE DETAILS:", MARGIN + 8, y - 56, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, `Bank: ${data.company.bankName || "NIC ASIA Bank Ltd."} | Branch: ${data.company.bankBranch || "Nepalgunj Main"}`, MARGIN + 8, y - 68, { size: 7.5, font: regular, color: COLORS.secondary });
  drawText(page, `A/C Name: ${data.company.bankAccountName || "Bageshwari Tractors Pvt. Ltd."}`, MARGIN + 8, y - 80, { size: 7.5, font: bold, color: COLORS.primary });
  drawText(page, `A/C Number: ${data.company.bankAccountNumber || "0194291823901928"} | SWIFT: ${data.company.bankSwiftCode || "NICA-NP"}`, MARGIN + 8, y - 92, { size: 7.5, font: regular, color: COLORS.secondary });

  y -= summaryBoxHeight + 12;

  // 5. BARCODE, QR CODE & SIGNATORY / COMPLIANCE FOOTER
  const footerHeight = 85;
  drawBox(page, MARGIN, y - footerHeight, CONTENT_WIDTH, footerHeight, {
    color: COLORS.white,
    borderColor: COLORS.borderLight,
    borderWidth: 0.75,
  });

  // QR Code on Left
  const qrImage = await generateQrImage(pdf, data.verificationUrl || `INV:${data.invoiceNumber}|ORD:${data.orderNumber}|TOTAL:${data.grandTotal}`, 70);
  if (qrImage) {
    page.drawImage(qrImage, {
      x: MARGIN + 10,
      y: y - footerHeight + 10,
      width: 65,
      height: 65,
    });
  }

  // Barcode in Middle
  const barcodeImage = await generateBarcodeImage(pdf, data.invoiceNumber, { height: 10, scale: 2 });
  if (barcodeImage) {
    page.drawImage(barcodeImage, {
      x: MARGIN + 90,
      y: y - footerHeight + 35,
      width: 140,
      height: 25,
    });
  }
  drawText(page, `Invoice: ${data.invoiceNumber}`, MARGIN + 90, y - footerHeight + 22, { size: 7, font: regular, color: COLORS.muted });
  drawText(page, "1. This is a computer generated tax invoice.", MARGIN + 90, y - footerHeight + 12, { size: 6.5, font: oblique, color: COLORS.muted });

  // Authorized Signatory on Right
  const sigX = MARGIN + CONTENT_WIDTH - 150;
  page.drawLine({
    start: { x: sigX, y: y - footerHeight + 30 },
    end: { x: sigX + 140, y: y - footerHeight + 30 },
    color: COLORS.border,
    thickness: 0.75,
  });
  drawCenteredText(page, "Authorized Signatory", sigX + 70, y - footerHeight + 18, bold, { size: 7.5, color: COLORS.primary });
  drawCenteredText(page, "For Bageshwari Tractors Pvt. Ltd.", sigX + 70, y - footerHeight + 8, regular, { size: 6.5, color: COLORS.muted });

  return pdf.save();
}
