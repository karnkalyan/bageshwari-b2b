import { CompanyInfo, DealerInfo } from "../types";
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

export interface PackageDetailItemDto {
  sku: string;
  name: string;
  quantity: number;
  unit?: string;
}

export interface PackageBoxDto {
  packageNumber: string;
  boxIndex: number;
  totalBoxes: number;
  packageType: string;
  weight: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  handlingInstructions?: string | null;
  items?: PackageDetailItemDto[];
}

export interface PackingListData {
  packingListNumber: string;
  orderNumber: string;
  shipmentNumber?: string | null;
  challanNumber?: string | null;
  invoiceNumber?: string | null;
  packingDate: Date | string;
  company: CompanyInfo;
  dealer: DealerInfo;
  packages: PackageBoxDto[];
  totalCartons: number;
  totalWeight: number;
  warehouseName?: string;
  packedByName?: string;
  transporterName?: string;
  driverName?: string;
  vehicleNumber?: string;
  notes?: string | null;
}

export async function renderPackingListPdf(data: PackingListData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold, oblique } = ctx;

  const PAGE_WIDTH = 595.28; // A4
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // 1. Header Banner
  drawBox(page, MARGIN, y - 64, CONTENT_WIDTH, 64, {
    color: COLORS.bgLight,
    borderColor: COLORS.primary,
    borderWidth: 1,
  });

  drawText(page, (data.company.tradingName || data.company.legalName || "BAGESHWARI TRACTORS PVT. LTD.").toUpperCase(), MARGIN + 12, y - 18, {
    size: 13,
    font: bold,
    color: COLORS.primary,
  });

  drawText(
    page,
    `${data.company.address || "Main Highway Road"}, ${data.company.city || "Nepalgunj"}, Nepal | PAN: ${data.company.panNumber || "302918239"} | Ph: ${data.company.phone || "+977-81-520123"}`,
    MARGIN + 12,
    y - 32,
    { size: 7.5, font: regular, color: COLORS.secondary }
  );

  drawText(page, "CENTRAL WAREHOUSE FULFILLMENT & PACKAGING DEPARTMENT", MARGIN + 12, y - 46, {
    size: 7.5,
    font: bold,
    color: COLORS.primary,
  });

  drawText(page, `Warehouse: ${data.warehouseName || "Nepalgunj Distribution Center Hub"}`, MARGIN + 12, y - 57, {
    size: 7,
    font: oblique,
    color: COLORS.muted,
  });

  // Title on Right
  drawRightText(page, "PACKAGING LIST", MARGIN + CONTENT_WIDTH - 12, y - 20, bold, {
    size: 14,
    color: COLORS.primary,
  });
  drawRightText(page, "(CARTON MANIFEST & CONTENTS)", MARGIN + CONTENT_WIDTH - 12, y - 32, bold, {
    size: 7,
    color: COLORS.danger,
  });
  drawRightText(page, `Packing List #: ${data.packingListNumber}`, MARGIN + CONTENT_WIDTH - 12, y - 44, bold, {
    size: 8.5,
    color: COLORS.primary,
  });
  drawRightText(
    page,
    `Date: ${new Date(data.packingDate).toISOString().slice(0, 10)}`,
    MARGIN + CONTENT_WIDTH - 12,
    y - 56,
    regular,
    { size: 7.5, color: COLORS.secondary }
  );

  y -= 74;

  // 2. Metadata Information Block
  const infoHeight = 82;
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

  // Left: Consignee / Dealer
  const leftX = MARGIN + 8;
  drawText(page, "CONSIGNEE (DESTINATION DEALER)", leftX, y - 12, { size: 7, font: bold, color: COLORS.muted });
  drawText(page, data.dealer.tradingName || data.dealer.legalName, leftX, y - 24, { size: 9, font: bold, color: COLORS.primary });
  drawText(
    page,
    `Destination: ${data.dealer.addressLine1 || ""}, ${data.dealer.city || ""}, ${data.dealer.district || ""}`,
    leftX,
    y - 36,
    { size: 7.5, font: regular, color: COLORS.secondary, maxWidth: 240 }
  );
  drawText(page, `Dealer Code: ${data.dealer.code} | PAN/VAT: ${data.dealer.taxNumber}`, leftX, y - 48, {
    size: 7.5,
    font: regular,
    color: COLORS.secondary,
  });
  drawText(page, `Contact: ${data.dealer.contactName || "Proprietor"} (Ph: ${data.dealer.phone || "N/A"})`, leftX, y - 60, {
    size: 7.5,
    font: regular,
    color: COLORS.secondary,
  });
  drawText(page, `Order Ref: ${data.orderNumber} | Tax Invoice: ${data.invoiceNumber || "Enclosed"}`, leftX, y - 72, {
    size: 7.5,
    font: bold,
    color: COLORS.primary,
  });

  // Right: Logistics & Packaging Summary
  const rightColX = MARGIN + CONTENT_WIDTH / 2 + 8;
  drawText(page, "PACKAGING & DISPATCH SPECIFICATIONS", rightColX, y - 12, { size: 7, font: bold, color: COLORS.muted });
  drawText(page, `Carrier: ${data.transporterName || "Dedicated Logistics Transporter"}`, rightColX, y - 24, {
    size: 8.5,
    font: bold,
    color: COLORS.primary,
  });
  drawText(
    page,
    `Vehicle No: ${data.vehicleNumber || "N/A"} | Driver: ${data.driverName || "N/A"}`,
    rightColX,
    y - 36,
    { size: 8, font: bold, color: COLORS.danger }
  );
  drawText(page, `Challan Ref: ${data.challanNumber || data.shipmentNumber || "Enclosed"}`, rightColX, y - 48, {
    size: 7.5,
    font: regular,
    color: COLORS.secondary,
  });
  drawText(page, `Packed By: ${data.packedByName || "Lead Warehouse Specialist"}`, rightColX, y - 60, {
    size: 7.5,
    font: regular,
    color: COLORS.secondary,
  });
  drawText(
    page,
    `Total: ${data.totalCartons} Box(es) | Total Gross Weight: ${Number(data.totalWeight).toFixed(2)} KG`,
    rightColX,
    y - 72,
    { size: 8, font: bold, color: COLORS.primary }
  );

  y -= infoHeight + 12;

  // 3. Package Manifest Table
  const colX = {
    box: MARGIN,
    pkgNum: MARGIN + 60,
    typeDim: MARGIN + 160,
    weight: MARGIN + 280,
    contents: MARGIN + 350,
    check: MARGIN + CONTENT_WIDTH,
  };

  const headerH = 18;
  drawBox(page, MARGIN, y - headerH, CONTENT_WIDTH, headerH, {
    color: COLORS.bgHeader,
    borderColor: COLORS.primary,
    borderWidth: 0.75,
  });

  drawText(page, "BOX #", colX.box + 6, y - 12, { size: 7.5, font: bold, color: COLORS.primary });
  drawText(page, "CARTON NUMBER", colX.pkgNum + 6, y - 12, { size: 7.5, font: bold, color: COLORS.primary });
  drawText(page, "TYPE & DIMENSIONS", colX.typeDim + 6, y - 12, { size: 7.5, font: bold, color: COLORS.primary });
  drawRightText(page, "GROSS WT", colX.weight + 45, y - 12, bold, { size: 7.5, color: COLORS.primary });
  drawText(page, "PACKED ITEMS / CONTENTS", colX.contents + 6, y - 12, { size: 7.5, font: bold, color: COLORS.primary });
  drawRightText(page, "STATUS", colX.check - 6, y - 12, bold, { size: 7.5, color: COLORS.primary });

  y -= headerH;

  for (let i = 0; i < data.packages.length; i++) {
    const pkg = data.packages[i];
    const rowH = 26;

    if (y - rowH < MARGIN + 90) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN - 20;
    }

    drawBox(page, MARGIN, y - rowH, CONTENT_WIDTH, rowH, {
      color: i % 2 === 0 ? COLORS.white : COLORS.bgLight,
      borderColor: COLORS.borderLight,
      borderWidth: 0.5,
    });

    const dimStr = pkg.length && pkg.width && pkg.height
      ? `${pkg.length}×${pkg.width}×${pkg.height} cm`
      : "Standard Box";

    const itemsSummary = pkg.items && pkg.items.length > 0
      ? pkg.items.map((it) => `${it.sku} (${it.quantity} ${it.unit || "PCS"})`).join(", ")
      : pkg.handlingInstructions || "Assorted Spare Parts (Sealed)";

    drawText(page, `Box ${pkg.boxIndex || i + 1} of ${data.totalCartons}`, colX.box + 6, y - 16, {
      size: 7.5,
      font: bold,
      color: COLORS.primary,
    });
    drawText(page, pkg.packageNumber, colX.pkgNum + 6, y - 16, {
      size: 7.5,
      font: bold,
      color: COLORS.black,
    });
    drawText(page, `${pkg.packageType || "Carton"} (${dimStr})`, colX.typeDim + 6, y - 16, {
      size: 7,
      font: regular,
      color: COLORS.secondary,
    });
    drawRightText(page, `${Number(pkg.weight).toFixed(2)} KG`, colX.weight + 45, y - 16, bold, {
      size: 7.5,
      color: COLORS.primary,
    });
    drawText(page, itemsSummary, colX.contents + 6, y - 16, {
      size: 7,
      font: regular,
      color: COLORS.secondary,
      maxWidth: 130,
    });
    drawRightText(page, "[✓] SEALED", colX.check - 6, y - 16, bold, {
      size: 7,
      color: COLORS.success,
    });

    y -= rowH;
  }

  y -= 12;

  // 4. Consolidated Summary Box
  drawBox(page, MARGIN, y - 48, CONTENT_WIDTH, 48, {
    color: COLORS.bgLight,
    borderColor: COLORS.primary,
    borderWidth: 1,
  });

  drawText(page, "TOTAL SHIPMENT CONSOLIDATION SUMMARY", MARGIN + 12, y - 14, {
    size: 8,
    font: bold,
    color: COLORS.primary,
  });

  drawText(
    page,
    `Total Cartons: ${data.totalCartons} Box(es) | Total Gross Weight: ${Number(data.totalWeight).toFixed(2)} KG | Sealed with Security Tape`,
    MARGIN + 12,
    y - 27,
    { size: 7.5, font: bold, color: COLORS.black }
  );

  drawText(
    page,
    `Packed at: ${data.warehouseName || "Nepalgunj Central Distribution Center"} by ${data.packedByName || "Lead Warehouse Specialist"}`,
    MARGIN + 12,
    y - 39,
    { size: 7, font: regular, color: COLORS.muted }
  );

  // Barcode on Right of Summary Box
  const barcodeImg = await generateBarcodeImage(pdf, data.packingListNumber || data.orderNumber, { height: 12 });
  if (barcodeImg) {
    page.drawImage(barcodeImg, {
      x: MARGIN + CONTENT_WIDTH - 145,
      y: y - 42,
      width: 135,
      height: 30,
    });
  }

  y -= 60;

  // 5. Sign-off Authorization Blocks
  const sigColW = (CONTENT_WIDTH - 20) / 3;
  const sigY = MARGIN + 60;

  // Sign 1: Packed By
  drawBox(page, MARGIN, sigY - 45, sigColW, 45, { borderColor: COLORS.border, borderWidth: 0.75 });
  drawText(page, "PACKED & CHECKED BY:", MARGIN + 8, sigY - 12, { size: 6.5, font: bold, color: COLORS.muted });
  drawText(page, data.packedByName || "Warehouse Specialist", MARGIN + 8, sigY - 25, { size: 7.5, font: bold });
  drawText(page, "Sign: ___________________", MARGIN + 8, sigY - 37, { size: 6.5, color: COLORS.muted });

  // Sign 2: Transporter Handover
  drawBox(page, MARGIN + sigColW + 10, sigY - 45, sigColW, 45, { borderColor: COLORS.border, borderWidth: 0.75 });
  drawText(page, "CARRIER DRIVER SIGNATURE:", MARGIN + sigColW + 18, sigY - 12, {
    size: 6.5,
    font: bold,
    color: COLORS.muted,
  });
  drawText(page, data.driverName || data.transporterName || "Cargo Driver", MARGIN + sigColW + 18, sigY - 25, {
    size: 7.5,
    font: bold,
  });
  drawText(page, "Sign & Date: _____________", MARGIN + sigColW + 18, sigY - 37, { size: 6.5, color: COLORS.muted });

  // Sign 3: Dealer Consignee Receipt
  drawBox(page, MARGIN + (sigColW + 10) * 2, sigY - 45, sigColW, 45, { borderColor: COLORS.border, borderWidth: 0.75 });
  drawText(page, "RECEIVED IN FULL BY DEALER:", MARGIN + (sigColW + 10) * 2 + 8, sigY - 12, {
    size: 6.5,
    font: bold,
    color: COLORS.muted,
  });
  drawText(page, "Authorized Receiver", MARGIN + (sigColW + 10) * 2 + 8, sigY - 25, { size: 7.5, font: bold });
  drawText(page, "Sign & Stamp: ____________", MARGIN + (sigColW + 10) * 2 + 8, sigY - 37, {
    size: 6.5,
    color: COLORS.muted,
  });

  // Footer Note
  drawCenteredText(
    page,
    `Official Packaging Manifest for Order ${data.orderNumber} - Must accompany shipment. Generated on ${new Date().toISOString().slice(0, 10)}`,
    PAGE_WIDTH / 2,
    MARGIN + 4,
    regular,
    { size: 6.5, color: COLORS.muted }
  );

  return pdf.save();
}
