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

export interface PackageManifestDto {
  packageNumber: string;
  packageType?: string | null;
  weight: number;
  description?: string | null;
}

export interface DispatchChallanData {
  challanNumber: string;
  shipmentNumber: string;
  dispatchDate: Date | string;
  orderNumber: string;
  invoiceNumber?: string | null;
  company: CompanyInfo;
  dealer: DealerInfo;
  transporterName: string;
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleNumber?: string | null;
  trackingNumber?: string | null;
  totalCartons: number;
  totalWeight: number;
  packages: PackageManifestDto[];
  remarks?: string | null;
  verificationUrl?: string;
}

export async function renderDispatchChallanPdf(data: DispatchChallanData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold, oblique } = ctx;

  const PAGE_WIDTH = 595.28;
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
  drawText(page, `Ph: ${data.company.phone || "+977-81-520123"} | PAN: ${data.company.panNumber || "302918239"}`, MARGIN + 12, y - 44, {
    size: 8,
    font: regular,
    color: COLORS.secondary,
  });
  drawText(page, "Logistics & Transport Dispatch Department", MARGIN + 12, y - 56, {
    size: 8,
    font: bold,
    color: COLORS.primary,
  });

  // Challan Info (Right)
  drawRightText(page, "DELIVERY CHALLAN", MARGIN + CONTENT_WIDTH - 12, y - 20, bold, {
    size: 13,
    color: COLORS.primary,
  });
  drawRightText(page, "(DISPATCH & GOODS TRANSPORT NOTE)", MARGIN + CONTENT_WIDTH - 12, y - 32, bold, {
    size: 7,
    color: COLORS.danger,
  });
  drawRightText(page, `Challan #: ${data.challanNumber}`, MARGIN + CONTENT_WIDTH - 12, y - 44, bold, {
    size: 9,
    color: COLORS.primary,
  });
  drawRightText(page, `Date: ${new Date(data.dispatchDate).toISOString().slice(0, 10)}`, MARGIN + CONTENT_WIDTH - 12, y - 56, regular, {
    size: 8,
    color: COLORS.secondary,
  });

  y -= 74;

  // 2. TRANSPORTER & CARRIER BOX + CONSIGNEE BOX
  const infoHeight = 84;
  drawBox(page, MARGIN, y - infoHeight, CONTENT_WIDTH, infoHeight, {
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  page.drawLine({
    start: { x: MARGIN + CONTENT_WIDTH / 2, y },
    end: { x: MARGIN + CONTENT_WIDTH / 2, y: y - infoHeight },
    color: COLORS.borderLight,
    thickness: 0.75,
  });

  // Consignee (Left)
  const leftX = MARGIN + 8;
  drawText(page, "CONSIGNEE (DESTINATION DEALER)", leftX, y - 13, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, data.dealer.tradingName || data.dealer.legalName, leftX, y - 26, { size: 9.5, font: bold, color: COLORS.primary });
  drawText(page, `Delivery Address: ${data.dealer.addressLine1 || ""}, ${data.dealer.city || ""}, ${data.dealer.district || ""}`, leftX, y - 38, { size: 8, font: regular, color: COLORS.secondary, maxWidth: 240 });
  drawText(page, `Contact Person: ${data.dealer.contactName || "Authorized Dealer"} (Ph: ${data.dealer.phone || "N/A"})`, leftX, y - 50, { size: 8, font: regular, color: COLORS.secondary });
  drawText(page, `Order Ref: ${data.orderNumber} | Invoice: ${data.invoiceNumber || "Enclosed"}`, leftX, y - 64, { size: 8, font: bold, color: COLORS.primary });

  // Transport Details (Right)
  const rightColX = MARGIN + CONTENT_WIDTH / 2 + 8;
  drawText(page, "TRANSPORT & VEHICLE DETAILS", rightColX, y - 13, { size: 7.5, font: bold, color: COLORS.muted });
  drawText(page, `Carrier: ${data.transporterName || "Dedicated Cargo Carrier"}`, rightColX, y - 26, { size: 9, font: bold, color: COLORS.primary });
  drawText(page, `Vehicle Registration #: ${data.vehicleNumber || "N/A"}`, rightColX, y - 38, { size: 8.5, font: bold, color: COLORS.danger });
  drawText(page, `Driver Name: ${data.driverName || "N/A"} (Mobile: ${data.driverPhone || "N/A"})`, rightColX, y - 50, { size: 8, font: regular, color: COLORS.secondary });
  drawText(page, `Tracking / LR Number: ${data.trackingNumber || data.shipmentNumber}`, rightColX, y - 64, { size: 8, font: bold, color: COLORS.primary });

  y -= infoHeight + 10;

  // 3. PACKAGES MANIFEST TABLE
  const colX = {
    sn: MARGIN,
    pkg: MARGIN + 28,
    type: MARGIN + 145,
    wt: MARGIN + 290,
    desc: MARGIN + 375,
    chk: MARGIN + CONTENT_WIDTH,
  };

  const headerHeight = 18;
  drawBox(page, MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "S.N.", colX.sn + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawText(page, "Package Number", colX.pkg + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawText(page, "Package Type / Dimensions", colX.type + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawRightText(page, "Weight (KG)", colX.wt + 60, y - 12, bold, { size: 7.5, color: COLORS.white });
  drawText(page, "Contents Summary", colX.desc + 4, y - 12, { size: 7.5, font: bold, color: COLORS.white });
  drawCenteredText(page, "Verified", colX.chk - 20, y - 12, bold, { size: 7.5, color: COLORS.white });

  y -= headerHeight;

  const rowHeight = 20;
  let rowIndex = 0;
  for (const pkg of data.packages) {
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

    drawText(page, String(rowIndex + 1), colX.sn + 4, y - 13, { size: 7.5, font: regular, color: COLORS.secondary });
    drawText(page, pkg.packageNumber, colX.pkg + 4, y - 13, { size: 8, font: bold, color: COLORS.primary });
    drawText(page, pkg.packageType || "Standard Heavy Carton", colX.type + 4, y - 13, { size: 7.5, font: regular, color: COLORS.secondary });
    drawRightText(page, `${Number(pkg.weight).toFixed(2)} KG`, colX.wt + 60, y - 13, bold, { size: 8, color: COLORS.primary });
    drawText(page, pkg.description || "Tractor Spares / Implements", colX.desc + 4, y - 13, { size: 7.5, font: regular, color: COLORS.black, maxWidth: 120 });
    drawBox(page, colX.chk - 26, y - 16, 12, 12, { borderColor: COLORS.primary, borderWidth: 1, color: COLORS.white });

    y -= rowHeight;
    rowIndex++;
  }

  y -= 10;

  // 4. TOTAL MANIFEST SUMMARY
  drawBox(page, MARGIN, y - 26, CONTENT_WIDTH, 26, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, `Total Cartons Dispatched: ${data.totalCartons || data.packages.length} Cartons`, MARGIN + 12, y - 17, { size: 9, font: bold, color: COLORS.primary });
  drawRightText(page, `Total Shipment Gross Weight: ${Number(data.totalWeight).toFixed(2)} KG`, MARGIN + CONTENT_WIDTH - 12, y - 17, bold, { size: 9, color: COLORS.danger });

  y -= 36;

  // 5. SIGNATORY BLOCKS (Dispatcher, Driver, Consignee)
  const signHeight = 85;
  drawBox(page, MARGIN, y - signHeight, CONTENT_WIDTH, signHeight, {
    color: COLORS.white,
    borderColor: COLORS.borderLight,
    borderWidth: 0.75,
  });

  const colWidth = CONTENT_WIDTH / 3;

  // 1. Warehouse Dispatcher
  page.drawLine({ start: { x: MARGIN + 15, y: y - signHeight + 30 }, end: { x: MARGIN + colWidth - 15, y: y - signHeight + 30 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Warehouse Dispatcher Signature", MARGIN + colWidth / 2, y - signHeight + 18, bold, { size: 7.5, color: COLORS.primary });
  drawCenteredText(page, "Bageshwari Tractors Logistics", MARGIN + colWidth / 2, y - signHeight + 8, regular, { size: 6.5, color: COLORS.muted });

  // 2. Transport Driver Sign
  page.drawLine({ start: { x: MARGIN + colWidth + 15, y: y - signHeight + 30 }, end: { x: MARGIN + colWidth * 2 - 15, y: y - signHeight + 30 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Transport Driver Signature", MARGIN + colWidth * 1.5, y - signHeight + 18, bold, { size: 7.5, color: COLORS.primary });
  drawCenteredText(page, "Received in sound condition", MARGIN + colWidth * 1.5, y - signHeight + 8, regular, { size: 6.5, color: COLORS.muted });

  // 3. Consignee Receiving
  page.drawLine({ start: { x: MARGIN + colWidth * 2 + 15, y: y - signHeight + 30 }, end: { x: MARGIN + CONTENT_WIDTH - 15, y: y - signHeight + 30 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Consignee Receiving Signature", MARGIN + colWidth * 2.5, y - signHeight + 18, bold, { size: 7.5, color: COLORS.primary });
  drawCenteredText(page, "Rubber Stamp & Date of Receipt", MARGIN + colWidth * 2.5, y - signHeight + 8, regular, { size: 6.5, color: COLORS.muted });

  return pdf.save();
}
