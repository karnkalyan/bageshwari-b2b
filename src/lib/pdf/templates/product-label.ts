import { PDFFont } from "pdf-lib";
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
  generateBarcodeImage,
  generateQrImage,
} from "../helpers";

export interface ProductLabelData {
  name: string;
  sku: string;
  barcode?: string | null;
  mrp: number;
  vatPercent?: number;
  mrpInclVat?: number;
  dealerPrice?: number;
  dealerPriceInclVat?: number;
  categoryName?: string | null;
  brandName?: string | null;
  unitCode?: string | null;
  origin?: string | null;
  companyName?: string | null;
  stickerSize?: "32x20" | "standard" | "a4_sheet" | "a5_sheet";
  paperSize?: PaperSize;
}

/**
 * Ensures text fits strictly within maxWidth by first reducing font size (down to minSize)
 * and then safely truncating with an ellipsis if it still exceeds the bound.
 */
function fitText(
  text: string,
  font: PDFFont,
  maxSize: number,
  maxWidth: number,
  minSize = 3.2
): { text: string; size: number } {
  let size = maxSize;
  let textWidth = font.widthOfTextAtSize(text, size);
  if (textWidth <= maxWidth) return { text, size };

  while (size > minSize) {
    size = Math.round((size - 0.2) * 10) / 10;
    textWidth = font.widthOfTextAtSize(text, size);
    if (textWidth <= maxWidth) return { text, size };
  }

  let truncated = text;
  while (truncated.length > 3 && font.widthOfTextAtSize(truncated + "...", minSize) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return { text: truncated.length < text.length ? truncated + "..." : truncated, size: minSize };
}

async function drawBarcodeStickerCell(
  page: any,
  pdf: any,
  fonts: { regular: PDFFont; bold: PDFFont },
  data: ProductLabelData,
  box: { x: number; y: number; width: number; height: number },
  mrpGross: number,
  vatRate: number,
  barcodeValue: string
) {
  const { regular, bold } = fonts;
  // Border
  drawBox(page, box.x, box.y, box.width, box.height, {
    borderColor: COLORS.border,
    borderWidth: 0.6,
    color: COLORS.white,
  });

  const pad = 4;
  const topY = box.y + box.height - pad;
  const w = box.width - pad * 2;

  // 1. Company Name Header
  const sellerTitle = (data.companyName || "BAGESHWARI TRACTOR, NEPALGUNJ").toUpperCase();
  const fittedSeller = fitText(sellerTitle, bold, 5.5, w);
  drawCenteredText(page, fittedSeller.text, box.x + box.width / 2, topY - 6, bold, {
    size: fittedSeller.size,
    color: COLORS.primary,
  });

  // 2. Product Name
  const fittedName = fitText(data.name, bold, 6.2, w);
  drawCenteredText(page, fittedName.text, box.x + box.width / 2, topY - 14, bold, {
    size: fittedName.size,
    color: COLORS.black,
  });

  // 3. SKU and MRP
  const skuText = `SKU: ${data.sku}`;
  const mrpText = `MRP: ${formatNpr(mrpGross)}`;
  drawText(page, skuText, box.x + pad + 2, topY - 24, {
    size: 5.5,
    font: bold,
    color: COLORS.primary,
  });
  drawRightText(page, mrpText, box.x + box.width - pad - 2, topY - 24, bold, {
    size: 6.2,
    color: COLORS.primary,
  });

  // 4. Barcode
  const barcodeHeight = Math.max(16, box.height * 0.28);
  const barcodeY = box.y + 16;
  const barcodeImg = await generateBarcodeImage(pdf, barcodeValue, { height: 12, scale: 2 });
  if (barcodeImg) {
    page.drawImage(barcodeImg, {
      x: box.x + pad + 6,
      y: barcodeY,
      width: w - 12,
      height: barcodeHeight,
    });
  }

  // 5. Barcode text & VAT
  const botText = `${barcodeValue} • (Incl. ${vatRate}% VAT)`;
  const fittedBot = fitText(botText, regular, 5.0, w);
  drawCenteredText(page, fittedBot.text, box.x + box.width / 2, box.y + 5, regular, {
    size: fittedBot.size,
    color: COLORS.secondary,
  });
}

export async function renderProductBarcodeLabelPdf(data: ProductLabelData, labelCount = 1): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold } = ctx;

  const barcodeValue = data.barcode || data.sku;
  const rawVat = data.vatPercent !== undefined ? Number(data.vatPercent) : 13;
  const vatRate = rawVat > 0 && rawVat <= 1.0 ? Number((rawVat * 100).toFixed(2)) : rawVat;
  // MRP is legally and standardly VAT-inclusive in Nepal; do not double-compound
  const mrpGross = data.mrpInclVat !== undefined ? data.mrpInclVat : data.mrp;

  const isSheet =
    data.paperSize === "A4" ||
    data.paperSize === "A5" ||
    data.paperSize === "Letter" ||
    data.paperSize === "Legal" ||
    data.stickerSize === "a4_sheet" ||
    data.stickerSize === "a5_sheet";

  if (isSheet) {
    const targetPaper = data.paperSize || (data.stickerSize === "a5_sheet" ? "A5" : "A4");
    const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = getPageDimensions(targetPaper);
    const isA5 = targetPaper === "A5";

    const cols = isA5 ? 2 : 3;
    const rows = isA5 ? 6 : (targetPaper === "Legal" ? 10 : 8);
    const stickersPerPage = cols * rows;

    const marginX = isA5 ? 14 : 16;
    const marginY = isA5 ? 16 : 20;
    const gutterX = 8;
    const gutterY = 8;

    const cellW = (PAGE_WIDTH - marginX * 2 - gutterX * (cols - 1)) / cols;
    const cellH = (PAGE_HEIGHT - marginY * 2 - gutterY * (rows - 1)) / rows;

    const totalToPrint = Math.max(1, labelCount);

    for (let offset = 0; offset < totalToPrint; offset += stickersPerPage) {
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const currentBatch = Math.min(stickersPerPage, totalToPrint - offset);

      for (let idx = 0; idx < currentBatch; idx++) {
        const col = idx % cols;
        const row = Math.floor(idx / cols);

        const cellX = marginX + col * (cellW + gutterX);
        const cellY = PAGE_HEIGHT - marginY - (row + 1) * cellH - row * gutterY;

        await drawBarcodeStickerCell(
          page,
          pdf,
          { regular, bold },
          data,
          { x: cellX, y: cellY, width: cellW, height: cellH },
          mrpGross,
          vatRate,
          barcodeValue
        );
      }
    }

    return pdf.save();
  }

  const isThermal32x20 = data.stickerSize === "32x20" || !data.stickerSize; // default to 32x20mm as requested
  const LABEL_WIDTH = isThermal32x20 ? 91 : 216; // 32mm = ~90.7pt, 3 inch = 216pt
  const LABEL_HEIGHT = isThermal32x20 ? 57 : 144; // 20mm = ~56.7pt, 2 inch = 144pt
  const MARGIN = isThermal32x20 ? 3 : 8;
  const CONTENT_WIDTH = LABEL_WIDTH - MARGIN * 2;

  for (let i = 0; i < Math.max(1, labelCount); i++) {
    const page = pdf.addPage([LABEL_WIDTH, LABEL_HEIGHT]);
    const y = LABEL_HEIGHT - MARGIN;

    if (isThermal32x20) {
      // 32mm x 20mm Micro Thermal Barcode Sticker
      drawBox(page, MARGIN, MARGIN, CONTENT_WIDTH, LABEL_HEIGHT - MARGIN * 2, {
        borderColor: COLORS.black,
        borderWidth: 0.5,
        color: COLORS.white,
      });

      // 1. Seller Name Header (Company Setup)
      const sellerTitle = (data.companyName || "BAGESHWARI TRACTOR, NEPALGUNJ").toUpperCase();
      const fittedSeller = fitText(sellerTitle, bold, 4.5, CONTENT_WIDTH - 2);
      drawCenteredText(page, fittedSeller.text, MARGIN + CONTENT_WIDTH / 2, y - 7, bold, {
        size: fittedSeller.size,
        color: COLORS.black,
      });

      // 2. Product Name
      const fittedName = fitText(data.name, bold, 4.5, CONTENT_WIDTH - 2);
      drawCenteredText(page, fittedName.text, MARGIN + CONTENT_WIDTH / 2, y - 13, bold, {
        size: fittedName.size,
        color: COLORS.black,
      });

      // 3. SKU & MRP Incl. VAT with guaranteed zero overlap
      const skuText = `SKU: ${data.sku}`;
      const mrpText = `MRP: ${formatNpr(mrpGross)}`;
      const targetSize = 3.8;
      const skuW = bold.widthOfTextAtSize(skuText, targetSize);
      const mrpW = bold.widthOfTextAtSize(mrpText, targetSize);
      const availableW = CONTENT_WIDTH - 4; // 81pt inside border

      if (skuW + mrpW + 5 <= availableW) {
        // Fits side-by-side with clear margin and no collision
        drawText(page, skuText, MARGIN + 2, y - 20, {
          size: targetSize,
          font: bold,
          color: COLORS.black,
        });
        drawRightText(page, mrpText, MARGIN + CONTENT_WIDTH - 2, y - 20, bold, {
          size: targetSize,
          color: COLORS.black,
        });

        // 4. Barcode
        const barcodeImg = await generateBarcodeImage(pdf, barcodeValue, { height: 10, scale: 1.8 });
        if (barcodeImg) {
          page.drawImage(barcodeImg, {
            x: MARGIN + 2,
            y: y - 41,
            width: CONTENT_WIDTH - 4,
            height: 19,
          });
        }

        // 5. Barcode Value & VAT Notice
        const botText = `${barcodeValue} • Incl. ${vatRate}% VAT`;
        const fittedBot = fitText(botText, regular, 3.8, CONTENT_WIDTH - 2);
        drawCenteredText(page, fittedBot.text, MARGIN + CONTENT_WIDTH / 2, y - 48, regular, {
          size: fittedBot.size,
          color: COLORS.black,
        });
      } else {
        // For extra long SKUs or large MRPs, stack gracefully to prevent any collision
        const fittedSku = fitText(skuText, bold, 4.0, CONTENT_WIDTH - 4);
        drawCenteredText(page, fittedSku.text, MARGIN + CONTENT_WIDTH / 2, y - 18, bold, {
          size: fittedSku.size,
          color: COLORS.black,
        });

        const fittedMrp = fitText(mrpText, bold, 4.5, CONTENT_WIDTH - 4);
        drawCenteredText(page, fittedMrp.text, MARGIN + CONTENT_WIDTH / 2, y - 24, bold, {
          size: fittedMrp.size,
          color: COLORS.black,
        });

        // 4. Barcode (compacted height to accommodate stacked text cleanly)
        const barcodeImg = await generateBarcodeImage(pdf, barcodeValue, { height: 8, scale: 1.8 });
        if (barcodeImg) {
          page.drawImage(barcodeImg, {
            x: MARGIN + 2,
            y: y - 42,
            width: CONTENT_WIDTH - 4,
            height: 15,
          });
        }

        // 5. Barcode Value & VAT Notice
        const botText = `${barcodeValue} • Incl. ${vatRate}% VAT`;
        const fittedBot = fitText(botText, regular, 3.6, CONTENT_WIDTH - 2);
        drawCenteredText(page, fittedBot.text, MARGIN + CONTENT_WIDTH / 2, y - 48, regular, {
          size: fittedBot.size,
          color: COLORS.black,
        });
      }
      continue;
    }

    // Outer border (Standard 3x2 inch)
    drawBox(page, MARGIN, MARGIN, CONTENT_WIDTH, LABEL_HEIGHT - MARGIN * 2, {
      borderColor: COLORS.primary,
      borderWidth: 1,
      color: COLORS.white,
    });

    // 1. Company / Brand Mini Header
    drawText(page, data.brandName || data.companyName || "BAGESHWARI TRACTOR, NEPALGUNJ", MARGIN + 6, y - 10, {
      size: 6.5,
      font: bold,
      color: COLORS.primary,
    });
    drawRightText(page, data.categoryName || "SPARE PART", MARGIN + CONTENT_WIDTH - 6, y - 10, bold, {
      size: 6,
      color: COLORS.danger,
    });

    // 2. Part Name
    drawText(page, data.name, MARGIN + 6, y - 21, {
      size: 8,
      font: bold,
      color: COLORS.black,
      maxWidth: CONTENT_WIDTH - 12,
    });

    // 3. SKU & Prominent Price with VAT Included
    const mrpText = `MRP: ${formatNpr(mrpGross)}`;
    const mrpWidth = bold.widthOfTextAtSize(mrpText, 8.5);
    const maxSkuWidth = Math.max(40, CONTENT_WIDTH - 12 - mrpWidth - 10);

    drawText(page, `SKU: ${data.sku}`, MARGIN + 6, y - 32, {
      size: 7.5,
      font: bold,
      color: COLORS.primary,
      maxWidth: maxSkuWidth,
    });
    
    // MRP (Incl. VAT) in bold
    drawRightText(page, mrpText, MARGIN + CONTENT_WIDTH - 6, y - 32, bold, {
      size: 8.5,
      color: COLORS.primary,
    });
    drawRightText(page, `(Incl. ${vatRate}% VAT)`, MARGIN + CONTENT_WIDTH - 6, y - 40, regular, {
      size: 5.5,
      color: COLORS.muted,
    });

    // 4. Barcode in center
    const barcodeImg = await generateBarcodeImage(pdf, barcodeValue, { height: 12, scale: 2 });
    if (barcodeImg) {
      page.drawImage(barcodeImg, {
        x: MARGIN + 6,
        y: y - 82,
        width: CONTENT_WIDTH - 45,
        height: 32,
      });
    }

    // 5. QR Code on right with VAT details
    const qrImg = await generateQrImage(pdf, `SKU:${data.sku}|MRP_INCL_VAT:${mrpGross.toFixed(2)}|VAT:${vatRate}%`, 36);
    if (qrImg) {
      page.drawImage(qrImg, {
        x: MARGIN + CONTENT_WIDTH - 38,
        y: y - 82,
        width: 34,
        height: 34,
      });
    }

    // 6. Bottom Barcode Text & Origin & Tax Info
    drawCenteredText(page, barcodeValue, MARGIN + (CONTENT_WIDTH - 45) / 2, y - 92, bold, {
      size: 6.5,
      color: COLORS.secondary,
    });

    // Bottom strip with Net Rate and Gross Rate
    const baseMrp = vatRate > 0 ? data.mrp / (1 + vatRate / 100) : data.mrp;
    drawText(page, `Base: ${formatNpr(baseMrp)} + ${vatRate}% VAT`, MARGIN + 6, y - 104, {
      size: 5.5,
      font: bold,
      color: COLORS.secondary,
    });
    drawRightText(page, `Unit: 1 ${data.unitCode || "PCS"} • Max Retail Price`, MARGIN + CONTENT_WIDTH - 6, y - 104, regular, {
      size: 5.5,
      color: COLORS.muted,
    });
  }

  return pdf.save();
}
