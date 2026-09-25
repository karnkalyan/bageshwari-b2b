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
  generateBarcodeImage,
  generateQrImage,
} from "../helpers";

export interface PickListData {
  pickListNumber: string;
  orderNumber: string;
  warehouseName: string;
  assignedPickerName?: string | null;
  createdAt: Date | string;
  company: CompanyInfo;
  dealer: DealerInfo;
  items: LineItemDto[];
  notes?: string | null;
  paperSize?: PaperSize;
}

export async function renderPickListPdf(data: PickListData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold, oblique } = ctx;

  const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = getPageDimensions(data.paperSize);
  const isA5 = data.paperSize === "A5";
  const MARGIN = isA5 ? 20 : 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // 1. HEADER
  const bannerH = isA5 ? 52 : 60;
  drawBox(page, MARGIN, y - bannerH, CONTENT_WIDTH, bannerH, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, data.company.legalName || "BAGESHWARI TRACTORS", MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 14 : 18), {
    size: isA5 ? 10.5 : 12,
    font: bold,
    color: COLORS.primary,
  });
  drawText(page, `Warehouse: ${data.warehouseName || "Central Depot - Nepalgunj"}`, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 26 : 32), {
    size: isA5 ? 7.2 : 8.5,
    font: bold,
    color: COLORS.secondary,
    maxWidth: isA5 ? CONTENT_WIDTH * 0.55 : undefined,
  });
  drawText(page, `Assigned Picker: ${data.assignedPickerName || "General Staff"}`, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 38 : 46), {
    size: isA5 ? 6.8 : 8,
    font: regular,
    color: COLORS.secondary,
    maxWidth: isA5 ? CONTENT_WIDTH * 0.55 : undefined,
  });

  drawRightText(page, "WAREHOUSE PICK LIST", MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 14 : 18), bold, {
    size: isA5 ? 10.5 : 13,
    color: COLORS.primary,
  });
  const cleanPickListNo = (data.pickListNumber || "").replace(/--+/g, "-");
  drawRightText(page, `Pick List #: ${cleanPickListNo}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 26 : 32), bold, {
    size: isA5 ? 7.5 : 9,
    color: COLORS.primary,
  });
  const cleanOrderNo = (data.orderNumber || "").replace(/--+/g, "-");
  drawRightText(page, `Order #: ${cleanOrderNo}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 38 : 44), regular, {
    size: isA5 ? 7 : 8.5,
    color: COLORS.secondary,
  });

  y -= bannerH + (isA5 ? 8 : 10);

  // 2. DEALER DESTINATION & PICKING BARCODE
  const infoHeight = isA5 ? 48 : 55;
  drawBox(page, MARGIN, y - infoHeight, CONTENT_WIDTH, infoHeight, {
    color: COLORS.white,
    borderColor: COLORS.borderLight,
    borderWidth: 0.75,
  });

  drawText(page, "DESTINATION / DEALER:", MARGIN + 8, y - 13, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, `${data.dealer.tradingName || data.dealer.legalName} (${data.dealer.code})`, MARGIN + 8, y - 24, { size: isA5 ? 8 : 9, font: bold, color: COLORS.primary });
  drawText(page, `City: ${data.dealer.city || "Nepalgunj"}, ${data.dealer.district || "Banke"}`, MARGIN + 8, y - 35, { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary });

  const barcodeImg = await generateBarcodeImage(pdf, data.pickListNumber, { height: 10, scale: 2 });
  if (barcodeImg) {
    const barW = isA5 ? 110 : 140;
    page.drawImage(barcodeImg, {
      x: MARGIN + CONTENT_WIDTH - barW - 8,
      y: y - infoHeight + 8,
      width: barW,
      height: isA5 ? 24 : 30,
    });
  }

  y -= infoHeight + (isA5 ? 8 : 10);

  // 3. PICKING TABLE
  const colX = {
    sn: MARGIN,
    rack: MARGIN + (isA5 ? 18 : 22),
    bin: MARGIN + (isA5 ? 54 : 72),
    sku: MARGIN + (isA5 ? 90 : 125),
    name: MARGIN + (isA5 ? 155 : 215),
    reqQty: MARGIN + CONTENT_WIDTH - (isA5 ? 110 : 140),
    pickQty: MARGIN + CONTENT_WIDTH - (isA5 ? 55 : 75),
    chk: MARGIN + CONTENT_WIDTH,
  };

  const headerHeight = 18;
  drawBox(page, MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "S.N.", colX.sn + 3, y - 12, { size: isA5 ? 6.2 : 7, font: bold, color: COLORS.white });
  drawText(page, "Rack", colX.rack + 3, y - 12, { size: isA5 ? 6.2 : 7, font: bold, color: COLORS.white });
  drawText(page, "Bin", colX.bin + 3, y - 12, { size: isA5 ? 6.2 : 7, font: bold, color: COLORS.white });
  drawText(page, "SKU", colX.sku + 3, y - 12, { size: isA5 ? 6.2 : 7, font: bold, color: COLORS.white });
  drawText(page, "Part Name", colX.name + 3, y - 12, { size: isA5 ? 6.2 : 7, font: bold, color: COLORS.white });
  drawRightText(page, "Req", colX.pickQty - 6, y - 12, bold, { size: isA5 ? 6.2 : 7, color: COLORS.white });
  drawText(page, "Picked", colX.pickQty + 4, y - 12, { size: isA5 ? 6.2 : 7, font: bold, color: COLORS.white });
  drawCenteredText(page, "Done", colX.chk - (isA5 ? 10 : 15), y - 12, bold, { size: isA5 ? 6.2 : 7, color: COLORS.white });

  y -= headerHeight;

  const rowHeight = isA5 ? 19 : 22;
  let rowIndex = 0;
  let totalUnits = 0;

  for (const item of data.items) {
    if (y < (isA5 ? 100 : 120)) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN - 20;
    }

    const rowBg = rowIndex % 2 === 1 ? COLORS.bgLight : COLORS.white;
    drawBox(page, MARGIN, y - rowHeight, CONTENT_WIDTH, rowHeight, {
      color: rowBg,
      borderColor: COLORS.borderLight,
      borderWidth: 0.5,
    });

    totalUnits += item.quantity;

    drawText(page, String(item.sn || rowIndex + 1), colX.sn + 3, y - (isA5 ? 12 : 14), { size: isA5 ? 6.8 : 7.5, font: regular, color: COLORS.secondary });
    drawText(page, item.rackLocation || "R-01", colX.rack + 3, y - (isA5 ? 12 : 14), { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.primary });
    drawText(page, item.binLocation || "B-04", colX.bin + 3, y - (isA5 ? 12 : 14), { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.primary });
    drawText(page, item.sku.slice(0, 14), colX.sku + 3, y - (isA5 ? 12 : 14), { size: isA5 ? 6.8 : 7.5, font: bold, color: COLORS.black });
    drawText(page, item.description.slice(0, 36), colX.name + 3, y - (isA5 ? 12 : 14), { size: isA5 ? 6.8 : 7.5, font: regular, color: COLORS.black, maxWidth: isA5 ? 100 : 170 });
    drawRightText(page, `${item.quantity} ${item.unit || "PCS"}`, colX.pickQty - 6, y - (isA5 ? 12 : 14), bold, { size: isA5 ? 7 : 8, color: COLORS.primary });

    // Picked box (Blank for manual warehouse marker)
    drawBox(page, colX.pickQty + 4, y - (isA5 ? 15 : 17), isA5 ? 26 : 35, 12, { borderColor: COLORS.border, borderWidth: 0.75, color: COLORS.white });

    // Checkbox box
    drawBox(page, colX.chk - (isA5 ? 16 : 21), y - (isA5 ? 15 : 17), isA5 ? 10 : 12, isA5 ? 10 : 12, { borderColor: COLORS.primary, borderWidth: 1, color: COLORS.white });

    y -= rowHeight;
    rowIndex++;
  }

  y -= 8;

  // 4. TOTAL ITEMS & SUMMARY
  drawBox(page, MARGIN, y - 24, CONTENT_WIDTH, 24, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });
  drawText(page, `Total Line Items: ${data.items.length} SKUs`, MARGIN + 8, y - 16, { size: isA5 ? 7.5 : 8.5, font: bold, color: COLORS.primary });
  drawRightText(page, `Total Units: ${totalUnits} Units`, MARGIN + CONTENT_WIDTH - 8, y - 16, bold, { size: isA5 ? 7.8 : 9, color: COLORS.primary });

  y -= (isA5 ? 28 : 34);

  // 5. PICKER SIGN-OFF & DISPATCH VERIFICATION
  const signHeight = isA5 ? 58 : 70;
  drawBox(page, MARGIN, y - signHeight, CONTENT_WIDTH, signHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  const colWidth = CONTENT_WIDTH / 3;

  // Picker Sign
  page.drawLine({ start: { x: MARGIN + 12, y: y - signHeight + 22 }, end: { x: MARGIN + colWidth - 12, y: y - signHeight + 22 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Picker Signature", MARGIN + colWidth / 2, y - signHeight + 12, regular, { size: isA5 ? 6.5 : 7.5, color: COLORS.muted });

  // Checker Sign
  page.drawLine({ start: { x: MARGIN + colWidth + 12, y: y - signHeight + 22 }, end: { x: MARGIN + colWidth * 2 - 12, y: y - signHeight + 22 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "SKU Checker", MARGIN + colWidth * 1.5, y - signHeight + 12, regular, { size: isA5 ? 6.5 : 7.5, color: COLORS.muted });

  // Packing Station In-charge
  page.drawLine({ start: { x: MARGIN + colWidth * 2 + 12, y: y - signHeight + 22 }, end: { x: MARGIN + CONTENT_WIDTH - 12, y: y - signHeight + 22 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Packing Station Handover", MARGIN + colWidth * 2.5, y - signHeight + 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.primary });

  return pdf.save();
}
