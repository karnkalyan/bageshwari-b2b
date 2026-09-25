import { PDFDocument, PDFPage, PDFFont, rgb } from "pdf-lib";
import { CompanyInfo, DealerInfo } from "../types";
import {
  COLORS,
  PaperSize,
  getPageDimensions,
  createPdfContext,
  drawText,
  drawRightText,
  drawCenteredText,
  drawBox,
  drawLine,
  formatFullAddress,
  generateBarcodeImage,
  generateQrImage,
} from "../helpers";

export interface PackageLabelData {
  packageNumber: string;
  cartonIndex: number;
  totalCartons: number;
  orderNumber: string;
  shipmentNumber?: string | null;
  challanNumber?: string | null;
  weight: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  packageType?: string | null;
  handlingInstructions?: string | null;
  company: CompanyInfo;
  dealer: DealerInfo;
  transporterName?: string | null;
  deliveryCity?: string | null;
  specialInstructions?: string | null;
  trackingUrl?: string;
}

export type CartonLabelLayout = "a4_4" | "a4_2" | "a4_1" | "thermal";

function drawCutGuideline(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label?: string,
  font?: PDFFont
) {
  const dash = 6;
  const gap = 4;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  const ux = dx / len;
  const uy = dy / len;
  let curr = 0;
  const cutColor = rgb(0.6, 0.65, 0.7);

  while (curr < len) {
    const segment = Math.min(dash, len - curr);
    page.drawLine({
      start: { x: x1 + ux * curr, y: y1 + uy * curr },
      end: { x: x1 + ux * (curr + segment), y: y1 + uy * (curr + segment) },
      thickness: 0.6,
      color: cutColor,
    });
    curr += dash + gap;
  }

  if (label && font) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    page.drawText(label, {
      x: midX - 16,
      y: midY + 2,
      size: 5.5,
      font,
      color: cutColor,
    });
  }
}

export async function drawPackageLabelToBox(
  page: PDFPage,
  pdf: PDFDocument,
  fonts: { regular: PDFFont; bold: PDFFont },
  data: PackageLabelData,
  box: { x: number; y: number; width: number; height: number }
): Promise<void> {
  const { regular, bold } = fonts;
  const pad = Math.min(8, box.width * 0.03);

  // Outer Border (Crisp solid black line)
  drawBox(page, box.x, box.y, box.width, box.height, {
    borderColor: COLORS.black,
    borderWidth: 1.2,
    color: COLORS.white,
  });

  const topY = box.y + box.height - pad;

  // 1. TOP SECTION: SENDER "FROM" & QR CODE
  const fromY = topY - 8;
  drawText(page, "FROM:", box.x + pad + 2, fromY, { size: 6.5, font: bold, color: COLORS.black });

  const companyName = (data.company.legalName || data.company.tradingName || "Bageshwari Tractors").toUpperCase();
  drawText(page, companyName, box.x + pad + 2, fromY - 9, {
    size: 7.8,
    font: bold,
    color: COLORS.black,
    maxWidth: box.width - 65,
  });

  const fromAddress = formatFullAddress(data.company.address, data.company.city, data.company.district, "Nepal");
  const phone = data.company.phone || "+977-81-520123";
  drawText(page, `${fromAddress} | Ph: ${phone}`, box.x + pad + 2, fromY - 18, {
    size: 6.2,
    font: regular,
    color: COLORS.black,
    maxWidth: box.width - 65,
  });

  // QR Code on top right
  const qrSize = Math.min(46, Math.max(34, box.width * 0.17));
  const qrImg = await generateQrImage(
    pdf,
    data.trackingUrl || `PKG:${data.packageNumber}|ORD:${data.orderNumber}|TO:${data.dealer.code}`,
    qrSize
  );
  if (qrImg) {
    page.drawImage(qrImg, {
      x: box.x + box.width - pad - qrSize - 2,
      y: topY - qrSize - 2,
      width: qrSize,
      height: qrSize,
    });
  }

  // Divider Line 1
  const div1Y = topY - 52;
  drawLine(page, box.x, div1Y, box.x + box.width, div1Y, { color: COLORS.black, thickness: 1.2 });

  // 2. SHIP TO (CONSIGNEE) SECTION
  const shipToY = div1Y - 9;
  drawText(page, "SHIP TO (CONSIGNEE):", box.x + pad + 2, shipToY, { size: 7.5, font: bold, color: COLORS.black });

  const consigneeName = data.dealer.tradingName || data.dealer.legalName;
  drawText(page, consigneeName, box.x + pad + 2, shipToY - 15, {
    size: 12.5,
    font: bold,
    color: COLORS.black,
    maxWidth: box.width - 16,
  });

  const dealerAddr = [data.dealer.addressLine1, data.dealer.city, data.dealer.district].filter(Boolean).join(", ") || "Nepalgunj, Banke";
  drawText(page, `Address: ${dealerAddr}`, box.x + pad + 2, shipToY - 28, {
    size: 7.2,
    font: bold,
    color: COLORS.black,
    maxWidth: box.width - 90,
  });

  drawRightText(page, `Phone: ${data.dealer.phone || "N/A"}`, box.x + box.width - pad - 4, shipToY - 28, bold, {
    size: 7.2,
    color: COLORS.black,
  });

  drawText(page, `Contact: ${data.dealer.contactName || "Authorized Dealer"}`, box.x + pad + 2, shipToY - 39, {
    size: 6.8,
    font: regular,
    color: COLORS.black,
    maxWidth: box.width - 90,
  });

  drawRightText(page, `Dealer Code: ${data.dealer.code}`, box.x + box.width - pad - 4, shipToY - 39, regular, {
    size: 6.8,
    color: COLORS.black,
  });

  // Divider Line 2
  const div2Y = div1Y - 54;
  drawLine(page, box.x, div2Y, box.x + box.width, div2Y, { color: COLORS.black, thickness: 1.2 });

  // 3. 2-COLUMN GRID: PACKAGE DETAILS | ORDER DETAILS
  const midX = box.x + Math.floor(box.width / 2);
  const gridY = div2Y - 10;

  // Left Column: Package Details
  drawText(page, "PACKAGE NUMBER:", box.x + pad + 2, gridY, { size: 6.5, font: bold, color: COLORS.black });
  drawText(page, data.packageNumber, box.x + pad + 2, gridY - 12, { size: 10.5, font: bold, color: COLORS.black });
  drawText(page, `Box ${data.cartonIndex || 1} of ${data.totalCartons || 1}`, box.x + pad + 2, gridY - 23, { size: 7.5, font: regular, color: COLORS.black });
  drawText(page, `GROSS WT: ${Number(data.weight).toFixed(2)} KG`, box.x + pad + 2, gridY - 34, { size: 7.5, font: bold, color: COLORS.black });
  const dimStr = data.length && data.width && data.height ? `${data.length}x${data.width}x${data.height} CM` : (data.packageType || "Standard Carton");
  drawText(page, `Dims: ${dimStr}`, box.x + pad + 2, gridY - 45, { size: 6.8, font: regular, color: COLORS.black });

  // Vertical Separator
  drawLine(page, midX, div2Y, midX, div2Y - 60, { color: COLORS.black, thickness: 1.2 });

  // Right Column: Order Details
  drawText(page, "ORDER #:", midX + pad, gridY, { size: 6.5, font: bold, color: COLORS.black });
  drawText(page, data.orderNumber, midX + pad, gridY - 12, { size: 10.5, font: bold, color: COLORS.black });
  drawText(page, `Challan: ${data.challanNumber || "Pending"}`, midX + pad, gridY - 23, { size: 7.5, font: bold, color: COLORS.black });
  drawText(page, "Carrier:", midX + pad, gridY - 34, { size: 6.8, font: regular, color: COLORS.black });
  drawText(page, data.transporterName || "Direct Transport / Courier", midX + pad, gridY - 45, {
    size: 6.8,
    font: regular,
    color: COLORS.black,
    maxWidth: Math.floor(box.width / 2) - 16,
  });

  // Divider Line 3
  const div3Y = div2Y - 60;
  drawLine(page, box.x, div3Y, box.x + box.width, div3Y, { color: COLORS.black, thickness: 1.2 });

  // 4. BOTTOM HANDLING BANNER
  const bannerH = 26;
  const bannerY = box.y;
  drawBox(page, box.x, bannerY, box.width, bannerH, {
    color: COLORS.black,
    borderColor: COLORS.black,
    borderWidth: 1,
  });

  drawCenteredText(page, "WARNING / HANDLING INSTRUCTIONS", box.x + box.width / 2, bannerY + bannerH - 10, bold, {
    size: 6.8,
    color: COLORS.white,
  });

  const instructions = (data.handlingInstructions || "FRAGILE - HANDLE WITH CARE | THIS SIDE UP ^ | KEEP DRY").toUpperCase();
  drawCenteredText(page, instructions, box.x + box.width / 2, bannerY + bannerH - 20, bold, {
    size: 5.8,
    color: COLORS.white,
  });

  // 5. LOGISTICS BARCODE (Between div3Y and bannerY)
  const barcodeAreaH = div3Y - (bannerY + bannerH);
  const barcodeH = 34;
  const barcodeW = Math.min(200, box.width - 24);
  const barcodeY = bannerY + bannerH + Math.max(10, Math.floor((barcodeAreaH - barcodeH - 14) / 2) + 12);

  const barcodeImg = await generateBarcodeImage(pdf, data.packageNumber, { height: 14, scale: 2 });
  if (barcodeImg) {
    page.drawImage(barcodeImg, {
      x: box.x + Math.floor((box.width - barcodeW) / 2),
      y: barcodeY,
      width: barcodeW,
      height: barcodeH,
    });
  }

  drawCenteredText(page, data.packageNumber, box.x + box.width / 2, barcodeY - 10, bold, {
    size: 9.5,
    color: COLORS.black,
  });
}

/**
 * Renders multiple carton labels onto printable sheets (2x2 grid, up to 4 labels per sheet)
 * with cutting guidelines or other adjustable layouts and paper sizes (A4, A5, Letter, Legal).
 */
export async function renderPackageLabelsPdf(
  packagesData: PackageLabelData[],
  layout: CartonLabelLayout = "a4_4",
  paperSize: PaperSize = "A4"
): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold } = ctx;

  const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = getPageDimensions(paperSize);

  const dataList = packagesData.length > 0 ? packagesData : [];
  if (dataList.length === 0) {
    pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    return pdf.save();
  }

  if (layout === "thermal") {
    // 100mm x 100mm thermal roll (single square page per carton)
    const THERMAL_SIZE = 283.46;
    for (const data of dataList) {
      const page = pdf.addPage([THERMAL_SIZE, THERMAL_SIZE]);
      await drawPackageLabelToBox(page, pdf, { regular, bold }, data, {
        x: 8,
        y: 8,
        width: THERMAL_SIZE - 16,
        height: THERMAL_SIZE - 16,
      });
    }
    return pdf.save();
  }

  if (layout === "a4_1") {
    // 1 carton label per page (Large / Full Page)
    for (const data of dataList) {
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const marginX = paperSize === "A5" ? 20 : 36;
      const marginY = paperSize === "A5" ? 24 : 40;
      await drawPackageLabelToBox(page, pdf, { regular, bold }, data, {
        x: marginX,
        y: marginY,
        width: PAGE_WIDTH - marginX * 2,
        height: PAGE_HEIGHT - marginY * 2,
      });
    }
    return pdf.save();
  }

  if (layout === "a4_2") {
    // 2 carton labels per page (Top & Bottom halves)
    const marginX = paperSize === "A5" ? 16 : 24;
    const marginY = paperSize === "A5" ? 16 : 24;
    const gutterY = paperSize === "A5" ? 10 : 16;
    const cellW = PAGE_WIDTH - marginX * 2;
    const cellH = (PAGE_HEIGHT - marginY * 2 - gutterY) / 2;

    const labelsPerPage = 2;
    for (let i = 0; i < dataList.length; i += labelsPerPage) {
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

      // Cut guideline in horizontal center
      drawCutGuideline(page, 10, PAGE_HEIGHT / 2, PAGE_WIDTH - 10, PAGE_HEIGHT / 2, "- - CUT HERE - -", regular);

      // Top label
      if (dataList[i]) {
        await drawPackageLabelToBox(page, pdf, { regular, bold }, dataList[i], {
          x: marginX,
          y: marginY + cellH + gutterY,
          width: cellW,
          height: cellH,
        });
      }

      // Bottom label
      if (dataList[i + 1]) {
        await drawPackageLabelToBox(page, pdf, { regular, bold }, dataList[i + 1], {
          x: marginX,
          y: marginY,
          width: cellW,
          height: cellH,
        });
      }
    }
    return pdf.save();
  }

  // DEFAULT: layout === "a4_4" (4 carton labels per page in 2x2 grid)
  const marginX = paperSize === "A5" ? 10 : 16;
  const marginY = paperSize === "A5" ? 12 : 18;
  const gutterX = paperSize === "A5" ? 8 : 14;
  const gutterY = paperSize === "A5" ? 10 : 16;
  const cellW = (PAGE_WIDTH - marginX * 2 - gutterX) / 2;
  const cellH = (PAGE_HEIGHT - marginY * 2 - gutterY) / 2;

  const labelsPerPage = 4;
  for (let i = 0; i < dataList.length; i += labelsPerPage) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Draw central cutting guidelines
    const centerX = PAGE_WIDTH / 2;
    const centerY = PAGE_HEIGHT / 2;
    drawCutGuideline(page, centerX, 10, centerX, PAGE_HEIGHT - 10, "- - CUT - -", regular);
    drawCutGuideline(page, 10, centerY, PAGE_WIDTH - 10, centerY, "- - CUT - -", regular);

    // Position 0: Top-Left (Row 0, Col 0)
    if (dataList[i]) {
      await drawPackageLabelToBox(page, pdf, { regular, bold }, dataList[i], {
        x: marginX,
        y: marginY + cellH + gutterY,
        width: cellW,
        height: cellH,
      });
    }

    // Position 1: Top-Right (Row 0, Col 1)
    if (dataList[i + 1]) {
      await drawPackageLabelToBox(page, pdf, { regular, bold }, dataList[i + 1], {
        x: marginX + cellW + gutterX,
        y: marginY + cellH + gutterY,
        width: cellW,
        height: cellH,
      });
    }

    // Position 2: Bottom-Left (Row 1, Col 0)
    if (dataList[i + 2]) {
      await drawPackageLabelToBox(page, pdf, { regular, bold }, dataList[i + 2], {
        x: marginX,
        y: marginY,
        width: cellW,
        height: cellH,
      });
    }

    // Position 3: Bottom-Right (Row 1, Col 1)
    if (dataList[i + 3]) {
      await drawPackageLabelToBox(page, pdf, { regular, bold }, dataList[i + 3], {
        x: marginX + cellW + gutterX,
        y: marginY,
        width: cellW,
        height: cellH,
      });
    }
  }

  return pdf.save();
}

/**
 * Backward compatible single label renderer - defaults to 4-up layout.
 */
export async function renderPackageLabelPdf(
  data: PackageLabelData,
  layout: CartonLabelLayout = "a4_4",
  paperSize: PaperSize = "A4"
): Promise<Uint8Array> {
  return renderPackageLabelsPdf([data], layout, paperSize);
}
