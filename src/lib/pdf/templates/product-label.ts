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
  stickerSize?: "32x20" | "standard";
}

export async function renderProductBarcodeLabelPdf(data: ProductLabelData, labelCount = 1): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const { pdf, regular, bold } = ctx;

  const isThermal32x20 = data.stickerSize === "32x20" || !data.stickerSize; // default to 32x20mm as requested
  const LABEL_WIDTH = isThermal32x20 ? 91 : 216; // 32mm = ~90.7pt, 3 inch = 216pt
  const LABEL_HEIGHT = isThermal32x20 ? 57 : 144; // 20mm = ~56.7pt, 2 inch = 144pt
  const MARGIN = isThermal32x20 ? 3 : 8;
  const CONTENT_WIDTH = LABEL_WIDTH - MARGIN * 2;

  const barcodeValue = data.barcode || data.sku;
  const rawVat = data.vatPercent !== undefined ? Number(data.vatPercent) : 13;
  const vatRate = rawVat > 0 && rawVat <= 1.0 ? Number((rawVat * 100).toFixed(2)) : rawVat;
  const mrpGross = data.mrpInclVat || (data.mrp * (1 + vatRate / 100));

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
      drawCenteredText(page, sellerTitle, MARGIN + CONTENT_WIDTH / 2, y - 7, bold, {
        size: 4.5,
        color: COLORS.black,
      });

      // 2. Product Name
      drawCenteredText(page, data.name, MARGIN + CONTENT_WIDTH / 2, y - 13, bold, {
        size: 4.5,
        color: COLORS.black,
      });

      // 3. SKU & MRP Incl. VAT
      drawText(page, `SKU: ${data.sku}`, MARGIN + 2, y - 20, {
        size: 4.5,
        font: bold,
        color: COLORS.black,
      });
      drawRightText(page, `MRP: ${formatNpr(mrpGross)}`, MARGIN + CONTENT_WIDTH - 2, y - 20, bold, {
        size: 5,
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
      drawCenteredText(page, `${barcodeValue} • Incl. ${vatRate}% VAT`, MARGIN + CONTENT_WIDTH / 2, y - 48, regular, {
        size: 3.8,
        color: COLORS.black,
      });
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
    drawText(page, `SKU: ${data.sku}`, MARGIN + 6, y - 32, {
      size: 7.5,
      font: bold,
      color: COLORS.primary,
    });
    
    // MRP (Incl. VAT) in bold
    drawRightText(page, `MRP: ${formatNpr(mrpGross)}`, MARGIN + CONTENT_WIDTH - 6, y - 32, bold, {
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
    drawText(page, `Base: ${formatNpr(data.mrp)} + ${vatRate}% VAT`, MARGIN + 6, y - 104, {
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
