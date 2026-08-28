import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { sendWorkflowNotification } from "@/services/notification.service";

const updateApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(160).optional(),
  contactName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  phone: z.string().trim().optional().or(z.literal("")),
  addressLine1: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  district: z.string().trim().max(100).optional().or(z.literal("")),
  province: z.string().trim().max(100).optional().or(z.literal("")),
  taxNumber: z.string().trim().max(80).optional().or(z.literal("")),
  registrationNumber: z.string().trim().max(80).optional().or(z.literal("")),
  monthlyOrderEstimate: z.coerce.number().nonnegative().optional(),
  creditRequested: z.coerce.boolean().optional(),
  remarks: z.string().trim().max(2_000).optional().or(z.literal("")),
  documents: z
    .array(
      z.object({
        type: z.string(),
        name: z.string(),
        url: z.string(),
        fileAssetId: z.string().optional().nullable(),
        verified: z.boolean().default(false),
        verifiedAt: z.string().optional().nullable(),
        verifiedBy: z.string().optional().nullable(),
        uploadedAt: z.string().optional(),
      })
    )
    .optional(),
  resubmit: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const application = await prisma.dealerApplication.findUnique({
    where: { id },
    include: { seller: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Dealer application not found." }, { status: 404 });
  }

  const isStaff = session?.user?.id && (session.roles || []).some((role) =>
    ["SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF", "SALESPERSON", "SALES_REP", "SALES_MANAGER", "ACCOUNTANT", "ACCOUNTS_MANAGER"].includes(role)
  );

  const body = await request.json().catch(() => ({}));
  const parsed = updateApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;

  // Retrieve existing documents payload
  let existingDocs: any = { submissionNumber: `APP-${application.id.slice(-6).toUpperCase()}`, documents: [] };
  try {
    if (application.documentsJson) {
      existingDocs = JSON.parse(application.documentsJson);
    }
  } catch {
    // fallback
  }

  // Merge documents if provided
  let updatedDocuments = existingDocs.documents || [];
  if (data.documents && data.documents.length > 0) {
    // Merge by type or URL
    const docMap = new Map();
    for (const d of updatedDocuments) {
      docMap.set(d.type || d.name, d);
    }
    for (const d of data.documents) {
      const prev = docMap.get(d.type || d.name);
      docMap.set(d.type || d.name, {
        ...prev,
        ...d,
        verified: isStaff && d.verified !== undefined ? d.verified : prev?.verified || false,
        verifiedAt: isStaff && d.verified ? new Date().toISOString() : prev?.verifiedAt || null,
        verifiedBy: isStaff && d.verified ? session?.user?.name || "Staff Verifier" : prev?.verifiedBy || null,
      });
    }
    updatedDocuments = Array.from(docMap.values());
  }

  const newDocumentsJson = JSON.stringify({
    submissionNumber: existingDocs.submissionNumber || `APP-${application.id.slice(-6).toUpperCase()}`,
    documents: updatedDocuments,
  });

  // Re-submission logic: If application was REJECTED and resubmit flag is true, set status to SUBMITTED
  let nextStatus = application.status;
  if (data.resubmit && application.status === "REJECTED") {
    nextStatus = "SUBMITTED";
  }

  const updated = await prisma.$transaction(async (tx) => {
    const app = await tx.dealerApplication.update({
      where: { id },
      data: {
        ...(data.businessName ? { businessName: data.businessName } : {}),
        ...(data.contactName ? { contactName: data.contactName } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.addressLine1 !== undefined ? { addressLine1: data.addressLine1 || null } : {}),
        ...(data.city !== undefined ? { city: data.city || null } : {}),
        ...(data.district !== undefined ? { district: data.district || null } : {}),
        ...(data.province !== undefined ? { province: data.province || null } : {}),
        ...(data.taxNumber !== undefined ? { taxNumber: data.taxNumber || null } : {}),
        ...(data.registrationNumber !== undefined ? { registrationNumber: data.registrationNumber || null } : {}),
        ...(data.monthlyOrderEstimate !== undefined ? { monthlyOrderEstimate: data.monthlyOrderEstimate } : {}),
        ...(data.creditRequested !== undefined ? { creditRequested: data.creditRequested } : {}),
        ...(data.remarks !== undefined ? { remarks: data.remarks || null } : {}),
        documentsJson: newDocumentsJson,
        status: nextStatus,
      },
    });

    await tx.auditLog.create({
      data: {
        sellerId: application.sellerId,
        action: data.resubmit ? "dealer.application.resubmitted" : "dealer.application.updated",
        entity: "DealerApplication",
        entityId: id,
        metadata: JSON.stringify({
          updatedBy: isStaff ? session?.user?.id : "applicant",
          resubmitted: Boolean(data.resubmit),
        }),
        severity: "LOW",
      },
    });

    return app;
  });

  // If re-submitted, notify Sales & Admin team
  if (data.resubmit) {
    await sendWorkflowNotification({
      sellerId: application.sellerId,
      targetRoles: ["ADMIN", "SUPER_ADMIN", "SALES_MANAGER", "ACCOUNTANT"],
      title: `Dealership Application Re-submitted: ${updated.businessName}`,
      message: `Applicant has updated details & documents for review. Submission Ref: ${existingDocs.submissionNumber}`,
      linkUrl: `/admin/dealers`,
    });
  }

  return NextResponse.json({
    success: true,
    application: {
      ...updated,
      submissionNumber: existingDocs.submissionNumber,
      documents: updatedDocuments,
    },
    message: data.resubmit
      ? "Application successfully updated and re-submitted for review."
      : "Application information updated successfully.",
  });
}
