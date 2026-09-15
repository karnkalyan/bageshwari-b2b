"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, FileSpreadsheet, FileCode, CheckCircle2, AlertCircle, RefreshCw, Layers } from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
}

interface BulkProductManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerSlug: string;
  categories: CategoryOption[];
  onImportSuccess?: () => void;
}

export function BulkProductManagerModal({
  isOpen,
  onClose,
  sellerSlug,
  categories,
  onImportSuccess,
}: BulkProductManagerModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv" | "json">("xlsx");
  const [importFormat, setImportFormat] = useState<"xlsx" | "csv" | "json">("xlsx");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalReceived?: number;
    created?: number;
    updated?: number;
    errors?: string[];
    message?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = (format: "xlsx" | "csv" | "json") => {
    window.open(`/api/admin/products/bulk?action=template&format=${format}`, "_blank");
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    params.set("action", "export");
    params.set("format", exportFormat);
    if (selectedCategory && selectedCategory !== "ALL") {
      params.set("categoryId", selectedCategory);
    }
    window.open(`/api/admin/products/bulk?${params.toString()}`, "_blank");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setImportResult(null);

    const lower = file.name.toLowerCase();
    const isJson = lower.endsWith(".json");
    const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    setImportFormat(isJson ? "json" : isExcel ? "xlsx" : "csv");

    if (isExcel) {
      setFileContent("");
      setPreviewItems([
        {
          sku: "EXCEL WORKBOOK READY",
          name: file.name,
          category: `Size: ${(file.size / 1024).toFixed(1)} KB`,
          mrp: "Parsed on server",
          dealerPrice: "Auto-upserted",
          stock: "Ready to process",
        },
      ]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      setFileContent(text);

      if (isJson) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            setPreviewItems(parsed.slice(0, 5));
          } else if (parsed.products && Array.isArray(parsed.products)) {
            setPreviewItems(parsed.products.slice(0, 5));
          }
        } catch {
          setPreviewItems([]);
        }
      } else {
        // Simple CSV parse for preview
        const lines = text.trim().split("\n");
        if (lines.length > 1) {
          const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
          const sample = lines.slice(1, 6).map((line) => {
            const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => {
              obj[h] = values[i] || "";
            });
            return obj;
          });
          setPreviewItems(sample);
        } else {
          setPreviewItems([]);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!selectedFile && !fileContent) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      let res: Response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        res = await fetch("/api/admin/products/bulk", {
          method: "POST",
          body: formData,
        });
      } else {
        let bodyData: any;
        if (importFormat === "json") {
          try {
            const parsed = JSON.parse(fileContent);
            bodyData = Array.isArray(parsed) ? { products: parsed } : parsed;
          } catch {
            setImportResult({ success: false, errors: ["Invalid JSON file syntax."] });
            setIsImporting(false);
            return;
          }
        } else {
          bodyData = { csvContent: fileContent };
        }

        res = await fetch("/api/admin/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setImportResult({
          success: false,
          errors: [data.error || data.message || "Failed to process bulk import."],
        });
      } else {
        setImportResult({
          success: true,
          totalReceived: data.data?.totalReceived ?? data.totalReceived,
          created: data.data?.created ?? data.created,
          updated: data.data?.updated ?? data.updated,
          errors: data.data?.errors ?? data.errors,
          message: data.data?.message ?? data.message,
        });
        if (onImportSuccess) {
          onImportSuccess();
        }
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        errors: [err.message || "Network error occurred during import."],
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
            <Layers className="h-5 w-5 text-primary" />
            Bulk Product Management & Catalogue Operations
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Export catalogue by categories, download standardized templates, and bulk upsert products with automatic deduplication.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="import" className="text-xs font-semibold">
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Bulk Import / Upsert
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs font-semibold">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export Catalogue
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs font-semibold">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Sample Templates
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: IMPORT */}
          <TabsContent value="import" className="space-y-4 pt-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Smart Upsert Enabled:</span> If a product SKU already exists, its{" "}
                <span className="font-semibold underline">Dealer Price, Base MRP, and Stock Quantity</span> will be updated in-place without creating duplicate products or skipping rows.
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-primary/50 transition-colors bg-slate-50/50">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                className="hidden"
                onChange={handleFileChange}
              />
              <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">
                {fileName ? fileName : "Select Excel (.xlsx, .xls), CSV, or JSON file to import"}
              </div>
              <p className="text-xs text-slate-400 mt-1">Supports Microsoft Excel (.xlsx, .xls), UTF-8 CSV, or JSON</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-semibold"
                >
                  Choose File
                </Button>
                {fileName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFileName("");
                      setFileContent("");
                      setPreviewItems([]);
                      setImportResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-red-600 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* PREVIEW */}
            {previewItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>File Preview (First {previewItems.length} rows):</span>
                  <Badge variant="secondary" className="text-[10px]">
                    Format: {importFormat.toUpperCase()}
                  </Badge>
                </div>
                <div className="overflow-x-auto border rounded-lg bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                      <tr>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Name</th>
                        <th className="p-2 text-right">Dealer Price</th>
                        <th className="p-2 text-right">MRP</th>
                        <th className="p-2 text-right">Stock</th>
                        <th className="p-2">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700 font-mono">
                      {previewItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-primary">{item.sku || "—"}</td>
                          <td className="p-2 font-sans max-w-[150px] truncate">{item.name || "—"}</td>
                          <td className="p-2 text-right font-bold">
                            {item.dealerPrice !== undefined ? item.dealerPrice : "—"}
                          </td>
                          <td className="p-2 text-right">{item.mrp !== undefined ? item.mrp : "—"}</td>
                          <td className="p-2 text-right font-semibold">{item.stock !== undefined ? item.stock : 0}</td>
                          <td className="p-2 font-sans text-slate-500">{item.category || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* IMPORT RESULTS */}
            {importResult && (
              <div
                className={`rounded-lg p-3 text-xs border ${
                  importResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                {importResult.success ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" /> Import Processed Successfully!
                    </div>
                    <div>
                      Processed: <span className="font-bold">{importResult.totalReceived}</span> items |
                      Created: <span className="font-bold text-emerald-700">{importResult.created}</span> |
                      Updated: <span className="font-bold text-blue-700">{importResult.updated}</span>
                    </div>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="text-[11px] text-amber-800 mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                        <div className="font-semibold">Noticeable notices:</div>
                        <ul className="list-disc pl-4 space-y-0.5 mt-1">
                          {importResult.errors.slice(0, 5).map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-red-800">
                      <AlertCircle className="h-4 w-4" /> Bulk Import Failed
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {importResult.errors?.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isImporting}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteImport}
                disabled={!fileContent || isImporting}
                className="font-bold"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Processing Import...
                  </>
                ) : (
                  "Execute Bulk Upsert"
                )}
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: EXPORT */}
          <TabsContent value="export" className="space-y-4 pt-3">
            <div className="bg-slate-50 border rounded-lg p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Filter by Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">All Categories (Entire Catalogue)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Export File Format:</label>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="xlsx"
                      checked={exportFormat === "xlsx"}
                      onChange={() => setExportFormat("xlsx")}
                    />
                    Excel Workbook (.xlsx)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === "csv"}
                      onChange={() => setExportFormat("csv")}
                    />
                    CSV (Spreadsheet Compatible)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="json"
                      checked={exportFormat === "json"}
                      onChange={() => setExportFormat("json")}
                    />
                    JSON Data Array
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleExport} className="font-bold gap-1.5">
                <Download className="h-3.5 w-3.5" /> Download Product Export
              </Button>
            </div>
          </TabsContent>

          {/* TAB 3: SAMPLE TEMPLATES */}
          <TabsContent value="templates" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                    Excel (.xlsx) Template
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Pre-formatted Microsoft Excel template with styled headers, sample rows, and auto-width columns.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadTemplate("xlsx")}
                  className="w-full text-xs font-semibold gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100"
                >
                  <Download className="h-3.5 w-3.5" /> Download Excel Template
                </Button>
              </div>

              <div className="border rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    CSV Sample Template
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Standard comma-separated format compatible with Microsoft Excel, LibreOffice, and Google Sheets.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadTemplate("csv")}
                  className="w-full text-xs font-semibold gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV Template
                </Button>
              </div>

              <div className="border rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                    <FileCode className="h-4 w-4 text-blue-600" />
                    JSON Sample Template
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Structured array of product objects for automated integrations, developer imports, and script syncing.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadTemplate("json")}
                  className="w-full text-xs font-semibold gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Download JSON Template
                </Button>
              </div>
            </div>

            <div className="bg-slate-100 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Template Specifications:</div>
              <div>• Required fields: <code className="bg-white px-1 py-0.5 rounded font-mono">sku</code>, <code className="bg-white px-1 py-0.5 rounded font-mono">name</code></div>
              <div>• Pricing fields: <code className="bg-white px-1 py-0.5 rounded font-mono">dealerPrice</code>, <code className="bg-white px-1 py-0.5 rounded font-mono">mrp</code> (Dealer Price is the default invoice/purchase rate)</div>
              <div>• Inventory: <code className="bg-white px-1 py-0.5 rounded font-mono">stock</code> (sets available physical inventory)</div>
              <div>• Optional fields: <code className="bg-white px-1 py-0.5 rounded font-mono">category</code>, <code className="bg-white px-1 py-0.5 rounded font-mono">brand</code>, <code className="bg-white px-1 py-0.5 rounded font-mono">taxPercent</code>, <code className="bg-white px-1 py-0.5 rounded font-mono">unitCode</code></div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
