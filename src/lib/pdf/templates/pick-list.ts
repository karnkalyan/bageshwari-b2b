import { CompanyInfo, DealerInfo, LineItemDto } from "../types";
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
}

export async function renderPickListPdf(data: PickListData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold, oblique } = ctx;

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // 1. HEADER
  drawBox(page, MARGIN, y - 60, CONTENT_WIDTH, 60, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, data.company.legalName || "BAGESHWARI TRACTORS PVT. LTD.", MARGIN + 12, y - 18, {
    size: 12,
    font: bold,
    color: COLORS.primary,
  });
  drawText(page, `Warehouse: ${data.warehouseName || "Central Fulfillment Depot - Nepalgunj"}`, MARGIN + 12, y - 32, {
    size: 8.5,
    font: bold,
    color: COLORS.secondary,
  });
  drawText(page, `Assigned Picker: ${data.assignedPickerName || "General Picking Staff"}`, MARGIN + 12, y - 46, {
    size: 8,
    font: regular,
    color: COLORS.secondary,
  });

  drawRightText(page, "WAREHOUSE PICK LIST", MARGIN + CONTENT_WIDTH - 12, y - 18, bold, {
    size: 13,
    color: COLORS.primary,
  });
  drawRightText(page, `Pick List #: ${data.pickListNumber}`, MARGIN + CONTENT_WIDTH - 12, y - 32, bold, {
    size: 9,
    color: COLORS.primary,
  });
  drawRightText(page, `Order #: ${data.orderNumber}`, MARGIN + CONTENT_WIDTH - 12, y - 44, regular, {
    size: 8.5,
    color: COLORS.secondary,
  });

  y -= 70;

  // 2. DEALER DESTINATION & PICKING BARCODE
  const infoHeight = 55;
  drawBox(page, MARGIN, y - infoHeight, CONTENT_WIDTH, infoHeight, {
    color: COLORS.white,
    borderColor: COLORS.borderLight,
    borderWidth: 0.75,
  });

  drawText(page, "DESTINATION / DEALER:", MARGIN + 8, y - 14, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, `${data.dealer.tradingName || data.dealer.legalName} (${data.dealer.code})`, MARGIN + 8, y - 26, { size: 9, font: bold, color: COLORS.primary });
  drawText(page, `Destination City: ${data.dealer.city || "Nepalgunj"}, ${data.dealer.district || "Banke"}`, MARGIN + 8, y - 38, { size: 8, font: regular, color: COLORS.secondary });

  const barcodeImg = await generateBarcodeImage(pdf, data.pickListNumber, { height: 10, scale: 2 });
  if (barcodeImg) {
    page.drawImage(barcodeImg, {
      x: MARGIN + CONTENT_WIDTH - 150,
      y: y - infoHeight + 12,
      width: 140,
      height: 30,
    });
  }

  y -= infoHeight + 10;

  // 3. PICKING TABLE
  const colX = {
    sn: MARGIN,
    rack: MARGIN + 22,
    bin: MARGIN + 72,
    sku: MARGIN + 125,
    name: MARGIN + 215,
    reqQty: MARGIN + 395,
    pickQty: MARGIN + 455,
    chk: MARGIN + CONTENT_WIDTH,
  };

  const headerHeight = 18;
  drawBox(page, MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "S.N.", colX.sn + 3, y - 12, { size: 7, font: bold, color: COLORS.white });
  drawText(page, "Rack", colX.rack + 3, y - 12, { size: 7, font: bold, color: COLORS.white });
  drawText(page, "Bin Loc", colX.bin + 3, y - 12, { size: 7, font: bold, color: COLORS.white });
  drawText(page, "SKU", colX.sku + 3, y - 12, { size: 7, font: bold, color: COLORS.white });
  drawText(page, "Product & Part Name", colX.name + 3, y - 12, { size: 7, font: bold, color: COLORS.white });
  drawRightText(page, "Approved", colX.reqQty + 45, y - 12, bold, { size: 7, color: COLORS.white });
  drawRightText(page, "Picked Qty", colX.pickQty + 45, y - 12, bold, { size: 7, color: COLORS.white });
  drawCenteredText(page, "Done", colX.chk - 15, y - 12, bold, { size: 7, color: COLORS.white });

  y -= headerHeight;

  const rowHeight = 22;
  let rowIndex = 0;
  let totalUnits = 0;

  for (const item of data.items) {
    if (y < 120) {
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

    drawText(page, String(item.sn || rowIndex + 1), colX.sn + 3, y - 14, { size: 7.5, font: regular, color: COLORS.secondary });
    drawText(page, item.rackLocation || "R-01", colX.rack + 3, y - 14, { size: 7.5, font: bold, color: COLORS.primary });
    drawText(page, item.binLocation || "B-04", colX.bin + 3, y - 14, { size: 7.5, font: bold, color: COLORS.primary });
    drawText(page, item.sku.slice(0, 14), colX.sku + 3, y - 14, { size: 7.5, font: bold, color: COLORS.black });
    drawText(page, item.description.slice(0, 36), colX.name + 3, y - 14, { size: 7.5, font: regular, color: COLORS.black, maxWidth: 170 });
    drawRightText(page, `${item.quantity} ${item.unit || "PCS"}`, colX.reqQty + 45, y - 14, bold, { size: 8, color: COLORS.primary });

    // Picked box (Blank for manual warehouse marker)
    drawBox(page, colX.pickQty + 8, y - 17, 35, 12, { borderColor: COLORS.border, borderWidth: 0.75, color: COLORS.white });

    // Checkbox box
    drawBox(page, colX.chk - 21, y - 17, 12, 12, { borderColor: COLORS.primary, borderWidth: 1, color: COLORS.white });

    y -= rowHeight;
    rowIndex++;
  }

  y -= 10;

  // 4. TOTAL ITEMS & SUMMARY
  drawBox(page, MARGIN, y - 24, CONTENT_WIDTH, 24, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });
  drawText(page, `Total Line Items: ${data.items.length} SKUs`, MARGIN + 12, y - 16, { size: 8.5, font: bold, color: COLORS.primary });
  drawRightText(page, `Total Units to Pick: ${totalUnits} Units`, MARGIN + CONTENT_WIDTH - 12, y - 16, bold, { size: 9, color: COLORS.primary });

  y -= 34;

  // 5. PICKER SIGN-OFF & DISPATCH VERIFICATION
  const signHeight = 70;
  drawBox(page, MARGIN, y - signHeight, CONTENT_WIDTH, signHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  const colWidth = CONTENT_WIDTH / 3;

  // Picker Sign
  page.drawLine({ start: { x: MARGIN + 20, y: y - signHeight + 25 }, end: { x: MARGIN + colWidth - 20, y: y - signHeight + 25 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Warehouse Picker Signature", MARGIN + colWidth / 2, y - signHeight + 14, regular, { size: 7.5, color: COLORS.muted });

  // Checker Sign
  page.drawLine({ start: { x: MARGIN + colWidth + 20, y: y - signHeight + 25 }, end: { x: MARGIN + colWidth * 2 - 20, y: y - signHeight + 25 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Quality / SKU Checker Signature", MARGIN + colWidth * 1.5, y - signHeight + 14, regular, { size: 7.5, color: COLORS.muted });

  // Packing Station In-charge
  page.drawLine({ start: { x: MARGIN + colWidth * 2 + 20, y: y - signHeight + 25 }, end: { x: MARGIN + CONTENT_WIDTH - 20, y: y - signHeight + 25 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Packing Station Handover Stamp", MARGIN + colWidth * 2.5, y - signHeight + 14, bold, { size: 7.5, color: COLORS.primary });

  return pdf.save();
}
