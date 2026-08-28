import bwipjs from "bwip-js";
import QRCode from "qrcode";
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb, RGB } from "pdf-lib";

export const COLORS = {
  primary: rgb(0.035, 0.184, 0.36), // #092f5c
  primaryDark: rgb(0.02, 0.12, 0.24),
  secondary: rgb(0.278, 0.333, 0.412), // #475569
  muted: rgb(0.55, 0.6, 0.68), // #8ca0ad
  danger: rgb(0.863, 0.149, 0.149), // #dc2626
  success: rgb(0.02, 0.588, 0.412), // #059669
  warning: rgb(0.85, 0.45, 0.05),
  border: rgb(0.796, 0.835, 0.882), // #cbd5e1
  borderLight: rgb(0.9, 0.92, 0.94),
  bgLight: rgb(0.965, 0.973, 0.984), // #f8fafc
  bgHeader: rgb(0.93, 0.945, 0.965),
  white: rgb(1, 1, 1),
  black: rgb(0.08, 0.08, 0.08),
};

export interface PdfContext {
  pdf: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  oblique: PDFFont;
}

export async function createPdfContext(): Promise<PdfContext> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const oblique = await pdf.embedFont(StandardFonts.HelveticaOblique);
  return { pdf, regular, bold, oblique };
}

/**
 * Strips non-ASCII characters (such as Unicode currency symbols) to prevent Helvetica encoding errors.
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/[^\x20-\x7E]/g, "").trim();
}

export function formatNpr(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "NPR 0.00";
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `NPR ${formatted}`;
}

export function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options?: {
    size?: number;
    font?: PDFFont;
    color?: RGB;
    maxWidth?: number;
  }
) {
  const sanitized = sanitizeText(text);
  if (!sanitized) return;
  const size = options?.size ?? 9;
  const font = options?.font;
  const color = options?.color ?? COLORS.primary;

  page.drawText(sanitized, {
    x,
    y,
    size,
    font,
    color,
    maxWidth: options?.maxWidth,
  });
}

export function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  options?: {
    size?: number;
    color?: RGB;
  }
) {
  const sanitized = sanitizeText(text);
  if (!sanitized) return;
  const size = options?.size ?? 9;
  const color = options?.color ?? COLORS.primary;
  const textWidth = font.widthOfTextAtSize(sanitized, size);
  page.drawText(sanitized, {
    x: rightX - textWidth,
    y,
    size,
    font,
    color,
  });
}

export function drawCenteredText(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  font: PDFFont,
  options?: {
    size?: number;
    color?: RGB;
  }
) {
  const sanitized = sanitizeText(text);
  if (!sanitized) return;
  const size = options?.size ?? 9;
  const color = options?.color ?? COLORS.primary;
  const textWidth = font.widthOfTextAtSize(sanitized, size);
  page.drawText(sanitized, {
    x: centerX - textWidth / 2,
    y,
    size,
    font,
    color,
  });
}

export function drawBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: {
    borderColor?: RGB;
    borderWidth?: number;
    color?: RGB;
  }
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: options?.borderColor ?? COLORS.border,
    borderWidth: options?.borderWidth ?? 0.75,
    color: options?.color,
  });
}

export async function generateBarcodeImage(
  pdf: PDFDocument,
  text: string,
  options?: { height?: number; scale?: number }
) {
  try {
    const buffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: sanitizeText(text) || "BARCODE",
      scale: options?.scale ?? 2,
      height: options?.height ?? 10,
      includetext: false,
    });
    return await pdf.embedPng(buffer);
  } catch {
    return null;
  }
}

export async function generateQrImage(pdf: PDFDocument, text: string, size = 120) {
  try {
    const dataUrl = await QRCode.toDataURL(text || "QR", {
      margin: 0,
      width: size,
      errorCorrectionLevel: "M",
    });
    return await pdf.embedPng(dataUrl);
  } catch {
    return null;
  }
}

export function formatDateStr(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().slice(0, 10);
  } catch {
    return String(date);
  }
}

export function drawTable(
  page: PDFPage,
  options: {
    startX: number;
    startY: number;
    headers: string[];
    rows: string[][];
    colWidths: number[];
    rowHeight?: number;
    headerHeight?: number;
    headerColor?: RGB;
    headerTextColor?: RGB;
    font: PDFFont;
    boldFont: PDFFont;
    fontSize?: number;
    headerFontSize?: number;
    alignments?: ("left" | "right" | "center")[];
  }
) {
  const {
    startX,
    startY,
    headers,
    rows,
    colWidths,
    rowHeight = 22,
    headerHeight = 20,
    headerColor = COLORS.bgHeader,
    headerTextColor = COLORS.primary,
    font,
    boldFont,
    fontSize = 8,
    headerFontSize = 8,
    alignments = [],
  } = options;

  let currentY = startY;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);

  // Draw Header
  drawBox(page, startX, currentY - headerHeight, totalWidth, headerHeight, {
    color: headerColor,
    borderColor: COLORS.primary,
    borderWidth: 0.75,
  });

  let currentX = startX;
  for (let i = 0; i < headers.length; i++) {
    const align = alignments[i] || "left";
    const colW = colWidths[i];
    const text = headers[i];

    if (align === "right") {
      drawRightText(page, text, currentX + colW - 6, currentY - headerHeight + 5, boldFont, {
        size: headerFontSize,
        color: headerTextColor,
      });
    } else if (align === "center") {
      drawCenteredText(page, text, currentX + colW / 2, currentY - headerHeight + 5, boldFont, {
        size: headerFontSize,
        color: headerTextColor,
      });
    } else {
      drawText(page, text, currentX + 6, currentY - headerHeight + 5, {
        size: headerFontSize,
        font: boldFont,
        color: headerTextColor,
      });
    }
    currentX += colW;
  }

  currentY -= headerHeight;

  // Draw Rows
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const isEven = r % 2 === 0;

    drawBox(page, startX, currentY - rowHeight, totalWidth, rowHeight, {
      color: isEven ? COLORS.white : COLORS.bgLight,
      borderColor: COLORS.borderLight,
      borderWidth: 0.5,
    });

    let rowX = startX;
    for (let c = 0; c < row.length; c++) {
      const align = alignments[c] || "left";
      const colW = colWidths[c];
      const text = row[c] || "";

      if (align === "right") {
        drawRightText(page, text, rowX + colW - 6, currentY - rowHeight + 6, font, {
          size: fontSize,
          color: COLORS.black,
        });
      } else if (align === "center") {
        drawCenteredText(page, text, rowX + colW / 2, currentY - rowHeight + 6, font, {
          size: fontSize,
          color: COLORS.black,
        });
      } else {
        drawText(page, text, rowX + 6, currentY - rowHeight + 6, {
          size: fontSize,
          font,
          color: COLORS.black,
          maxWidth: colW - 12,
        });
      }
      rowX += colW;
    }

    currentY -= rowHeight;
  }

  return { endY: currentY };
}
