import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { generatePackageLabelPdf } from "@/lib/pdf";
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

  const bytes = await generatePackageLabelPdf(id, session.sellerId);
  if (!bytes) {
    return apiError("DOCUMENT_UNAVAILABLE", "Label data is unavailable.", 404);
  }

  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
  const disposition = isDownload ? "attachment" : "inline";

  return new Response(new Uint8Array(bytes).buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${pkg.packageNumber}-label.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
