import { prisma } from "@/lib/db";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DealersDirectoryClient } from "@/components/admin/dealers-directory-client";

interface DealersPageProps {
  params: Promise<{ sellerSlug: string }>;
}

export default async function AdminDealersPage({ params }: DealersPageProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  const isAuthorized =
    hasRole(ctx, "SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF", "SALESPERSON", "SALES_REP", "SALES_MANAGER", "ACCOUNTANT", "ACCOUNTS_MANAGER", "ACCOUNT_MANAGER") ||
    hasPermission(ctx, "dealer.manage") ||
    hasPermission(ctx, "dealer.view");

  if (!isAuthorized) {
    redirect("/admin");
  }

  const [dealers, applications, dealerGroups, pricingGroups] = await Promise.all([
    prisma.dealer.findMany({
      where: { sellerId: ctx.sellerId },
      orderBy: { createdAt: "desc" },
      include: {
        dealerGroup: true,
        pricingGroup: true,
        creditProfile: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.dealerApplication.findMany({
      where: { sellerId: ctx.sellerId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dealerGroup.findMany({
      where: { sellerId: ctx.sellerId, active: true },
      select: { id: true, name: true, code: true },
    }),
    prisma.pricingGroup.findMany({
      where: { sellerId: ctx.sellerId, active: true },
      select: { id: true, name: true, code: true },
    }),
  ]);

  const serializedDealers = dealers.map((d) => ({
    id: d.id,
    code: d.code,
    legalName: d.legalName,
    tradingName: d.tradingName,
    contactName: d.contactName,
    email: d.email,
    phone: d.phone,
    status: d.status,
    creditEligible: d.creditEligible,
    dealerGroup: d.dealerGroup ? { name: d.dealerGroup.name, code: d.dealerGroup.code } : null,
    pricingGroup: d.pricingGroup ? { name: d.pricingGroup.name, code: d.pricingGroup.code } : null,
    creditProfile: d.creditProfile
      ? {
          creditLimit: Number(d.creditProfile.creditLimit),
          availableCredit: Number(d.creditProfile.availableCredit),
          currentOutstanding: Number(d.creditProfile.currentOutstanding),
          creditPeriodDays: d.creditProfile.creditPeriodDays,
          holdStatus: d.creditProfile.holdStatus,
        }
      : null,
    ordersCount: d._count.orders,
  }));

  const serializedApplications = applications.map((a) => {
    let parsedDocs: any = { submissionNumber: `APP-${a.id.slice(-6).toUpperCase()}`, documents: [] };
    try {
      if (a.documentsJson) {
        parsedDocs = JSON.parse(a.documentsJson);
      }
    } catch {}

    return {
      id: a.id,
      submissionNumber: parsedDocs.submissionNumber || `APP-${a.id.slice(-6).toUpperCase()}`,
      businessName: a.businessName,
      contactName: a.contactName,
      email: a.email,
      phone: a.phone,
      addressLine1: a.addressLine1,
      city: a.city,
      district: a.district,
      province: a.province,
      taxNumber: a.taxNumber,
      registrationNumber: a.registrationNumber,
      monthlyOrderEstimate:
        a.monthlyOrderEstimate !== null && a.monthlyOrderEstimate !== undefined
          ? Number(a.monthlyOrderEstimate)
          : null,
      creditRequested: a.creditRequested,
      remarks: a.remarks,
      documentsJson: a.documentsJson,
      documents: parsedDocs.documents || [],
      status: a.status,
      rejectionReason: a.rejectionReason,
      createdAt: a.createdAt.toISOString(),
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-kicker">Dealer management</div>
          <h1 className="text-2xl font-black text-[#0b2d55]">Dealer Directory & Applications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage dealer profiles, approve new applications, and configure credit profiles
          </p>
        </div>

        <div>
          <Link href="/admin/orders/new">
            <Button className="bg-[#0b2d55] hover:bg-[#124177] text-white font-bold text-xs h-9 shadow-sm flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Create Sales Order
            </Button>
          </Link>
        </div>
      </div>

      <DealersDirectoryClient
        sellerSlug={sellerSlug}
        dealers={serializedDealers}
        applications={serializedApplications}
        dealerGroups={dealerGroups}
        pricingGroups={pricingGroups}
      />
    </div>
  );
}
