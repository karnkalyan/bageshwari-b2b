import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const trackSchema = z.object({
  identifier: z.string().trim().min(2), // submissionNumber, application ID, email, or phone
  email: z.string().trim().toLowerCase().email().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide a valid submission number or email/phone." }, { status: 400 });
    }

    const { identifier, email } = parsed.data;

    // Search by ID, email, phone, or documentsJson containing submissionNumber
    const applications = await prisma.dealerApplication.findMany({
      where: {
        OR: [
          { id: identifier },
          { email: identifier },
          { phone: { contains: identifier } },
          { documentsJson: { contains: identifier } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (!applications.length) {
      return NextResponse.json({ error: "No dealership application found matching this reference." }, { status: 404 });
    }

    const app = applications[0];
    let parsedDocs: any = { submissionNumber: app.id, documents: [] };
    try {
      if (app.documentsJson) {
        parsedDocs = JSON.parse(app.documentsJson);
      }
    } catch {
      // fallback
    }

    return NextResponse.json({
      success: true,
      application: {
        id: app.id,
        submissionNumber: parsedDocs.submissionNumber || `APP-${app.id.slice(-6).toUpperCase()}`,
        status: app.status,
        businessName: app.businessName,
        contactName: app.contactName,
        email: app.email,
        phone: app.phone,
        addressLine1: app.addressLine1,
        city: app.city,
        district: app.district,
        province: app.province,
        taxNumber: app.taxNumber,
        registrationNumber: app.registrationNumber,
        monthlyOrderEstimate: app.monthlyOrderEstimate ? Number(app.monthlyOrderEstimate) : null,
        creditRequested: app.creditRequested,
        remarks: app.remarks,
        rejectionReason: app.rejectionReason,
        reviewedAt: app.reviewedAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        documents: parsedDocs.documents || [],
      },
    });
  } catch (err) {
    console.error("Track application error:", err);
    return NextResponse.json({ error: "Unable to retrieve application details." }, { status: 500 });
  }
}
