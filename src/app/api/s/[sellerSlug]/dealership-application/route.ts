import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  checkRateLimit,
  getClientAddress,
  RequestCapacityError,
  withRequestConcurrencyLimit,
} from "@/lib/security/request-guard";

const dealershipApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z
    .string()
    .trim()
    .regex(/^(\+977)?[0-9 -]{7,16}$/, "Must be a valid phone number (7 to 15 digits).")
    .transform((val) => {
      if (!val) return "";
      const cleaned = val.replace(/[\s-]/g, "");
      if (cleaned.startsWith("+977")) return cleaned;
      if (cleaned.startsWith("977")) return `+${cleaned}`;
      return `+977${cleaned}`;
    })
    .optional()
    .or(z.literal("")),
  addressLine1: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  district: z.string().trim().max(100).optional().or(z.literal("")),
  province: z.string().trim().max(100).optional().or(z.literal("")),
  taxNumber: z.string().trim().max(80).optional().or(z.literal("")),
  registrationNumber: z.string().trim().max(80).optional().or(z.literal("")),
  monthlyOrderEstimate: z.coerce.number().nonnegative().max(1_000_000_000).optional(),
  creditRequested: z.coerce.boolean().default(false),
  remarks: z.string().trim().max(2_000).optional().or(z.literal("")),
  documents: z
    .array(
      z.object({
        type: z.string(),
        name: z.string(),
        url: z.string(),
        fileAssetId: z.string().optional().nullable(),
        verified: z.boolean().default(false),
        uploadedAt: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sellerSlug: string }> }
) {
  const clientAddress = getClientAddress(request);
  const rateLimit = checkRateLimit(`dealership:${clientAddress}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many applications. Please retry later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    return await withRequestConcurrencyLimit(async () => {
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > 128 * 1024) {
        return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
      }

      const { sellerSlug } = await params;
      const parsed = dealershipApplicationSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid application details.", fields: parsed.error.flatten().fieldErrors },
          { status: 400 },
        );
      }
      const body = parsed.data;

      const seller = await prisma.seller.findFirst({
        where: { slug: sellerSlug, status: "ACTIVE" },
        select: { id: true },
      });

      if (!seller) {
        return NextResponse.json({ error: "Seller not found" }, { status: 404 });
      }

      // Generate human-friendly submission number
      const count = await prisma.dealerApplication.count({ where: { sellerId: seller.id } });
      const year = new Date().getFullYear();
      const submissionNumber = `APP-${year}-${String(count + 1).padStart(4, "0")}`;

      const documentsData = {
        submissionNumber,
        documents: body.documents || [],
      };

      const application = await prisma.$transaction(async (tx) => {
        const created = await tx.dealerApplication.create({
          data: {
            sellerId: seller.id,
            businessName: body.businessName,
            contactName: body.contactName,
            email: body.email,
            phone: body.phone || null,
            addressLine1: body.addressLine1 || null,
            city: body.city || null,
            district: body.district || null,
            province: body.province || null,
            taxNumber: body.taxNumber || null,
            registrationNumber: body.registrationNumber || null,
            monthlyOrderEstimate: body.monthlyOrderEstimate,
            creditRequested: body.creditRequested,
            remarks: body.remarks || null,
            documentsJson: JSON.stringify(documentsData),
            status: "SUBMITTED",
          },
        });
        await tx.auditLog.create({
          data: {
            sellerId: seller.id,
            action: "dealer.application.submitted",
            entity: "DealerApplication",
            entityId: created.id,
            metadata: JSON.stringify({ submissionNumber, source: "public", clientAddress }),
            ipAddress: clientAddress,
            severity: "LOW",
          },
        });
        return created;
      });

      return NextResponse.json(
        {
          success: true,
          id: application.id,
          submissionNumber,
          message: `Dealership application submitted successfully with tracking number ${submissionNumber}.`,
        },
        { status: 201 }
      );
    });
  } catch (error: unknown) {
    console.error("Dealership application error:", error);
    if (error instanceof RequestCapacityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Unable to submit the application." },
      { status: 500 }
    );
  }
}
