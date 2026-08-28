import { prisma } from "@/lib/db";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle2, Eye, ShieldCheck, DollarSign, Download, Printer, ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";

interface AccountsPageProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AccountsPortalPage({ params, searchParams }: AccountsPageProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  const isAuthorized =
    hasRole(ctx, "SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF", "ACCOUNTANT", "ACCOUNTS_MANAGER", "ACCOUNT_MANAGER", "ACCOUNTS_USER", "FINANCE") ||
    hasPermission(ctx, "invoice.generate") ||
    hasPermission(ctx, "order.revise");

  if (!isAuthorized) {
    redirect("/admin");
  }

  const resolvedSearchParams = await searchParams;
  const proformasPage = Number(resolvedSearchParams?.proformasPage) || 1;
  const invoicesPage = Number(resolvedSearchParams?.invoicesPage) || 1;
  const limit = 10;
  const proformasOffset = (proformasPage - 1) * limit;
  const invoicesOffset = (invoicesPage - 1) * limit;

  const [reviewPendingOrders, proformas, totalProformas, finalInvoices, totalInvoices] = await Promise.all([
    prisma.order.findMany({
      where: { sellerId: ctx.sellerId, status: "PENDING_ACCOUNTS_REVIEW" },
      include: { dealer: { select: { tradingName: true, code: true } } },
    }),
    prisma.proformaInvoice.findMany({
      where: { sellerId: ctx.sellerId },
      orderBy: { createdAt: "desc" },
      include: { order: { include: { dealer: { select: { tradingName: true } } } } },
      skip: proformasOffset,
      take: limit,
    }),
    prisma.proformaInvoice.count({ where: { sellerId: ctx.sellerId } }),
    prisma.finalInvoice.findMany({
      where: { sellerId: ctx.sellerId },
      orderBy: { createdAt: "desc" },
      include: { order: { include: { dealer: { select: { tradingName: true } } } } },
      skip: invoicesOffset,
      take: limit,
    }),
    prisma.finalInvoice.count({ where: { sellerId: ctx.sellerId } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div>
        <div className="section-kicker">Finance & Tax Invoicing</div>
        <h1 className="text-2xl font-black text-foreground">Accounts & Financial Invoicing Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review orders, generate & print proforma invoices, issue Nepal IRD VAT tax invoices, and verify credit limits.
        </p>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Review Pending Queue</span>
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground mt-3">{reviewPendingOrders.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Orders awaiting accounts approval</div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Proforma Invoices</span>
            <div className="p-2 rounded-xl bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground mt-3">{proformas.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Proforma invoices generated</div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Final Tax Invoices</span>
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground mt-3">{finalInvoices.length}</div>
          <div className="text-xs text-muted-foreground mt-1">VAT tax invoices issued</div>
        </div>
      </div>

      {/* Review Queue */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border font-bold text-sm bg-muted/40 text-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" /> Pending Accounts Review Queue ({reviewPendingOrders.length})
          </span>
          <span className="text-xs font-medium text-muted-foreground">Action required before proforma release</span>
        </div>
        {reviewPendingOrders.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground">All order review queues are cleared.</div>
        ) : (
          <div className="divide-y divide-border text-xs">
            {reviewPendingOrders.map((o) => (
              <div key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                <div>
                  <div className="font-bold text-sm text-foreground">{o.orderNumber} • {o.dealer?.tradingName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Submitted on {formatDate(o.createdAt)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-bold text-foreground text-sm">{formatCurrency(Number(o.grandTotal))}</div>
                  <Link href={`/admin/orders/${o.id}`}>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 shadow-xs">
                      Review & Confirm <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Tax Invoices & Proformas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proformas */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border font-bold text-sm bg-muted/40 text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" /> Recent Proforma Invoices
            </span>
            <span className="text-xs text-muted-foreground font-normal">{proformas.length} records</span>
          </div>
          <div className="divide-y divide-border text-xs">
            {proformas.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No proforma invoices generated yet.</div>
            ) : (
              proformas.map((pi) => (
                <div key={pi.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <div className="font-bold text-foreground">{pi.proformaNumber}</div>
                    <div className="text-muted-foreground text-[11px]">{pi.order.dealer?.tradingName} • {formatDate(pi.issueDate)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">{formatCurrency(Number(pi.grandTotal))}</span>
                    <a
                      href={`/api/orders/${pi.orderId}/documents/proforma`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent text-blue-500 transition-colors shadow-2xs"
                      title="Download PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
          {Math.ceil(totalProformas / limit) > 1 && (
            <div className="p-4 border-t border-border bg-muted/20">
              <Pagination totalPages={Math.ceil(totalProformas / limit)} searchParamName="proformasPage" />
            </div>
          )}
        </div>

        {/* Final Tax Invoices */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border font-bold text-sm bg-muted/40 text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Issued VAT Tax Invoices
            </span>
            <span className="text-xs text-muted-foreground font-normal">{finalInvoices.length} records</span>
          </div>
          <div className="divide-y divide-border text-xs">
            {finalInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No tax invoices issued yet.</div>
            ) : (
              finalInvoices.map((inv) => (
                <div key={inv.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <div className="font-bold text-foreground">{inv.invoiceNumber}</div>
                    <div className="text-muted-foreground text-[11px]">{inv.order.dealer?.tradingName} • {formatDate(inv.issueDate)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">{formatCurrency(Number(inv.grandTotal))}</span>
                    <a
                      href={`/api/orders/${inv.orderId}/documents/final-invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent text-emerald-500 transition-colors shadow-2xs"
                      title="Download PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
          {Math.ceil(totalInvoices / limit) > 1 && (
            <div className="p-4 border-t border-border bg-muted/20">
              <Pagination totalPages={Math.ceil(totalInvoices / limit)} searchParamName="invoicesPage" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
