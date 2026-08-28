"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  DollarSign,
  Paperclip,
  CheckCheck,
  Edit,
  Upload,
  Eye,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface SerializedDealerApplication {
  id: string;
  submissionNumber?: string | null;
  businessName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  taxNumber?: string | null;
  registrationNumber?: string | null;
  monthlyOrderEstimate?: number | null;
  creditRequested: boolean;
  remarks?: string | null;
  documentsJson?: string | null;
  documents?: Array<{
    type: string;
    name: string;
    url: string;
    fileAssetId?: string | null;
    verified?: boolean;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
  }>;
  status: string;
  rejectionReason?: string | null;
  createdAt: string | Date;
}

export interface DealerGroupOption {
  id: string;
  name: string;
  code: string;
}

export interface PricingGroupOption {
  id: string;
  name: string;
  code: string;
}

interface DealerApplicationReviewDialogProps {
  application: SerializedDealerApplication | null;
  isOpen: boolean;
  onClose: () => void;
  dealerGroups?: DealerGroupOption[];
  pricingGroups?: PricingGroupOption[];
}

export function DealerApplicationReviewDialog({
  application,
  isOpen,
  onClose,
  dealerGroups = [],
  pricingGroups = [],
}: DealerApplicationReviewDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"VIEW" | "APPROVE" | "REJECT" | "EDIT">("VIEW");
  const [rejectionReason, setRejectionReason] = useState("");
  const [creditLimit, setCreditLimit] = useState<number>(500000);
  const [creditPeriodDays, setCreditPeriodDays] = useState<number>(30);
  const [dealerGroupId, setDealerGroupId] = useState<string>("");
  const [pricingGroupId, setPricingGroupId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    addressLine1: "",
    city: "",
    district: "",
    province: "",
    taxNumber: "",
    registrationNumber: "",
    monthlyOrderEstimate: 0,
    remarks: "",
  });

  const [docsList, setDocsList] = useState<any[]>([]);

  React.useEffect(() => {
    if (application) {
      setMode("VIEW");
      setRejectionReason(application.rejectionReason || "");
      setCreditLimit(application.monthlyOrderEstimate ? Number(application.monthlyOrderEstimate) * 1.5 : 500000);
      setCreditPeriodDays(30);
      setDealerGroupId("");
      setPricingGroupId("");
      setError(null);

      setEditFormData({
        businessName: application.businessName || "",
        contactName: application.contactName || "",
        email: application.email || "",
        phone: application.phone || "",
        addressLine1: application.addressLine1 || "",
        city: application.city || "",
        district: application.district || "",
        province: application.province || "",
        taxNumber: application.taxNumber || "",
        registrationNumber: application.registrationNumber || "",
        monthlyOrderEstimate: application.monthlyOrderEstimate ? Number(application.monthlyOrderEstimate) : 0,
        remarks: application.remarks || "",
      });

      // Parse documents
      let parsed = application.documents || [];
      if (!parsed.length && application.documentsJson) {
        try {
          const d = JSON.parse(application.documentsJson);
          parsed = d.documents || [];
        } catch {}
      }
      setDocsList(parsed);
    }
  }, [application, isOpen]);

  if (!application) return null;

  const submissionNumber =
    application.submissionNumber || `APP-${application.id.slice(-6).toUpperCase()}`;

  const handleReviewAction = async (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !rejectionReason.trim()) {
      setError("Please provide specific rejection comments or feedback for the dealer.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/dealer-applications/${application.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: rejectionReason.trim() || undefined,
          creditLimit: action === "APPROVE" ? Number(creditLimit) : undefined,
          creditPeriodDays: action === "APPROVE" ? Number(creditPeriodDays) : undefined,
          dealerGroupId: dealerGroupId || undefined,
          pricingGroupId: pricingGroupId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.message || "Failed to process application.");
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error processing application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyDocument = async (docType: string) => {
    setSubmitting(true);
    setError(null);

    const updated = docsList.map((d) =>
      d.type === docType ? { ...d, verified: true, verifiedAt: new Date().toISOString() } : d
    );
    setDocsList(updated);

    try {
      const res = await fetch(`/api/dealer-applications/${application.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: updated,
        }),
      });
      if (!res.ok) throw new Error("Failed to verify document");
      router.refresh();
    } catch (err) {
      setError("Failed to save document verification.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/dealer-applications/${application.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          documents: docsList,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || "Failed to update application");

      setMode("VIEW");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string, docLabel: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", docType);

      const res = await fetch("/api/dealer-applications/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");

      const filtered = docsList.filter((d) => d.type !== docType);
      const newDocs = [
        ...filtered,
        {
          type: docType,
          name: docLabel,
          url: json.url,
          fileAssetId: json.fileAssetId,
          verified: false,
        },
      ];
      setDocsList(newDocs);

      await fetch(`/api/dealer-applications/${application.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: newDocs }),
      });

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to attach document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 border-b pb-3">
            <div>
              <div className="text-[10px] font-mono font-bold text-blue-700 uppercase">
                Ref: {submissionNumber}
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Building2 className="h-5 w-5 text-[#0b2d55]" />
                {application.businessName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Applied on {formatDate(application.createdAt)} • Status: {application.status}
              </DialogDescription>
            </div>
            <Badge
              className={
                application.status === "APPROVED"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                  : application.status === "REJECTED"
                  ? "bg-red-100 text-red-900 border-red-300 font-bold"
                  : "bg-amber-100 text-amber-900 border-amber-300 font-bold"
              }
            >
              {application.status}
            </Badge>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Mode: EDIT Form */}
          {mode === "EDIT" ? (
            <div className="p-4 bg-slate-50 border rounded-xl space-y-4">
              <div className="font-bold text-slate-900 text-sm">Edit Dealer Application Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Business Legal Name</Label>
                  <Input
                    value={editFormData.businessName}
                    onChange={(e) => setEditFormData({ ...editFormData, businessName: e.target.value })}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact Person</Label>
                  <Input
                    value={editFormData.contactName}
                    onChange={(e) => setEditFormData({ ...editFormData, contactName: e.target.value })}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">PAN / VAT</Label>
                  <Input
                    value={editFormData.taxNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, taxNumber: e.target.value })}
                    className="h-8 text-xs font-mono bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Registration No.</Label>
                  <Input
                    value={editFormData.registrationNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, registrationNumber: e.target.value })}
                    className="h-8 text-xs font-mono bg-white"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Address Line</Label>
                  <Input
                    value={editFormData.addressLine1}
                    onChange={(e) => setEditFormData({ ...editFormData, addressLine1: e.target.value })}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">City / Municipality</Label>
                  <Input
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">District</Label>
                  <Input
                    value={editFormData.district}
                    onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Application Details Summary */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Contact Person:</span>
                <div className="font-bold text-slate-900">{application.contactName}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Email Address:</span>
                <div className="font-medium text-slate-900">{application.email}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Phone Number:</span>
                <div className="font-medium text-slate-900">{application.phone || "N/A"}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">PAN / VAT / Reg:</span>
                <div className="font-medium text-slate-900">
                  {application.taxNumber || application.registrationNumber || "N/A"}
                </div>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-slate-400 font-medium">Registered Address:</span>
                <div className="font-medium text-slate-900">
                  {application.addressLine1 || ""}, {application.city || ""}, {application.district || ""},{" "}
                  {application.province || ""}
                </div>
              </div>
              {application.remarks && (
                <div className="space-y-1 sm:col-span-2 pt-1 border-t">
                  <span className="text-slate-400 font-medium">Applicant Remarks:</span>
                  <div className="text-slate-700 italic">{application.remarks}</div>
                </div>
              )}
            </div>
          )}

          {/* Attached Documents & Verification Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Corporate Verification Documents
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { type: "REGISTRATION", label: "Company Registration" },
                { type: "PAN_VAT", label: "PAN / VAT Certificate" },
                { type: "CITIZENSHIP", label: "Proprietor Citizenship" },
                { type: "TAX_CLEARANCE", label: "Tax Clearance / Financials" },
              ].map((doc) => {
                const attached = docsList.find((d) => d.type === doc.type);
                return (
                  <div
                    key={doc.type}
                    className="p-2.5 rounded-lg border bg-white flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">{doc.label}</div>
                      {attached ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <a
                            href={attached.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-bold"
                          >
                            <Paperclip className="h-3 w-3" /> View Doc
                          </a>
                          {attached.verified ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1 py-0 font-bold">
                              Verified
                            </Badge>
                          ) : (
                            <span className="text-[9px] text-amber-600 font-medium">Pending Verify</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Not attached</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {attached && !attached.verified && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerifyDocument(doc.type)}
                          disabled={submitting}
                          className="h-6 text-[10px] text-emerald-700 hover:bg-emerald-50 px-1.5 font-bold"
                          title="Mark as verified by staff"
                        >
                          <CheckCheck className="h-3 w-3 mr-0.5" /> Verify
                        </Button>
                      )}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleDocUpload(e, doc.type, doc.label)}
                        />
                        <span className="inline-flex items-center px-2 py-1 text-[10px] font-semibold rounded border bg-slate-50 hover:bg-slate-100 text-slate-700">
                          <Upload className="h-2.5 w-2.5 mr-1" /> {attached ? "Replace" : "Upload"}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Past Rejection Reason if Rejected */}
          {application.status === "REJECTED" && application.rejectionReason && (
            <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-1">
              <span className="font-bold text-red-900 flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-red-600" /> Rejection Comments Sent to Dealer:
              </span>
              <p className="text-red-800 text-[11px]">{application.rejectionReason}</p>
            </div>
          )}

          {/* Mode: APPROVE Form */}
          {mode === "APPROVE" && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-4">
              <div className="font-bold text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Configure Authorized Dealer Account & Credit Limit
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="creditLimit" className="font-bold text-slate-800">
                    Approved Credit Limit (NPR)
                  </Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    min="0"
                    step="10000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                    className="h-9 bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">
                    Est. Order Value: {application.monthlyOrderEstimate ? formatCurrency(Number(application.monthlyOrderEstimate)) : "N/A"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="creditPeriod" className="font-bold text-slate-800">
                    Credit Terms (Days)
                  </Label>
                  <Input
                    id="creditPeriod"
                    type="number"
                    min="0"
                    max="180"
                    value={creditPeriodDays}
                    onChange={(e) => setCreditPeriodDays(parseInt(e.target.value, 10) || 30)}
                    className="h-9 bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Standard Net Payment Terms (e.g. 30, 45, 60 days)</span>
                </div>

                {dealerGroups.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dealerGroup" className="font-bold text-slate-800">
                      Dealer Group / Tier
                    </Label>
                    <select
                      id="dealerGroup"
                      value={dealerGroupId}
                      onChange={(e) => setDealerGroupId(e.target.value)}
                      className="w-full h-9 text-xs border rounded-md px-2 bg-white"
                    >
                      <option value="">Default Dealer Tier</option>
                      {dealerGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {pricingGroups.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="pricingGroup" className="font-bold text-slate-800">
                      Pricing Group
                    </Label>
                    <select
                      id="pricingGroup"
                      value={pricingGroupId}
                      onChange={(e) => setPricingGroupId(e.target.value)}
                      className="w-full h-9 text-xs border rounded-md px-2 bg-white"
                    >
                      <option value="">Default Pricing</option>
                      {pricingGroups.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode: REJECT Form */}
          {mode === "REJECT" && (
            <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-3">
              <div className="font-bold text-red-950 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Provide Rejection Comments (Will be sent to {application.email})
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rejectionReason" className="font-bold text-slate-800">
                  Rejection Remarks / Justification *
                </Label>
                <Textarea
                  id="rejectionReason"
                  rows={4}
                  required
                  placeholder="e.g. Incomplete tax clearance document or registration mismatch. Please attach correct certificate and re-apply."
                  value={rejectionReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                  className="bg-white text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 flex flex-row items-center justify-between gap-2">
          {mode === "VIEW" ? (
            <>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("EDIT")}
                  className="text-xs gap-1 font-semibold text-slate-700"
                >
                  <Edit className="h-3 w-3" /> Edit Details
                </Button>
              </div>

              {application.status !== "APPROVED" && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMode("REJECT")}
                    className="text-xs border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1 text-red-600" /> Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setMode("APPROVE")}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & Convert
                  </Button>
                </div>
              )}
            </>
          ) : mode === "EDIT" ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setMode("VIEW")} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEdit}
                disabled={submitting}
                className="bg-[#0b2d55] hover:bg-[#072d57] text-white font-bold text-xs"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : "Save Changes"}
              </Button>
            </>
          ) : mode === "APPROVE" ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setMode("VIEW")} disabled={submitting}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleReviewAction("APPROVE")}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Confirm Approval & Create Dealer
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setMode("VIEW")} disabled={submitting}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleReviewAction("REJECT")}
                disabled={submitting || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                Confirm Rejection & Send Notice
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
