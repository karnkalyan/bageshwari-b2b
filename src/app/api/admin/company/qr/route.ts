import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const qrActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("toggle"),
    qrId: z.string().min(1),
  }),
  z.object({
    action: z.literal("delete"),
    qrId: z.string().min(1),
  }),
  z.object({
    action: z.literal("update"),
    qrId: z.string().min(1),
    title: z.string().trim().min(1).max(100),
    accountName: z.string().trim().max(100).optional().nullable(),
    accountNumber: z.string().trim().max(100).optional().nullable(),
  }),
]);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let sellerId = session.sellerId;
  if (!sellerId) {
    const activeSeller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } }).catch(() => null);
    sellerId = activeSeller?.id;
  }

  try {
    const body = await request.json();
    const parsed = qrActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid QR operation.", details: parsed.error.format() }, { status: 400 });
    }

    const existingProfile = await prisma.companyProfile.findFirst({
      where: {
        OR: [
          ...(sellerId ? [{ sellerId }] : []),
          { id: "bageshwari-tractors" },
        ],
      },
    }).catch(() => null);

    if (!existingProfile) {
      return NextResponse.json({ error: "Company profile not found." }, { status: 404 });
    }

    let meta: any = {};
    if (existingProfile.socialLinksJson) {
      try {
        meta = JSON.parse(existingProfile.socialLinksJson);
      } catch {}
    }

    const currentQrs: any[] = Array.isArray(meta.merchantQrs) ? meta.merchantQrs : [];
    let updatedQrs = [...currentQrs];

    const data = parsed.data;
    if (data.action === "toggle") {
      updatedQrs = updatedQrs.map((q) => (q.id === data.qrId ? { ...q, isActive: !q.isActive } : q));
    } else if (data.action === "delete") {
      updatedQrs = updatedQrs.filter((q) => q.id !== data.qrId);
    } else if (data.action === "update") {
      updatedQrs = updatedQrs.map((q) =>
        q.id === data.qrId
          ? {
              ...q,
              title: data.title,
              ...(data.accountName !== undefined ? { accountName: data.accountName } : {}),
              ...(data.accountNumber !== undefined ? { accountNumber: data.accountNumber } : {}),
            }
          : q
      );
    }

    const activeQr = updatedQrs.find((q) => q.isActive);
    meta.merchantQrs = updatedQrs;
    meta.merchantQrUrl = activeQr ? activeQr.qrUrl : null;

    await prisma.companyProfile.update({
      where: { id: existingProfile.id },
      data: {
        socialLinksJson: JSON.stringify(meta),
      },
    });

    return NextResponse.json({
      success: true,
      merchantQrs: updatedQrs,
      merchantQrUrl: meta.merchantQrUrl,
    });
  } catch (err: any) {
    console.error("QR action error:", err);
    return NextResponse.json({ error: err?.message || "Failed to update QR code." }, { status: 500 });
  }
}
