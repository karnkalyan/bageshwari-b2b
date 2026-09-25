import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { generatePackageLabelPdf, convertPdfToJpeg, parsePaperSize } from "@/lib/pdf";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await params;
  const pkg = await prisma.package.findFirst({
    where: {
      id,
      sellerId: session.sellerId,
      ...(session.dealerId ? { order: { dealerId: session.dealerId } } : {}),
    },
    select: { packageNumber: true },
  });

  if (!pkg) {
    return apiError("PACKAGE_NOT_FOUND", "Package not found.", 404);
  }

  const { searchParams } = new URL(request.url);
  const rawLayout = searchParams.get("layout");
  const layout = (rawLayout === "a4_4" || rawLayout === "a4_2" || rawLayout === "a4_1" || rawLayout === "thermal") ? rawLayout : "a4_4";
  const paperSize = parsePaperSize(searchParams.get("pageSize") || searchParams.get("paperSize") || searchParams.get("size"));

  const bytes = await generatePackageLabelPdf(id, session.sellerId, layout, paperSize);
  if (!bytes) {
    return apiError("DOCUMENT_UNAVAILABLE", "Label data is unavailable.", 404);
  }

  const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
  const disposition = isDownload ? "attachment" : "inline";

  const formatParam = searchParams.get("format")?.toLowerCase();
  const isJpeg = formatParam === "jpeg" || formatParam === "jpg";
  const ext = isJpeg ? "jpg" : "pdf";
  const filename = `${pkg.packageNumber}-label.${ext}`;

  let responseBytes = bytes;
  let contentType = "application/pdf";

  if (isJpeg) {
    try {
      responseBytes = await convertPdfToJpeg(bytes, { scale: 2, quality: 92 });
      contentType = "image/jpeg";
    } catch (e: any) {
      console.error("Failed to convert package label PDF to JPEG:", e);
    }
  }

  return new Response(new Uint8Array(responseBytes).buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
