import "server-only";
import sharp from "sharp";

export interface PdfToJpegOptions {
  scale?: number;     // Render scale (default: 2 for high 150-300 DPI clarity)
  quality?: number;   // JPEG compression quality (default: 90)
  pageIndex?: number; // Specific page (0-indexed). If omitted, merges all pages vertically if multi-page.
}

/**
 * Converts a PDF byte array into high-definition JPEG bytes.
 * If the PDF has multiple pages and pageIndex is not specified,
 * all pages are rendered and seamlessly stitched vertically into a single composite JPEG image.
 */
export async function convertPdfToJpeg(
  pdfBytes: Uint8Array,
  options?: PdfToJpegOptions
): Promise<Uint8Array> {
  const { scale = 2, quality = 90, pageIndex } = options || {};

  const base64 = Buffer.from(pdfBytes).toString("base64");
  const dataUrl = `data:application/pdf;base64,${base64}`;

  // Dynamically import pdf-to-img
  const { pdf } = await import("pdf-to-img");

  const doc = await pdf(dataUrl, {
    scale,
    format: "jpg",
  });

  const pageBuffers: Buffer[] = [];
  let idx = 0;
  for await (const pageImg of doc) {
    if (pageIndex !== undefined) {
      if (idx === pageIndex) {
        pageBuffers.push(pageImg);
        break;
      }
    } else {
      pageBuffers.push(pageImg);
    }
    idx++;
  }

  if (pageBuffers.length === 0) {
    throw new Error("No pages could be rendered from the provided PDF.");
  }

  if (pageBuffers.length === 1) {
    const output = await sharp(pageBuffers[0])
      .jpeg({ quality, chromaSubsampling: "4:4:4" })
      .toBuffer();
    return new Uint8Array(output);
  }

  // Multi-page document: vertically stitch all pages with white canvas background
  const metaList = await Promise.all(pageBuffers.map((b) => sharp(b).metadata()));
  const totalHeight = metaList.reduce((acc, m) => acc + (m.height || 0), 0);
  const maxWidth = Math.max(...metaList.map((m) => m.width || 0));

  let currentY = 0;
  const compositeInputs = pageBuffers.map((buf, i) => {
    const top = currentY;
    currentY += metaList[i].height || 0;
    return {
      input: buf,
      top,
      left: Math.max(0, Math.floor((maxWidth - (metaList[i].width || maxWidth)) / 2)),
    };
  });

  const stitched = await sharp({
    create: {
      width: maxWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite(compositeInputs)
    .jpeg({ quality, chromaSubsampling: "4:4:4" })
    .toBuffer();

  return new Uint8Array(stitched);
}
