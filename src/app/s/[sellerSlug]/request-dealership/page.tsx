"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Upload,
  FileText,
  Search,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
  Paperclip,
} from "lucide-react";

interface UploadedDoc {
  type: string;
  name: string;
  url: string;
  fileAssetId?: string | null;
  verified?: boolean;
}

export default function RequestDealershipPage() {
  const params = useParams();
  const sellerSlug = (params?.sellerSlug as string | undefined) || "bageshwari";

  const [activeTab, setActiveTab] = useState<"NEW" | "TRACK">("NEW");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionNumber, setSubmissionNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    addressLine1: "",
    city: "",
    district: "",
    province: "Lumbini Province",
    taxNumber: "",
    registrationNumber: "",
    monthlyOrderEstimate: "",
    creditRequested: false,
    remarks: "",
  });

  // Documents state
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  // Tracking state
  const [trackIdentifier, setTrackIdentifier] = useState("");
  const [trackedApplication, setTrackedApplication] = useState<any | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string, docLabel: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingType(docType);
    setErrorMessage("");

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("documentType", docType);

      const res = await fetch("/api/dealer-applications/upload", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to upload document");
      }

      setDocuments((prev) => {
        const filtered = prev.filter((d) => d.type !== docType);
        return [
          ...filtered,
          {
            type: docType,
            name: docLabel,
            url: json.url,
            fileAssetId: json.fileAssetId,
            verified: false,
          },
        ];
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Document upload failed.");
    } finally {
      setUploadingType(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/s/${sellerSlug}/dealership-application`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          documents,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      setSubmissionNumber(data.submissionNumber || `APP-${data.id.slice(-6).toUpperCase()}`);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackIdentifier.trim()) return;

    setIsTracking(true);
    setErrorMessage("");
    setTrackedApplication(null);

    try {
      const res = await fetch("/api/dealer-applications/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trackIdentifier.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Application not found");
      }

      setTrackedApplication(data.application);
      setDocuments(data.application.documents || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not find application.");
    } finally {
      setIsTracking(false);
    }
  };

  const handleUpdateAndResubmit = async (resubmit = false) => {
    if (!trackedApplication) return;

    setIsUpdating(true);
    setErrorMessage("");
    setUpdateSuccessMessage("");

    try {
      const res = await fetch(`/api/dealer-applications/${trackedApplication.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...trackedApplication,
          documents,
          resubmit,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update application");
      }

      setTrackedApplication(data.application);
      setUpdateSuccessMessage(
        resubmit
          ? "Application successfully updated and re-submitted to the admin/accounts team for review!"
          : "Application information updated successfully."
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update application.");
    } finally {
      setIsUpdating(false);
    }
  };

  const copySubmission = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-red-500">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to storefront
          </Link>
          <div className="text-right">
            <div className="text-sm font-black uppercase text-foreground">Bageshwari Tractors</div>
            <div className="text-[9px] font-bold uppercase tracking-[.2em] text-red-500">B2B dealer network</div>
          </div>
        </div>

        {/* Tab Toggle: New Application vs Track / Update */}
        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1">
            <button
              onClick={() => {
                setActiveTab("NEW");
                setErrorMessage("");
              }}
              className={`rounded-md px-4 py-2 text-xs font-bold transition ${
                activeTab === "NEW"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              New Dealership Application
            </button>
            <button
              onClick={() => {
                setActiveTab("TRACK");
                setErrorMessage("");
              }}
              className={`rounded-md px-4 py-2 text-xs font-bold transition ${
                activeTab === "TRACK"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Track / Update Application
            </button>
          </div>
        </div>

        {/* 1. SUCCESS SCREEN */}
        {isSuccess ? (
          <Card className="border-emerald-200 bg-white shadow-xl text-center py-12 px-6">
            <CardContent className="space-y-5">
              <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
              <h2 className="text-2xl font-black text-slate-900">Application Submitted!</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Thank you for applying for an authorized dealership. Your application has been logged and assigned the tracking reference below.
              </p>

              <div className="inline-flex flex-col items-center bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm w-full mx-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400">Your Submission Reference No</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xl font-black text-[#0b2d55]">{submissionNumber}</span>
                  <button
                    onClick={() => copySubmission(submissionNumber)}
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600"
                    title="Copy submission number"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 mt-1">
                  Keep this number handy to track or update your application.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    setIsSuccess(false);
                    setActiveTab("TRACK");
                    setTrackIdentifier(submissionNumber);
                  }}
                  variant="outline"
                  className="font-semibold"
                >
                  Track Application Status
                </Button>
                <Link href="/">
                  <Button className="bg-[#0b2d55] hover:bg-[#092240] font-bold">
                    Return to Storefront
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : activeTab === "TRACK" ? (
          /* 2. TRACK & UPDATE EXISTING APPLICATION TAB */
          <div className="space-y-6">
            <Card className="overflow-hidden border-slate-200 shadow-xl">
              <CardHeader className="bg-[#072d57] p-6 text-white">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Search className="h-5 w-5 text-red-400" /> Track & Update Dealership Application
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Enter your Submission Number (e.g. APP-2026-0001), Registered Email, or Phone to check status or update rejected details.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleTrackLookup} className="flex gap-2">
                  <Input
                    placeholder="Enter Submission Reference No, Email, or Phone..."
                    value={trackIdentifier}
                    onChange={(e) => setTrackIdentifier(e.target.value)}
                    className="h-10 text-sm font-mono"
                    required
                  />
                  <Button type="submit" disabled={isTracking} className="bg-[#0b2d55] hover:bg-[#072d57] font-bold h-10 px-6">
                    {isTracking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
                  </Button>
                </form>

                {errorMessage && (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-100 text-red-800 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errorMessage}
                  </div>
                )}
                {updateSuccessMessage && (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {updateSuccessMessage}
                  </div>
                )}
              </CardContent>
            </Card>

            {trackedApplication && (
              <Card className="border-slate-200 shadow-xl">
                <CardHeader className="bg-slate-50 border-b p-5 flex flex-row items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-mono">Reference: {trackedApplication.submissionNumber}</div>
                    <CardTitle className="text-base font-bold text-slate-900 mt-0.5">
                      {trackedApplication.businessName}
                    </CardTitle>
                  </div>
                  <Badge
                    className={`text-xs font-bold px-3 py-1 ${
                      trackedApplication.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : trackedApplication.status === "REJECTED"
                        ? "bg-red-100 text-red-900 border-red-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {trackedApplication.status}
                  </Badge>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Rejection Alert Box */}
                  {trackedApplication.status === "REJECTED" && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                      <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                        <ShieldAlert className="h-5 w-5 text-red-600" /> Application Remarks / Action Required
                      </div>
                      <p className="text-xs text-red-800 leading-relaxed font-medium">
                        {trackedApplication.rejectionReason || "Please update your corporate documents or registration details below and re-submit for review."}
                      </p>
                    </div>
                  )}

                  {/* Editable Details */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Business & Contact Info</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Business Legal Name</Label>
                        <Input
                          value={trackedApplication.businessName || ""}
                          onChange={(e) => setTrackedApplication({ ...trackedApplication, businessName: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Contact Person Name</Label>
                        <Input
                          value={trackedApplication.contactName || ""}
                          onChange={(e) => setTrackedApplication({ ...trackedApplication, contactName: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">PAN / VAT Number</Label>
                        <Input
                          value={trackedApplication.taxNumber || ""}
                          onChange={(e) => setTrackedApplication({ ...trackedApplication, taxNumber: e.target.value })}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Registration Number</Label>
                        <Input
                          value={trackedApplication.registrationNumber || ""}
                          onChange={(e) => setTrackedApplication({ ...trackedApplication, registrationNumber: e.target.value })}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Address Line</Label>
                        <Input
                          value={trackedApplication.addressLine1 || ""}
                          onChange={(e) => setTrackedApplication({ ...trackedApplication, addressLine1: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">City / District</Label>
                        <Input
                          value={`${trackedApplication.city || ""}, ${trackedApplication.district || ""}`}
                          onChange={(e) => {
                            const [c, d] = e.target.value.split(",");
                            setTrackedApplication({ ...trackedApplication, city: c?.trim() || "", district: d?.trim() || "" });
                          }}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Uploads / Replacements */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attached Documents</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { type: "REGISTRATION", label: "Company Registration Certificate" },
                        { type: "PAN_VAT", label: "PAN / VAT Certificate" },
                        { type: "CITIZENSHIP", label: "Proprietor Citizenship / Passport" },
                        { type: "TAX_CLEARANCE", label: "Tax Clearance / Financials" },
                      ].map((doc) => {
                        const existing = documents.find((d) => d.type === doc.type);
                        return (
                          <div key={doc.type} className="p-3 rounded-lg border bg-white flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">{doc.label}</div>
                              {existing ? (
                                <a
                                  href={existing.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-medium truncate"
                                >
                                  <Paperclip className="h-3 w-3" /> View Uploaded File
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400">Not uploaded</span>
                              )}
                            </div>

                            <label className="cursor-pointer shrink-0">
                              <input
                                type="file"
                                accept=".pdf,image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, doc.type, doc.label)}
                              />
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border bg-slate-50 hover:bg-slate-100 text-slate-700">
                                {uploadingType === doc.type ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Upload className="h-3 w-3" />
                                )}
                                {existing ? "Replace" : "Upload"}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex flex-wrap items-center justify-end gap-3 border-t">
                    <Button
                      onClick={() => handleUpdateAndResubmit(false)}
                      variant="outline"
                      disabled={isUpdating}
                      className="text-xs font-bold"
                    >
                      Save Changes
                    </Button>
                    {trackedApplication.status === "REJECTED" && (
                      <Button
                        onClick={() => handleUpdateAndResubmit(true)}
                        disabled={isUpdating}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                        Re-Submit Application for Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* 3. NEW DEALERSHIP APPLICATION FORM */
          <Card className="overflow-hidden border-slate-200 shadow-xl">
            <CardHeader className="space-y-1 rounded-t-xl bg-[#072d57] p-7 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-red-500" />
                <CardTitle className="text-xl font-bold">Authorized Dealership Application</CardTitle>
              </div>
              <CardDescription className="text-slate-300 text-xs">
                Register your business as an authorized dealer for exclusive B2B wholesale pricing, credit terms, and direct warehouse dispatch.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-6">
                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 text-red-800 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errorMessage}
                  </div>
                )}

                {/* Section 1: Business Profile */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">1. Business Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Legal Business Name *</Label>
                      <Input
                        id="businessName"
                        required
                        placeholder="e.g. Himalayan Agro Equipment Pvt. Ltd."
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxNumber">PAN / VAT Number</Label>
                      <Input
                        id="taxNumber"
                        placeholder="Enter PAN or VAT number (e.g. 609670271)"
                        value={formData.taxNumber}
                        onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">Company Registration No.</Label>
                      <Input
                        id="registrationNumber"
                        placeholder="Enter company registration number"
                        value={formData.registrationNumber}
                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyEstimate">Estimated Monthly Order Value (NPR)</Label>
                      <Input
                        id="monthlyEstimate"
                        type="number"
                        placeholder="e.g. 500000"
                        value={formData.monthlyOrderEstimate}
                        onChange={(e) => setFormData({ ...formData, monthlyOrderEstimate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact Information */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">2. Primary Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Person Name *</Label>
                      <Input
                        id="contactName"
                        required
                        placeholder="e.g. Suresh Bhandari"
                        value={formData.contactName}
                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="dealer@example.com.np"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone / Mobile Number *</Label>
                      <Input
                        id="phone"
                        required
                        placeholder="e.g. 9814823222 or 081-520123"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Location */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">3. Location & Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="addressLine1">Address Line *</Label>
                      <Input
                        id="addressLine1"
                        required
                        placeholder="Main Road / Chowk"
                        value={formData.addressLine1}
                        onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City / Municipality *</Label>
                      <Input
                        id="city"
                        required
                        placeholder="e.g. Nepalgunj / Butwal"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district">District *</Label>
                      <Input
                        id="district"
                        required
                        placeholder="e.g. Banke / Rupandehi"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Document Uploads */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-semibold text-slate-900">4. Corporate Verification Documents (Optional / Recommended)</h3>
                    <span className="text-[11px] text-slate-400">PDF, JPG, PNG, WebP up to 10MB</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { type: "REGISTRATION", label: "Company Registration Certificate" },
                      { type: "PAN_VAT", label: "PAN / VAT Registration Certificate" },
                      { type: "CITIZENSHIP", label: "Citizenship / Passport of Proprietor" },
                      { type: "TAX_CLEARANCE", label: "Tax Clearance / Audit Report" },
                    ].map((doc) => {
                      const uploaded = documents.find((d) => d.type === doc.type);
                      return (
                        <div key={doc.type} className="p-3.5 rounded-xl border bg-slate-50/50 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900">{doc.label}</div>
                            {uploaded ? (
                              <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="h-3 w-3" /> Uploaded ready
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 mt-0.5">Not attached</div>
                            )}
                          </div>

                          <label className="cursor-pointer shrink-0">
                            <input
                              type="file"
                              accept=".pdf,image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, doc.type, doc.label)}
                            />
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border bg-white hover:bg-slate-100 text-slate-800 shadow-2xs">
                              {uploadingType === doc.type ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5 text-slate-500" />
                              )}
                              {uploaded ? "Change" : "Upload"}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    size="lg"
                    className="h-11 w-full bg-red-600 px-8 hover:bg-red-700 sm:w-auto font-bold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      "Submit Dealership Application"
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
