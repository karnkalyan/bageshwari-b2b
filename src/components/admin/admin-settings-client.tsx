"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Percent,
  CreditCard,
  MapPin,
  Mail,
  Phone,
  Globe,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
  Sparkles,
  Receipt,
  FileCheck2,
  Palette,
  Sun,
  Moon,
  Monitor,
  Eye,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export interface ThemeSettingsConfig {
  primaryColor?: string;
  accentColor?: string;
  themeMode?: "light" | "dark" | "system";
  headerStyle?: string;
  brandTagline?: string;
  cardRadius?: string;
  tableDensity?: string;
}

export interface SerializedCompanyProfile {
  companyName: string;
  tradingName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  country: string;
  province?: string | null;
  district?: string | null;
  city?: string | null;
  address?: string | null;
  panNumber?: string | null;
  vatNumber?: string | null;
  registrationNumber?: string | null;
  defaultVatPercent: number;
  pricesIncludeVat: boolean;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankBranch?: string | null;
  bankSwiftCode?: string | null;
  // Master Dealer Credit Configuration
  enableDealerCredit?: boolean;
  defaultCreditLimit?: number;
  defaultCreditPeriodDays?: number;
  maxCreditLimit?: number;
  creditTermsPolicy?: string | null;
  themeConfig?: ThemeSettingsConfig;
}

export interface SerializedCategoryTax {
  id: string;
  name: string;
  code: string;
  taxPercent: number | null;
  productCount: number;
}

interface AdminSettingsClientProps {
  initialCompany: SerializedCompanyProfile;
  initialCategories: SerializedCategoryTax[];
  sellerSlug: string;
}

export function AdminSettingsClient({
  initialCompany,
  initialCategories,
  sellerSlug,
}: AdminSettingsClientProps) {
  const router = useRouter();
  const [company, setCompany] = useState<SerializedCompanyProfile>({
    ...initialCompany,
    enableDealerCredit: initialCompany.enableDealerCredit ?? true,
    defaultCreditLimit: initialCompany.defaultCreditLimit ?? 500000,
    defaultCreditPeriodDays: initialCompany.defaultCreditPeriodDays ?? 30,
    maxCreditLimit: initialCompany.maxCreditLimit ?? 5000000,
    creditTermsPolicy:
      initialCompany.creditTermsPolicy ??
      "Standard 30-Day Net B2B Commercial Credit Facility subject to approved limit and periodic account reconciliation.",
  });
  const [themeConfig, setThemeConfig] = useState<ThemeSettingsConfig>({
    primaryColor: initialCompany.themeConfig?.primaryColor || "#0b2d55",
    accentColor: initialCompany.themeConfig?.accentColor || "#d97706",
    themeMode: initialCompany.themeConfig?.themeMode || "light",
    headerStyle: initialCompany.themeConfig?.headerStyle || "dark",
    brandTagline:
      initialCompany.themeConfig?.brandTagline ||
      "Authorized B2B Tractor Parts & Agricultural Machinery Distributor",
    cardRadius: initialCompany.themeConfig?.cardRadius || "rounded-xl",
    tableDensity: initialCompany.themeConfig?.tableDensity || "standard",
  });
  const [categories, setCategories] = useState<SerializedCategoryTax[]>(initialCategories);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryTaxChange = (id: string, value: string) => {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : parseFloat(trimmed);

    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, taxPercent: parsed } : cat))
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...company,
          themeConfig,
          categories: categories.map((c) => ({
            id: c.id,
            taxPercent: c.taxPercent,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.message || json?.error?.message || "Failed to save settings.");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs flex items-center gap-2 shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-300 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-bold">Seller profile, global VAT rate, dealer credit policy, theme styling, and category taxes saved successfully!</span>
        </div>
      )}

      <Tabs defaultValue="vat" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2 border rounded-xl shadow-xs">
          <TabsList className="bg-slate-100 p-1 rounded-lg flex flex-wrap">
            <TabsTrigger value="vat" className="text-xs font-bold flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" /> VAT & Tax Configuration
            </TabsTrigger>
            <TabsTrigger value="seller" className="text-xs font-bold flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Company & Seller Details
            </TabsTrigger>
            <TabsTrigger value="bank" className="text-xs font-bold flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Bank & Settlement Info
            </TabsTrigger>
            <TabsTrigger value="credit" className="text-xs font-bold flex items-center gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5 text-blue-700" /> Dealer Credit Facility
            </TabsTrigger>
            <TabsTrigger value="theme" className="text-xs font-bold flex items-center gap-1.5 text-indigo-700 data-[state=active]:text-indigo-900">
              <Palette className="h-3.5 w-3.5" /> Theme & UI Management
            </TabsTrigger>
          </TabsList>

          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-[#0b2d55] hover:bg-[#124177] text-white font-black text-xs h-9 px-5 shadow-sm flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save All Settings
          </Button>
        </div>

        {/* 1. VAT & TAX CONFIGURATION TAB */}
        <TabsContent value="vat" className="space-y-6">
          {/* Global VAT Master Card */}
          <Card className="shadow-xs border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-blue-50/20">
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0b2d55]">
                    <Percent className="h-4 w-4 text-emerald-600" /> Global Default VAT Percentage
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Standard VAT rate applied to all commercial calculations, proforma invoices, and tax invoices.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-600 text-white font-black text-xs px-2.5 py-1">
                  Active Rate: {company.defaultVatPercent}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs font-bold text-slate-800">
                    Default VAT Rate (%)
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={company.defaultVatPercent}
                      onChange={(e) =>
                        setCompany({
                          ...company,
                          defaultVatPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-10 text-sm font-black bg-white pl-3 pr-10 border-emerald-300"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Standard statutory VAT rate in Nepal is 13.00%.
                  </p>
                </div>

                <div className="p-3.5 bg-white border rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-slate-900 block">
                        Display Prices Include VAT
                      </Label>
                      <span className="text-[11px] text-slate-500">
                        When enabled, catalog rates are treated as gross VAT-inclusive.
                      </span>
                    </div>
                    <Switch
                      checked={company.pricesIncludeVat}
                      onCheckedChange={(checked: boolean) =>
                        setCompany({ ...company, pricesIncludeVat: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3-Tier VAT Inheritance Explanation */}
          <div className="p-4 bg-slate-900 text-white rounded-xl text-xs space-y-2 shadow-xs">
            <div className="font-bold flex items-center gap-2 text-emerald-400">
              <Sparkles className="h-4 w-4" /> 3-Tier Hierarchical VAT Resolution Engine
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-300 pt-1">
              <div className="p-2.5 bg-white/10 rounded-lg">
                <span className="font-bold text-white block">1. Product Override</span>
                If specified on a product, the product's explicit VAT % takes highest precedence.
              </div>
              <div className="p-2.5 bg-white/10 rounded-lg">
                <span className="font-bold text-white block">2. Category Override</span>
                If product has no custom rate, it inherits the Category VAT % set below.
              </div>
              <div className="p-2.5 bg-white/10 rounded-lg">
                <span className="font-bold text-white block">3. Global Default</span>
                If neither is set, system applies the Global Master VAT % ({company.defaultVatPercent}%).
              </div>
            </div>
          </div>

          {/* Category-Based VAT Overrides Table */}
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3 bg-slate-50/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0b2d55]">
                <Layers className="h-4 w-4 text-primary" /> Category-Based VAT % Overrides
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Set category-specific tax rates (e.g. 0% for tax-exempt items, 5% for reduced goods). Leave blank to inherit global {company.defaultVatPercent}%.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Category Name & Code</th>
                      <th className="px-4 py-3">Catalog Products</th>
                      <th className="px-4 py-3">Category VAT Rate (%)</th>
                      <th className="px-4 py-3">Effective Resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {categories.map((cat) => {
                      const isInheriting = cat.taxPercent === null || cat.taxPercent === undefined;
                      const effectiveRate = isInheriting ? company.defaultVatPercent : cat.taxPercent;

                      return (
                        <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">{cat.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Code: {cat.code}</div>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900">
                            {cat.productCount} item(s)
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 max-w-[180px]">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder={`Inherit (${company.defaultVatPercent}%)`}
                                value={cat.taxPercent !== null && cat.taxPercent !== undefined ? cat.taxPercent : ""}
                                onChange={(e) => handleCategoryTaxChange(cat.id, e.target.value)}
                                className="h-8 text-xs font-bold bg-white"
                              />
                              <span className="text-xs font-bold text-slate-400">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              className={`text-[10px] font-bold ${
                                !isInheriting
                                  ? "bg-purple-100 text-purple-800 border-purple-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {effectiveRate}% {!isInheriting ? "Category Custom" : "Inherits Global"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. COMPANY & SELLER DETAILS TAB */}
        <TabsContent value="seller" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0b2d55]">
                <Building2 className="h-4 w-4 text-primary" /> Company Identity & Legal Information
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Printed on Tax Invoices, Proforma Invoices, Delivery Challans, and Carton Labels.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Company Legal Name</Label>
                  <Input
                    value={company.companyName}
                    onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                    className="mt-1 h-8 text-xs font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Trading Name / Brand</Label>
                  <Input
                    value={company.tradingName}
                    onChange={(e) => setCompany({ ...company, tradingName: e.target.value })}
                    className="mt-1 h-8 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold">PAN / VAT Number</Label>
                  <Input
                    value={company.panNumber || ""}
                    onChange={(e) => setCompany({ ...company, panNumber: e.target.value })}
                    className="mt-1 h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Company Registration Number</Label>
                  <Input
                    value={company.registrationNumber || ""}
                    onChange={(e) => setCompany({ ...company, registrationNumber: e.target.value })}
                    className="mt-1 h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Contact Person</Label>
                  <Input
                    value={company.contactPerson || ""}
                    onChange={(e) => setCompany({ ...company, contactPerson: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Official Phone Number</Label>
                  <Input
                    value={company.phone || ""}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Official Email Address</Label>
                  <Input
                    value={company.email || ""}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Website URL</Label>
                  <Input
                    value={company.website || ""}
                    onChange={(e) => setCompany({ ...company, website: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Address Fields */}
              <div className="pt-2 border-t space-y-3">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Physical Headquarters Address
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] text-slate-500">Street / Highway Address</Label>
                    <Input
                      value={company.address || ""}
                      onChange={(e) => setCompany({ ...company, address: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-500">City / Municipality</Label>
                    <Input
                      value={company.city || ""}
                      onChange={(e) => setCompany({ ...company, city: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-500">District & Province</Label>
                    <Input
                      value={company.district || ""}
                      onChange={(e) => setCompany({ ...company, district: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. BANK & SETTLEMENT INFO TAB */}
        <TabsContent value="bank" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0b2d55]">
                <CreditCard className="h-4 w-4 text-primary" /> Official Bank & Settlement Accounts
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                These banking coordinates appear on Proforma Invoices and Dealer payment instructions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Bank Name</Label>
                  <Input
                    value={company.bankName || ""}
                    onChange={(e) => setCompany({ ...company, bankName: e.target.value })}
                    placeholder="e.g. NIC ASIA Bank Ltd."
                    className="mt-1 h-8 text-xs font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Account Holder Name</Label>
                  <Input
                    value={company.bankAccountName || ""}
                    onChange={(e) => setCompany({ ...company, bankAccountName: e.target.value })}
                    placeholder="e.g. Bageshwari Tractors Pvt. Ltd."
                    className="mt-1 h-8 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Bank Account Number</Label>
                  <Input
                    value={company.bankAccountNumber || ""}
                    onChange={(e) => setCompany({ ...company, bankAccountNumber: e.target.value })}
                    className="mt-1 h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Branch Name</Label>
                  <Input
                    value={company.bankBranch || ""}
                    onChange={(e) => setCompany({ ...company, bankBranch: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">SWIFT / IFSC Code</Label>
                  <Input
                    value={company.bankSwiftCode || ""}
                    onChange={(e) => setCompany({ ...company, bankSwiftCode: e.target.value })}
                    className="mt-1 h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. MASTER DEALER CREDIT POLICY TAB */}
        <TabsContent value="credit" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0b2d55]">
                <FileCheck2 className="h-4 w-4 text-blue-700" /> Master Dealer Credit Policy & Default Limits
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure platform-wide credit settings for onboarding new dealers and enforcing credit approvals.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
                <div>
                  <div className="font-bold text-xs text-slate-900">Enable Commercial Credit Facilities</div>
                  <div className="text-[11px] text-slate-500">
                    Allow authorized dealers to place orders on net credit terms (subject to approved credit limit).
                  </div>
                </div>
                <Switch
                  checked={company.enableDealerCredit ?? true}
                  onCheckedChange={(checked) => setCompany({ ...company, enableDealerCredit: checked })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Default Credit Limit (NPR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="10000"
                    value={company.defaultCreditLimit ?? 500000}
                    onChange={(e) =>
                      setCompany({ ...company, defaultCreditLimit: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 h-8 text-xs font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Pre-assigned limit for newly approved dealers</span>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Standard Credit Terms (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="180"
                    value={company.defaultCreditPeriodDays ?? 30}
                    onChange={(e) =>
                      setCompany({ ...company, defaultCreditPeriodDays: parseInt(e.target.value, 10) || 30 })
                    }
                    className="mt-1 h-8 text-xs font-bold"
                  />
                  <span className="text-[10px] text-slate-400">e.g. 30 Days Net, 45 Days, 60 Days</span>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Maximum Dealer Credit Ceiling (NPR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="50000"
                    value={company.maxCreditLimit ?? 5000000}
                    onChange={(e) =>
                      setCompany({ ...company, maxCreditLimit: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 h-8 text-xs font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Global upper cap per single dealership account</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Default Credit Agreement Terms & Policy Remarks</Label>
                <textarea
                  rows={3}
                  value={company.creditTermsPolicy || ""}
                  onChange={(e) => setCompany({ ...company, creditTermsPolicy: e.target.value })}
                  placeholder="Standard 30-Day Net B2B Commercial Credit Facility subject to approved limit and periodic account reconciliation."
                  className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <span className="text-[10px] text-slate-400">
                  Included in dealer credit statements and order confirmation vouchers.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. THEME & WEBSITE UI MANAGEMENT TAB */}
        <TabsContent value="theme" className="space-y-6">
          {/* Header Card */}
          <Card className="shadow-xs border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20">
            <CardHeader className="border-b pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-950">
                    <Palette className="h-4 w-4 text-indigo-600" /> Complete Theme & Website UI Management
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Customize brand color palettes, theme display mode, navigation header styling, component curves, and typography across the B2B portal.
                  </CardDescription>
                </div>
                <Badge className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 w-fit">
                  Live Customizer Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              {/* Presets Grid */}
              <div>
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> One-Click Curated Color Themes
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    {
                      name: "Bageshwari Navy",
                      primary: "#0b2d55",
                      accent: "#d97706",
                    },
                    {
                      name: "Agri Emerald",
                      primary: "#065f46",
                      accent: "#10b981",
                    },
                    {
                      name: "Industrial Slate",
                      primary: "#0f172a",
                      accent: "#ea580c",
                    },
                    {
                      name: "Ruby Tractors",
                      primary: "#881337",
                      accent: "#f43f5e",
                    },
                    {
                      name: "Deep Tech Indigo",
                      primary: "#1e1b4b",
                      accent: "#6366f1",
                    },
                    {
                      name: "Charcoal Steel",
                      primary: "#18181b",
                      accent: "#0891b2",
                    },
                  ].map((preset) => {
                    const isSelected =
                      themeConfig.primaryColor === preset.primary &&
                      themeConfig.accentColor === preset.accent;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() =>
                          setThemeConfig({
                            ...themeConfig,
                            primaryColor: preset.primary,
                            accentColor: preset.accent,
                          })
                        }
                        className={`p-3 rounded-xl border text-left transition-all relative ${
                          isSelected
                            ? "border-indigo-600 ring-2 ring-indigo-600/30 bg-indigo-50/50 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 mb-2">
                          <div
                            className="w-5 h-5 rounded-full border border-white shadow-xs"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-white shadow-xs"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <div className="text-xs font-bold text-slate-800 leading-tight">{preset.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{preset.primary}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Customizers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
                {/* Primary Brand Color */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Primary Brand & Header Color</span>
                      <span className="font-mono text-xs text-slate-500 font-normal">{themeConfig.primaryColor}</span>
                    </Label>
                    <span className="text-[11px] text-slate-500">
                      Dominant color for top navigation bar, primary action buttons, and document headers.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeConfig.primaryColor || "#0b2d55"}
                      onChange={(e) =>
                        setThemeConfig({ ...themeConfig, primaryColor: e.target.value })
                      }
                      className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white shadow-xs shrink-0"
                    />
                    <Input
                      type="text"
                      value={themeConfig.primaryColor || "#0b2d55"}
                      onChange={(e) =>
                        setThemeConfig({ ...themeConfig, primaryColor: e.target.value })
                      }
                      className="h-9 text-xs font-mono uppercase font-bold"
                      placeholder="#0b2d55"
                    />
                  </div>
                  {/* Swatches */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#0b2d55", "#0f172a", "#065f46", "#1e1b4b", "#881337", "#1e293b", "#18181b"].map(
                      (hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setThemeConfig({ ...themeConfig, primaryColor: hex })}
                          className={`w-6 h-6 rounded-md border transition-transform ${
                            themeConfig.primaryColor === hex
                              ? "scale-110 border-indigo-600 ring-2 ring-indigo-400"
                              : "border-slate-300 hover:scale-105"
                          }`}
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Accent / Action Color */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Accent & Highlight Color</span>
                      <span className="font-mono text-xs text-slate-500 font-normal">{themeConfig.accentColor}</span>
                    </Label>
                    <span className="text-[11px] text-slate-500">
                      Applied to badges, focus outlines, secondary buttons, and active tabs.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeConfig.accentColor || "#d97706"}
                      onChange={(e) =>
                        setThemeConfig({ ...themeConfig, accentColor: e.target.value })
                      }
                      className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white shadow-xs shrink-0"
                    />
                    <Input
                      type="text"
                      value={themeConfig.accentColor || "#d97706"}
                      onChange={(e) =>
                        setThemeConfig({ ...themeConfig, accentColor: e.target.value })
                      }
                      className="h-9 text-xs font-mono uppercase font-bold"
                      placeholder="#d97706"
                    />
                  </div>
                  {/* Swatches */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#d97706", "#ea580c", "#10b981", "#2563eb", "#6366f1", "#f43f5e", "#0891b2"].map(
                      (hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setThemeConfig({ ...themeConfig, accentColor: hex })}
                          className={`w-6 h-6 rounded-md border transition-transform ${
                            themeConfig.accentColor === hex
                              ? "scale-110 border-indigo-600 ring-2 ring-indigo-400"
                              : "border-slate-300 hover:scale-105"
                          }`}
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Theme Mode & Header Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
                {/* Theme Mode */}
                <div>
                  <Label className="text-xs font-bold text-slate-800 mb-1 block">Theme Display Mode</Label>
                  <span className="text-[11px] text-slate-500 block mb-2">
                    Default viewport lighting preference for administration and portal users.
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "light", label: "Light Mode", icon: Sun, desc: "High contrast daytime" },
                      { id: "dark", label: "Dark Mode", icon: Moon, desc: "OLED low-glare" },
                      { id: "system", label: "System Sync", icon: Monitor, desc: "Follows device OS" },
                    ].map((mode) => {
                      const Icon = mode.icon;
                      const active = (themeConfig.themeMode || "light") === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            setThemeConfig({
                              ...themeConfig,
                              themeMode: mode.id as "light" | "dark" | "system",
                            })
                          }
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            active
                              ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold ring-2 ring-indigo-500/20"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                          <span className="text-xs">{mode.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal leading-tight">{mode.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Header Style */}
                <div>
                  <Label className="text-xs font-bold text-slate-800 mb-1 block">Navigation Header Style</Label>
                  <span className="text-[11px] text-slate-500 block mb-2">
                    Visual styling for the portal top navigation bar and breadcrumb strip.
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "dark", label: "Solid Brand", desc: "Dark branded navbar" },
                      { id: "light", label: "Clean White", desc: "Minimal border & white" },
                      { id: "glassmorphic", label: "Glassmorphic", desc: "Backdrop blur modern" },
                    ].map((style) => {
                      const active = (themeConfig.headerStyle || "dark") === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() =>
                            setThemeConfig({
                              ...themeConfig,
                              headerStyle: style.id,
                            })
                          }
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            active
                              ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold ring-2 ring-indigo-500/20"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span className="text-xs">{style.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal leading-tight">{style.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tagline & Layout Geometry */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t">
                {/* Brand Tagline */}
                <div className="md:col-span-1">
                  <Label className="text-xs font-bold text-slate-800">Brand Tagline & Subtitle</Label>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    Featured across login banners, portal topbars, and PDF headers.
                  </span>
                  <Input
                    type="text"
                    value={themeConfig.brandTagline || ""}
                    onChange={(e) =>
                      setThemeConfig({ ...themeConfig, brandTagline: e.target.value })
                    }
                    placeholder="Authorized B2B Tractor Parts & Agricultural Machinery Distributor"
                    className="h-9 text-xs mt-1"
                  />
                </div>

                {/* Card Corner Radius */}
                <div>
                  <Label className="text-xs font-bold text-slate-800">Component Corner Radius</Label>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    Card, button, and input border curvature.
                  </span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { id: "rounded-md", label: "Sharp (6px)" },
                      { id: "rounded-xl", label: "Rounded (12px)" },
                      { id: "rounded-2xl", label: "Curved (16px)" },
                    ].map((radius) => {
                      const active = (themeConfig.cardRadius || "rounded-xl") === radius.id;
                      return (
                        <button
                          key={radius.id}
                          type="button"
                          onClick={() => setThemeConfig({ ...themeConfig, cardRadius: radius.id })}
                          className={`p-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                            active
                              ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-400/20"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {radius.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Table Density */}
                <div>
                  <Label className="text-xs font-bold text-slate-800">Data Grid Density</Label>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    Row padding in order tables & pick sheets.
                  </span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { id: "compact", label: "Compact" },
                      { id: "standard", label: "Standard" },
                      { id: "spacious", label: "Spacious" },
                    ].map((density) => {
                      const active = (themeConfig.tableDensity || "standard") === density.id;
                      return (
                        <button
                          key={density.id}
                          type="button"
                          onClick={() =>
                            setThemeConfig({ ...themeConfig, tableDensity: density.id })
                          }
                          className={`p-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                            active
                              ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-400/20"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {density.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* LIVE INTERACTIVE UI PREVIEW */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Live Interactive UI Preview (Real-time Render)
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-slate-500">
                    Previewing Active Palette: {themeConfig.primaryColor} / {themeConfig.accentColor}
                  </Badge>
                </div>

                {/* Simulated Portal Window */}
                <div
                  className={`border border-slate-300 bg-slate-100 overflow-hidden shadow-md ${
                    themeConfig.cardRadius || "rounded-xl"
                  }`}
                >
                  {/* Simulated Navbar */}
                  <div
                    className="p-3 text-white flex items-center justify-between border-b"
                    style={{
                      backgroundColor:
                        themeConfig.headerStyle === "light"
                          ? "#ffffff"
                          : themeConfig.headerStyle === "glassmorphic"
                          ? `${themeConfig.primaryColor}e6`
                          : themeConfig.primaryColor || "#0b2d55",
                      color: themeConfig.headerStyle === "light" ? "#0f172a" : "#ffffff",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-xs"
                        style={{ backgroundColor: themeConfig.accentColor || "#d97706" }}
                      >
                        BT
                      </div>
                      <div>
                        <div className="text-xs font-black tracking-tight">{company.companyName || "Bageshwari Tractors"}</div>
                        <div className="text-[9px] opacity-75 truncate max-w-[280px]">
                          {themeConfig.brandTagline || "Authorized B2B Tractor Parts & Agricultural Machinery"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: themeConfig.accentColor || "#d97706" }}
                      >
                        B2B Admin
                      </span>
                    </div>
                  </div>

                  {/* Simulated Body Content */}
                  <div className="p-4 space-y-4 bg-slate-50">
                    {/* Simulated Cards Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className={`p-3 bg-white border border-slate-200 shadow-2xs ${themeConfig.cardRadius || "rounded-xl"}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Packed Cartons</div>
                        <div className="text-lg font-black text-slate-900 mt-0.5">3 Cartons</div>
                        <span className="text-[10px] text-emerald-600 font-bold">Ready for Delivery Challan</span>
                      </div>
                      <div className={`p-3 bg-white border border-slate-200 shadow-2xs ${themeConfig.cardRadius || "rounded-xl"}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Released to Warehouse</div>
                        <div className="text-lg font-black text-slate-900 mt-0.5">4 Orders</div>
                        <span className="text-[10px] text-blue-600 font-bold">Pick Lists Assigned</span>
                      </div>
                      <div className={`p-3 bg-white border border-slate-200 shadow-2xs ${themeConfig.cardRadius || "rounded-xl"}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active VAT Rate</div>
                        <div className="text-lg font-black text-slate-900 mt-0.5">{company.defaultVatPercent}%</div>
                        <span className="text-[10px] text-purple-600 font-bold">Statutory VAT Applied</span>
                      </div>
                    </div>

                    {/* Simulated Table & Action Buttons */}
                    <div className={`bg-white border border-slate-200 overflow-hidden shadow-2xs ${themeConfig.cardRadius || "rounded-xl"}`}>
                      <div className="p-3 border-b bg-slate-50/70 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Sample Order Fulfillment Queue</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`px-3 py-1 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 ${
                              themeConfig.cardRadius || "rounded-lg"
                            }`}
                            style={{ backgroundColor: themeConfig.primaryColor || "#0b2d55" }}
                          >
                            Assign Picker
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 ${
                              themeConfig.cardRadius || "rounded-lg"
                            }`}
                            style={{ backgroundColor: themeConfig.accentColor || "#d97706" }}
                          >
                            Generate Pick Sheet
                          </button>
                        </div>
                      </div>

                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b text-[11px]">
                          <tr>
                            <th className="p-2.5">Order No</th>
                            <th className="p-2.5">Dealer</th>
                            <th className="p-2.5">Items</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-[11px]">
                          <tr className={themeConfig.tableDensity === "compact" ? "py-1" : themeConfig.tableDensity === "spacious" ? "py-3" : "py-2"}>
                            <td className="p-2.5 font-bold text-slate-900">ORD--00007</td>
                            <td className="p-2.5 text-slate-700">Bheri Agriculture House</td>
                            <td className="p-2.5 text-slate-600">9 Products (15 Pcs)</td>
                            <td className="p-2.5">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                                style={{ backgroundColor: themeConfig.accentColor || "#d97706" }}
                              >
                                Packed & Ready
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
