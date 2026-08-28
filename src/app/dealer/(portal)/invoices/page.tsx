import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, Download, ExternalLink, Receipt, Eye } from "lucide-react";

export default async function DealerInvoicesPage() {
  const ctx = await getTenantContext("bageshwari", "/dealer/login");
  if (!ctx.dealerId) redirect("/dealer/login");

  const [finalInvoices, proformas] = await Promise.all([
    prisma.finalInvoice.findMany({
      where: { sellerId: ctx.sellerId, order: { dealerId: ctx.dealerId } },
      include: { order: { select: { id: true, orderNumber: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.proformaInvoice.findMany({
      where: { sellerId: ctx.sellerId, order: { dealerId: ctx.dealerId } },
      include: { order: { select: { id: true, orderNumber: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 md:p-8">
      {/* Header */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Invoicing</div>
        <h1 className="text-2xl font-black text-[#092f5c]">Invoices & Billing Documents</h1>
        <p className="text-sm text-slate-500 mt-1">
          Access and download your Proforma Invoices (Estimates) and official Nepal IRD VAT Tax Invoices.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tax-invoices">
        <TabsList className="bg-white border rounded-xl p-1 shadow-xs">
          <TabsTrigger value="tax-invoices" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-600" />
            <span>Final Tax Invoices ({finalInvoices.length})</span>
          </TabsTrigger>
          <TabsTrigger value="proforma-invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span>Proforma Invoices ({proformas.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Final Tax Invoices */}
        <TabsContent value="tax-invoices" className="mt-4">
          <Card className="shadow-xs overflow-hidden">
            <CardContent className="p-0">
              {finalInvoices.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  <ShieldCheck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No Final Tax Invoices issued yet. Invoices appear here once order picking is completed.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Invoice Number</th>
                        <th className="px-4 py-3">Order Ref</th>
                        <th className="px-4 py-3">Issue Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Grand Total (NPR)</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {finalInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-cyan-600 shrink-0" />
                            <span>{inv.invoiceNumber}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <Link href={`/dealer/orders/${inv.order.id}`} className="font-semibold text-blue-700 hover:underline">
                              {inv.order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">{formatDate(inv.issueDate)}</td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className="bg-cyan-50 text-cyan-900 border-cyan-300 text-[10px]">
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm">
                            {formatCurrency(Number(inv.grandTotal))}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`/api/orders/${inv.order.id}/documents/final-invoice`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border bg-white hover:bg-slate-50 text-slate-700"
                              >
                                <Eye className="h-3 w-3" /> View
                              </a>
                              <a
                                href={`/api/orders/${inv.order.id}/documents/final-invoice?download=1`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-cyan-700 hover:bg-cyan-800 text-white"
                              >
                                <Download className="h-3 w-3" /> Download
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Proforma Invoices */}
        <TabsContent value="proforma-invoices" className="mt-4">
          <Card className="shadow-xs overflow-hidden">
            <CardContent className="p-0">
              {proformas.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No Proforma Invoices generated yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Proforma Number</th>
                        <th className="px-4 py-3">Order Ref</th>
                        <th className="px-4 py-3">Issue Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Estimated Total (NPR)</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {proformas.map((pi) => (
                        <tr key={pi.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                            <span>{pi.proformaNumber}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <Link href={`/dealer/orders/${pi.order.id}`} className="font-semibold text-blue-700 hover:underline">
                              {pi.order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">{formatDate(pi.issueDate)}</td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-900 border-indigo-300 text-[10px]">
                              {pi.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm">
                            {formatCurrency(Number(pi.grandTotal))}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`/api/orders/${pi.order.id}/documents/proforma`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border bg-white hover:bg-slate-50 text-slate-700"
                              >
                                <Eye className="h-3 w-3" /> View
                              </a>
                              <a
                                href={`/api/orders/${pi.order.id}/documents/proforma?download=1`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-700 hover:bg-indigo-800 text-white"
                              >
                                <Download className="h-3 w-3" /> Download
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
