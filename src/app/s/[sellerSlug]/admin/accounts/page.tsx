import { prisma } from "@/lib/db";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle2, Eye, ShieldCheck, DollarSign, Download, Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AccountsPageProps {
  params: Promise<{ sellerSlug: string }>;
}

export default async function AccountsPortalPage({ params }: AccountsPageProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  const isAuthorized =
    hasRole(ctx, "SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF", "ACCOUNTANT", "ACCOUNTS_MANAGER", "ACCOUNT_MANAGER", "ACCOUNTS_USER", "FINANCE") ||
    hasPermission(ctx, "invoice.generate") ||
    hasPermission(ctx, "order.revise");

  if (!isAuthorized) {
    redirect("/admin");
  }

  const [reviewPendingOrders, proformas, finalInvoices] = await Promise.all([
    prisma.order.findMany({
      where: { sellerId: ctx.sellerId, status: "PENDING_ACCOUNTS_REVIEW" },
      include: { dealer: { select: { tradingName: true, code: true } } },
    }),
    prisma.proformaInvoice.findMany({
      where: { sellerId: ctx.sellerId },
      orderBy: { createdAt: "desc" },
      include: { order: { include: { dealer: { select: { tradingName: true } } } } },
      take: 20,
    }),
    prisma.finalInvoice.findMany({
      where: { sellerId: ctx.sellerId },
      orderBy: { createdAt: "desc" },
      include: { order: { include: { dealer: { select: { tradingName: true } } } } },
      take: 20,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div>
        <div className="section-kicker">Finance workflow</div>
        <h1 className="text-2xl font-black text-[#0b2d55]">Accounts & Financial Invoicing Portal</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review orders, generate & print proforma invoices, issue Nepal IRD VAT tax invoices, and verify credit limits
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase">Review Pending Queue</span>
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-2">{reviewPendingOrders.length}</div>
            <div className="text-xs text-amber-700 mt-1">Orders awaiting accounts approval</div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-800 uppercase">Proforma Invoices</span>
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-indigo-900 mt-2">{proformas.length}</div>
            <div className="text-xs text-indigo-700 mt-1">Proforma invoices generated</div>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 bg-cyan-50/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-800 uppercase">Final Tax Invoices</span>
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
            </div>
            <div className="text-2xl font-bold text-cyan-900 mt-2">{finalInvoices.length}</div>
            <div className="text-xs text-cyan-700 mt-1">VAT tax invoices issued</div>
          </CardContent>
        </Card>
      </div>

      {/* Review Queue */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b font-bold text-sm bg-slate-50">Pending Accounts Review Queue</div>
          {reviewPendingOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">All order review queues are cleared.</div>
          ) : (
            <div className="divide-y text-xs">
              {reviewPendingOrders.map((o) => (
                <div key={o.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{o.orderNumber} • {o.dealer?.tradingName}</div>
                    <div className="text-slate-500">Submitted on {formatDate(o.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-bold text-slate-900 text-sm">{formatCurrency(Number(o.grandTotal))}</div>
                    <Link href={`/admin/orders/${o.id}`}>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8">
                        Review & Confirm
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Tax Invoices & Proformas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proformas */}
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b font-bold text-sm bg-indigo-50/50 flex items-center justify-between">
              <span className="flex items-center gap-2 text-indigo-950">
                <FileText className="h-4 w-4 text-indigo-600" /> Recent Proforma Invoices
              </span>
            </div>
            <div className="divide-y text-xs">
              {proformas.slice(0, 5).map((pi) => (
                <div key={pi.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{pi.proformaNumber}</div>
                    <div className="text-slate-500">{pi.order.dealer?.tradingName} • {formatDate(pi.issueDate)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{formatCurrency(Number(pi.grandTotal))}</span>
                    <a
                      href={`/api/orders/${pi.orderId}/documents/proforma`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md border hover:bg-slate-50 text-indigo-700"
                      title="Download PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Final Tax Invoices */}
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b font-bold text-sm bg-cyan-50/50 flex items-center justify-between">
              <span className="flex items-center gap-2 text-cyan-950">
                <ShieldCheck className="h-4 w-4 text-cyan-600" /> Issued VAT Tax Invoices
              </span>
            </div>
            <div className="divide-y text-xs">
              {finalInvoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                    <div className="text-slate-500">{inv.order.dealer?.tradingName} • {formatDate(inv.issueDate)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{formatCurrency(Number(inv.grandTotal))}</span>
                    <a
                      href={`/api/orders/${inv.orderId}/documents/final-invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md border hover:bg-slate-50 text-cyan-700"
                      title="Download PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
