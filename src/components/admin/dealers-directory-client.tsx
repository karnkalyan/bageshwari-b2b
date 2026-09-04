"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  CheckCircle2,
  XCircle,
  CreditCard,
  ShoppingCart,
  Plus,
  Eye,
  Building2,
  FileCheck2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import {
  DealerApplicationReviewDialog,
  type SerializedDealerApplication,
  type DealerGroupOption,
  type PricingGroupOption,
} from "./dealer-application-review-dialog";

export interface SerializedDealer {
  id: string;
  code: string;
  legalName: string;
  tradingName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  creditEligible: boolean;
  dealerGroup?: { name: string; code: string } | null;
  pricingGroup?: { name: string; code: string } | null;
  creditProfile?: {
    creditLimit: number;
    availableCredit: number;
    currentOutstanding: number;
    creditPeriodDays: number;
    holdStatus: boolean;
  } | null;
  ordersCount: number;
}

interface DealersDirectoryClientProps {
  sellerSlug: string;
  dealers: SerializedDealer[];
  totalDealers?: number;
  dealersPage?: number;
  applications: SerializedDealerApplication[];
  totalApps?: number;
  appsPage?: number;
  dealerGroups: DealerGroupOption[];
  pricingGroups: PricingGroupOption[];
}

export function DealersDirectoryClient({
  sellerSlug,
  dealers,
  totalDealers,
  dealersPage,
  applications,
  totalApps,
  appsPage,
  dealerGroups,
  pricingGroups,
}: DealersDirectoryClientProps) {
  const [selectedApp, setSelectedApp] = useState<SerializedDealerApplication | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [dealerSearchQuery, setDealerSearchQuery] = useState("");
  const [appSearchQuery, setAppSearchQuery] = useState("");

  const pendingApps = applications.filter(
    (a) => a.status === "SUBMITTED" || a.status === "REVIEW_PENDING"
  );

  const filteredDealers = React.useMemo(() => {
    if (!dealerSearchQuery.trim()) return dealers;
    const q = dealerSearchQuery.toLowerCase().trim();
    return dealers.filter((d) => {
      const legalName = (d.legalName || "").toLowerCase();
      const tradingName = (d.tradingName || "").toLowerCase();
      const code = (d.code || "").toLowerCase();
      const contact = (d.contactName || "").toLowerCase();
      const phone = (d.phone || "").toLowerCase();
      const email = (d.email || "").toLowerCase();
      const group = (d.dealerGroup?.name || "").toLowerCase();
      return (
        legalName.includes(q) ||
        tradingName.includes(q) ||
        code.includes(q) ||
        contact.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        group.includes(q)
      );
    });
  }, [dealers, dealerSearchQuery]);

  const filteredApplications = React.useMemo(() => {
    if (!appSearchQuery.trim()) return applications;
    const q = appSearchQuery.toLowerCase().trim();
    return applications.filter((a) => {
      const bName = (a.businessName || "").toLowerCase();
      const cName = (a.contactName || "").toLowerCase();
      const phone = (a.phone || "").toLowerCase();
      const email = (a.email || "").toLowerCase();
      const subNo = (a.submissionNumber || "").toLowerCase();
      const taxNo = (a.taxNumber || "").toLowerCase();
      return (
        bName.includes(q) ||
        cName.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        subNo.includes(q) ||
        taxNo.includes(q)
      );
    });
  }, [applications, appSearchQuery]);

  const handleReviewClick = (app: SerializedDealerApplication) => {
    setSelectedApp(app);
    setIsReviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dealers">
        <TabsList className="bg-white border rounded-lg p-1">
          <TabsTrigger value="dealers" className="text-xs font-bold">
            Active Dealers ({filteredDealers.length}{dealers.length !== filteredDealers.length ? ` / ${dealers.length}` : ""})
          </TabsTrigger>
          <TabsTrigger value="applications" className="text-xs font-bold flex items-center gap-1.5">
            Dealer Applications
            {pendingApps.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                {pendingApps.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 1. ACTIVE DEALERS TAB */}
        <TabsContent value="dealers" className="mt-4">
          <Card>
            {/* Live Search Bar */}
            <div className="p-3 border-b bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search dealers by name, code, phone, email..."
                  value={dealerSearchQuery}
                  onChange={(e) => setDealerSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-7 text-xs bg-white"
                />
                {dealerSearchQuery && (
                  <button
                    onClick={() => setDealerSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {dealerSearchQuery ? (
                  <span className="text-emerald-700 font-bold">
                    Found {filteredDealers.length} matching dealer{filteredDealers.length === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span>Showing {dealers.length} active dealers</span>
                )}
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Dealer Code & Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Group / Tier</th>
                      <th className="px-4 py-3">Credit Limit</th>
                      <th className="px-4 py-3">Total Orders</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {filteredDealers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                          No dealers found matching &ldquo;{dealerSearchQuery}&rdquo;
                        </td>
                      </tr>
                    ) : (
                      filteredDealers.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{d.tradingName || d.legalName}</div>
                          <div className="text-[10px] text-slate-400">Code: {d.code}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-900">{d.contactName || "—"}</div>
                          <div className="text-[10px] text-slate-400">{d.phone || "—"} • {d.email || "—"}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            {d.dealerGroup && <Badge variant="secondary" className="text-[9px]">{d.dealerGroup.name}</Badge>}
                            {d.pricingGroup && <Badge variant="outline" className="text-[9px]">{d.pricingGroup.name}</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {d.creditProfile ? (
                            <div>
                              <div>{formatCurrency(d.creditProfile.creditLimit)}</div>
                              <div className="text-[10px] text-emerald-700 font-normal">
                                Avail: {formatCurrency(d.creditProfile.availableCredit)} ({d.creditProfile.creditPeriodDays}d)
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">No Credit Facility</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900">{d.ordersCount} orders</td>
                        <td className="px-4 py-3.5">
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{d.status}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/s/${sellerSlug}/admin/orders/new?dealerId=${d.id}`}>
                              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3" /> Create Order
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalDealers !== undefined && dealersPage !== undefined && Math.ceil(totalDealers / 20) > 1 && (
                <div className="p-4 border-t">
                  <Pagination 
                    totalPages={Math.ceil(totalDealers / 20)} 
                    searchParamName="dealersPage"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. DEALER APPLICATIONS TAB */}
        <TabsContent value="applications" className="mt-4">
          <Card>
            {/* Live Search Bar for Applications */}
            <div className="p-3 border-b bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search applications by business, contact, phone, ref..."
                  value={appSearchQuery}
                  onChange={(e) => setAppSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-7 text-xs bg-white"
                />
                {appSearchQuery && (
                  <button
                    onClick={() => setAppSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {appSearchQuery ? (
                  <span className="text-blue-700 font-bold">
                    Found {filteredApplications.length} matching application{filteredApplications.length === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span>Showing {applications.length} applications</span>
                )}
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Ref & Business</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Contact Person</th>
                      <th className="px-4 py-3">Documents</th>
                      <th className="px-4 py-3">Est. Order Value</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Applied On</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {filteredApplications.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                          {appSearchQuery ? `No applications found matching "${appSearchQuery}"` : "No dealership applications received yet."}
                        </td>
                      </tr>
                    ) : (
                      filteredApplications.map((app) => {
                        const subNo = app.submissionNumber || `APP-${app.id.slice(-6).toUpperCase()}`;
                        const docs = app.documents || [];
                        const verifiedDocsCount = docs.filter((d) => d.verified).length;

                        return (
                          <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-slate-900">
                              <div className="text-[10px] font-mono font-bold text-blue-700">{subNo}</div>
                              <div className="font-bold text-slate-900 text-xs mt-0.5">{app.businessName}</div>
                              {app.taxNumber && (
                                <div className="text-[10px] text-slate-400 font-mono">PAN/VAT: {app.taxNumber}</div>
                              )}
                            </td>
                            <td className="px-4 py-3.5">{app.district || "N/A"}, {app.province || "N/A"}</td>
                            <td className="px-4 py-3.5">
                              <div className="font-medium text-slate-900">{app.contactName}</div>
                              <div className="text-[10px] text-slate-400">{app.phone || "—"} • {app.email}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              {docs.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] px-1.5 py-0 font-medium">
                                    {docs.length} File{docs.length > 1 ? "s" : ""}
                                  </Badge>
                                  {verifiedDocsCount > 0 && (
                                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] px-1.5 py-0 font-bold">
                                      {verifiedDocsCount} Verified
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400">None attached</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-slate-900 font-mono">
                              {app.monthlyOrderEstimate ? formatCurrency(app.monthlyOrderEstimate) : "N/A"}
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge
                                className={
                                  app.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold"
                                    : app.status === "REJECTED"
                                    ? "bg-red-100 text-red-900 border-red-300 text-[10px] font-bold"
                                    : "bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold"
                                }
                              >
                                {app.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 text-slate-500">{formatDate(app.createdAt)}</td>
                            <td className="px-4 py-3.5 text-right">
                              <Button
                                size="sm"
                                onClick={() => handleReviewClick(app)}
                                className={
                                  app.status === "SUBMITTED" || app.status === "REVIEW_PENDING"
                                    ? "h-7 text-xs bg-[#0b2d55] hover:bg-[#124177] text-white font-bold"
                                    : "h-7 text-xs"
                                }
                                variant={app.status === "SUBMITTED" || app.status === "REVIEW_PENDING" ? "default" : "outline"}
                              >
                                {app.status === "SUBMITTED" || app.status === "REVIEW_PENDING" ? "Review & Verify" : "View & Edit"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {totalApps !== undefined && appsPage !== undefined && Math.ceil(totalApps / 20) > 1 && (
                <div className="p-4 border-t">
                  <Pagination 
                    totalPages={Math.ceil(totalApps / 20)} 
                    searchParamName="appsPage"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review & Approval / Rejection Modal */}
      <DealerApplicationReviewDialog
        application={selectedApp}
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedApp(null);
        }}
        dealerGroups={dealerGroups}
        pricingGroups={pricingGroups}
      />
    </div>
  );
}
