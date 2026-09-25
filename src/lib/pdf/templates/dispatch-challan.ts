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
  formatFullAddress,
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
  shipmentNumber?: string | null;
  dispatchDate: Date | string;
  orderNumber: string;
  invoiceNumber?: string | null;
  transporterName?: string | null;
  transportCompanyName?: string | null;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  trackingNumber?: string | null;
  company: CompanyInfo;
  dealer: DealerInfo;
  packages: PackageManifestDto[];
  items: LineItemDto[];
  totalCartons?: number;
  totalPackages?: number;
  totalWeight?: number;
  remarks?: string | null;
  verificationUrl?: string | null;
  paperSize?: PaperSize;
}

export async function renderDispatchChallanPdf(data: DispatchChallanData): Promise<Uint8Array> {
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
  drawText(page, `Ph: ${data.company.phone || "+977-81-520123"} | PAN: ${data.company.panNumber || data.company.vatNumber || "302918239"}`, MARGIN + (isA5 ? 8 : 12), y - (isA5 ? 36 : 44), {
    size: isA5 ? 6.8 : 8,
    font: regular,
    color: COLORS.secondary,
    maxWidth: isA5 ? CONTENT_WIDTH * 0.55 : undefined,
  });
  if (!isA5) {
    drawText(page, "Logistics & Transport Dispatch Department", MARGIN + 12, y - 56, {
      size: 8,
      font: bold,
      color: COLORS.primary,
    });
  }

  // Challan Info (Right)
  drawRightText(page, "DELIVERY CHALLAN", MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 16 : 20), bold, {
    size: isA5 ? 10.5 : 13,
    color: COLORS.primary,
  });
  drawRightText(page, "(DISPATCH & GOODS NOTE)", MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 26 : 32), bold, {
    size: isA5 ? 6 : 7,
    color: COLORS.danger,
  });
  const cleanChallanNumber = (data.challanNumber || "").replace(/--+/g, "-");
  drawRightText(page, `Challan #: ${cleanChallanNumber}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 36 : 44), bold, {
    size: isA5 ? 7.5 : 9,
    color: COLORS.primary,
  });
  drawRightText(page, `Date: ${new Date(data.dispatchDate).toISOString().slice(0, 10)}`, MARGIN + CONTENT_WIDTH - (isA5 ? 8 : 12), y - (isA5 ? 46 : 56), regular, {
    size: isA5 ? 6.8 : 8,
    color: COLORS.secondary,
  });

  y -= bannerH + (isA5 ? 8 : 10);

  // 2. TRANSPORTER & CARRIER BOX + CONSIGNEE BOX
  const infoHeight = isA5 ? 74 : 84;
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
  const leftX = MARGIN + 6;
  const colHalfW = CONTENT_WIDTH / 2 - 12;
  drawText(page, "CONSIGNEE (DESTINATION DEALER)", leftX, y - (isA5 ? 11 : 13), { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, data.dealer.tradingName || data.dealer.legalName, leftX, y - (isA5 ? 22 : 26), { size: isA5 ? 8 : 9.5, font: bold, color: COLORS.primary, maxWidth: colHalfW });
  drawText(page, `Delivery Address: ${data.dealer.addressLine1 || ""}, ${data.dealer.city || ""}, ${data.dealer.district || ""}`, leftX, y - (isA5 ? 33 : 38), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });
  drawText(page, `Contact: ${data.dealer.contactName || "Authorized Dealer"} (Ph: ${data.dealer.phone || "N/A"})`, leftX, y - (isA5 ? 44 : 50), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });
  drawText(page, `Order Ref: ${data.orderNumber} | Inv: ${data.invoiceNumber || "Enclosed"}`, leftX, y - (isA5 ? 56 : 64), { size: isA5 ? 6.8 : 8, font: bold, color: COLORS.primary, maxWidth: colHalfW });

  // Transport Details (Right)
  const rightColX = MARGIN + CONTENT_WIDTH / 2 + 6;
  drawText(page, "TRANSPORT & VEHICLE DETAILS", rightColX, y - (isA5 ? 11 : 13), { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.muted });
  drawText(page, `Carrier: ${data.transporterName || "Dedicated Cargo Carrier"}`, rightColX, y - (isA5 ? 22 : 26), { size: isA5 ? 7.5 : 9, font: bold, color: COLORS.primary, maxWidth: colHalfW });
  drawText(page, `Vehicle #: ${data.vehicleNumber || "N/A"}`, rightColX, y - (isA5 ? 33 : 38), { size: isA5 ? 7.2 : 8.5, font: bold, color: COLORS.danger, maxWidth: colHalfW });
  drawText(page, `Driver: ${data.driverName || "N/A"} (Mob: ${data.driverPhone || "N/A"})`, rightColX, y - (isA5 ? 44 : 50), { size: isA5 ? 6.8 : 8, font: regular, color: COLORS.secondary, maxWidth: colHalfW });
  drawText(page, `Tracking / LR: ${data.trackingNumber || data.shipmentNumber || "N/A"}`, rightColX, y - (isA5 ? 56 : 64), { size: isA5 ? 6.8 : 8, font: bold, color: COLORS.primary, maxWidth: colHalfW });

  y -= infoHeight + (isA5 ? 8 : 10);

  // 3. PACKAGES MANIFEST TABLE
  const colX = {
    sn: MARGIN,
    pkg: MARGIN + (isA5 ? 20 : 28),
    type: MARGIN + (isA5 ? 110 : 145),
    wt: MARGIN + CONTENT_WIDTH - (isA5 ? 140 : 190),
    desc: MARGIN + CONTENT_WIDTH - (isA5 ? 85 : 125),
    chk: MARGIN + CONTENT_WIDTH,
  };

  const headerHeight = 18;
  drawBox(page, MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight, {
    color: COLORS.primary,
    borderColor: COLORS.primary,
  });

  drawText(page, "S.N.", colX.sn + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawText(page, "Package Number", colX.pkg + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawText(page, "Package Type / Dimensions", colX.type + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawRightText(page, "Weight (KG)", colX.desc - 6, y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });
  drawText(page, "Contents", colX.desc + 3, y - 12, { size: isA5 ? 6.5 : 7.5, font: bold, color: COLORS.white });
  drawCenteredText(page, "Check", colX.chk - (isA5 ? 14 : 18), y - 12, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.white });

  y -= headerHeight;

  const rowHeight = isA5 ? 18 : 20;
  let rowIndex = 0;
  for (const pkg of data.packages) {
    if (y < (isA5 ? 120 : 160)) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN - 20;
    }

    const rowBg = rowIndex % 2 === 1 ? COLORS.bgLight : COLORS.white;
    drawBox(page, MARGIN, y - rowHeight, CONTENT_WIDTH, rowHeight, {
      color: rowBg,
      borderColor: COLORS.borderLight,
      borderWidth: 0.5,
    });

    drawText(page, String(rowIndex + 1), colX.sn + 3, y - (isA5 ? 12 : 13), { size: isA5 ? 6.8 : 7.5, font: regular, color: COLORS.secondary });
    drawText(page, pkg.packageNumber, colX.pkg + 3, y - (isA5 ? 12 : 13), { size: isA5 ? 7.2 : 8, font: bold, color: COLORS.primary });
    drawText(page, pkg.packageType || "Standard Heavy Carton", colX.type + 3, y - (isA5 ? 12 : 13), { size: isA5 ? 6.8 : 7.5, font: regular, color: COLORS.secondary, maxWidth: isA5 ? 75 : 130 });
    drawRightText(page, `${Number(pkg.weight).toFixed(2)} KG`, colX.desc - 6, y - (isA5 ? 12 : 13), bold, { size: isA5 ? 7.2 : 8, color: COLORS.primary });
    drawText(page, pkg.description || "Tractor Spares / Implements", colX.desc + 3, y - (isA5 ? 12 : 13), { size: isA5 ? 6.8 : 7.5, font: regular, color: COLORS.black, maxWidth: isA5 ? 55 : 100 });
    drawBox(page, colX.chk - (isA5 ? 20 : 24), y - (isA5 ? 14 : 16), isA5 ? 10 : 12, isA5 ? 10 : 12, { borderColor: COLORS.primary, borderWidth: 1, color: COLORS.white });

    y -= rowHeight;
    rowIndex++;
  }

  y -= 8;

  // 4. TOTAL MANIFEST SUMMARY
  drawBox(page, MARGIN, y - 24, CONTENT_WIDTH, 24, {
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  drawText(page, `Total Cartons Dispatched: ${data.totalCartons || data.packages.length} Cartons`, MARGIN + 8, y - 16, { size: isA5 ? 7.8 : 9, font: bold, color: COLORS.primary });
  drawRightText(page, `Shipment Gross Weight: ${Number(data.totalWeight).toFixed(2)} KG`, MARGIN + CONTENT_WIDTH - 8, y - 16, bold, { size: isA5 ? 7.8 : 9, color: COLORS.danger });

  y -= (isA5 ? 28 : 34);

  // 5. SIGNATORY BLOCKS (Dispatcher, Driver, Consignee)
  const signHeight = isA5 ? 64 : 82;
  drawBox(page, MARGIN, y - signHeight, CONTENT_WIDTH, signHeight, {
    color: COLORS.white,
    borderColor: COLORS.borderLight,
    borderWidth: 0.75,
  });

  const colWidth = CONTENT_WIDTH / 3;

  // 1. Warehouse Dispatcher
  page.drawLine({ start: { x: MARGIN + 10, y: y - signHeight + 24 }, end: { x: MARGIN + colWidth - 10, y: y - signHeight + 24 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Dispatcher Signature", MARGIN + colWidth / 2, y - signHeight + 14, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.primary });
  drawCenteredText(page, `${data.company.tradingName || data.company.legalName || "Company"} Logistics`, MARGIN + colWidth / 2, y - signHeight + 6, regular, { size: isA5 ? 5.5 : 6.5, color: COLORS.muted });

  // 2. Transport Driver Sign
  page.drawLine({ start: { x: MARGIN + colWidth + 10, y: y - signHeight + 24 }, end: { x: MARGIN + colWidth * 2 - 10, y: y - signHeight + 24 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Driver Signature", MARGIN + colWidth * 1.5, y - signHeight + 14, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.primary });
  drawCenteredText(page, "Received in good condition", MARGIN + colWidth * 1.5, y - signHeight + 6, regular, { size: isA5 ? 5.5 : 6.5, color: COLORS.muted });

  // 3. Consignee Receiving
  page.drawLine({ start: { x: MARGIN + colWidth * 2 + 10, y: y - signHeight + 24 }, end: { x: MARGIN + CONTENT_WIDTH - 10, y: y - signHeight + 24 }, color: COLORS.border, thickness: 0.75 });
  drawCenteredText(page, "Consignee Signature", MARGIN + colWidth * 2.5, y - signHeight + 14, bold, { size: isA5 ? 6.5 : 7.5, color: COLORS.primary });
  drawCenteredText(page, "Rubber Stamp & Date", MARGIN + colWidth * 2.5, y - signHeight + 6, regular, { size: isA5 ? 5.5 : 6.5, color: COLORS.muted });

  return pdf.save();
}
