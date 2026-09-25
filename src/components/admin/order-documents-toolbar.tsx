"use client";

import { useState } from "react";
import {
  FileText,
  Warehouse,
  ShieldCheck,
  PackageCheck,
  Tag,
  Truck,
  FileImage,
  Printer,
  ChevronDown,
} from "lucide-react";

export type SupportedPaperSize = "A4" | "A5" | "Letter" | "Legal";
export type CartonLayout = "a4_4" | "a4_2" | "a4_1" | "thermal";

interface OrderDocumentsToolbarProps {
  orderId: string;
  isSentToWarehouse: boolean;
  hasProforma: boolean;
  hasPickList: boolean;
  hasFinalInvoice: boolean;
  hasPackingList: boolean;
  packageCount: number;
  hasShipment: boolean;
  isPaymentConfirmed: boolean;
  theme?: "dark" | "light";
}

export function OrderDocumentsToolbar({
  orderId,
  isSentToWarehouse,
  hasProforma,
  hasPickList,
  hasFinalInvoice,
  hasPackingList,
  packageCount,
  hasShipment,
  isPaymentConfirmed,
  theme = "dark",
}: OrderDocumentsToolbarProps) {
  const [paperSize, setPaperSize] = useState<SupportedPaperSize>("A4");
  const [cartonLayout, setCartonLayout] = useState<CartonLayout>("a4_4");

  const isDark = theme === "dark";

  const getDocUrl = (
    kind: string,
    options?: { format?: "jpeg"; download?: boolean; layout?: string }
  ) => {
    const params = new URLSearchParams();
    if (paperSize !== "A4") {
      params.set("pageSize", paperSize);
    }
    if (options?.layout) {
      params.set("layout", options.layout);
    }
    if (options?.format) {
      params.set("format", options.format);
    }
    if (options?.download) {
      params.set("download", "1");
    }
    const query = params.toString();
    return `/api/orders/${orderId}/documents/${kind}${query ? `?${query}` : ""}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Paper Size Selector */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
          isDark
            ? "bg-slate-900 border-slate-700 text-slate-200"
            : "bg-white border-slate-300 text-slate-700 shadow-2xs"
        }`}
        title="Adjust printing paper size for all PDF and JPEG downloads"
      >
        <Printer className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Paper:
        </span>
        <select
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value as SupportedPaperSize)}
          className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-1 ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
          aria-label="Select Paper Size"
        >
          <option value="A4" className={isDark ? "bg-slate-900 text-white" : ""}>
            A4 (Standard)
          </option>
          <option value="A5" className={isDark ? "bg-slate-900 text-white" : ""}>
            A5 (Compact / Half)
          </option>
          <option value="Letter" className={isDark ? "bg-slate-900 text-white" : ""}>
            Letter (8.5 x 11")
          </option>
          <option value="Legal" className={isDark ? "bg-slate-900 text-white" : ""}>
            Legal (8.5 x 14")
          </option>
        </select>
      </div>

      {/* 1. Sales Order */}
      {isSentToWarehouse ? (
        <div
          className={`inline-flex items-center rounded-lg border overflow-hidden shadow-2xs ${
            isDark ? "border-slate-700 bg-slate-800" : "border-slate-300 bg-slate-100"
          }`}
        >
          <a
            href={getDocUrl("sales-order")}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title={`View Sales Order PDF (${paperSize})`}
          >
            <FileText className="h-3.5 w-3.5" /> Sales Order ({paperSize})
          </a>
          <a
            href={getDocUrl("sales-order", { format: "jpeg", download: true })}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold border-l transition ${
              isDark
                ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700"
                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-300"
            }`}
            title={`Download Sales Order as JPEG (${paperSize})`}
          >
            <FileImage className="h-3.5 w-3.5" /> JPEG
          </a>
        </div>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-not-allowed ${
            isDark
              ? "bg-slate-800/60 text-slate-500 border-slate-800"
              : "bg-slate-100 text-slate-400 border-slate-200"
          }`}
          title="Sales Order document is available after release to warehouse."
        >
          <FileText className="h-3.5 w-3.5" /> Sales Order (Pending)
        </span>
      )}

      {/* 2. Proforma Invoice */}
      {hasProforma ? (
        <div
          className={`inline-flex items-center rounded-lg border overflow-hidden shadow-2xs ${
            isDark ? "border-indigo-700 bg-indigo-900/90" : "border-indigo-200 bg-indigo-50"
          }`}
        >
          <a
            href={getDocUrl("proforma")}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${
              isDark
                ? "bg-indigo-900/90 hover:bg-indigo-800 text-indigo-200"
                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-800"
            }`}
            title={`View Proforma Invoice PDF (${paperSize})`}
          >
            <FileText className="h-3.5 w-3.5" /> Proforma ({paperSize})
          </a>
          <a
            href={getDocUrl("proforma", { format: "jpeg", download: true })}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold border-l transition ${
              isDark
                ? "bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border-indigo-700"
                : "bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200"
            }`}
            title={`Download Proforma Invoice as JPEG (${paperSize})`}
          >
            <FileImage className="h-3.5 w-3.5" /> JPEG
          </a>
        </div>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-not-allowed ${
            isDark
              ? "bg-slate-800/60 text-slate-500 border-slate-800"
              : "bg-slate-100 text-slate-400 border-slate-200"
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Proforma (Pending)
        </span>
      )}

      {/* 3. Pick List (Warehouse) */}
      {isPaymentConfirmed && hasPickList ? (
        <div
          className={`inline-flex items-center rounded-lg border overflow-hidden shadow-2xs ${
            isDark ? "border-teal-700 bg-teal-900/90" : "border-teal-300 bg-teal-50"
          }`}
        >
          <a
            href={getDocUrl("pick-list")}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${
              isDark
                ? "bg-teal-900/90 hover:bg-teal-800 text-teal-200"
                : "bg-teal-50 hover:bg-teal-100 text-teal-900"
            }`}
            title={`View Pick List PDF (${paperSize})`}
          >
            <Warehouse className="h-3.5 w-3.5" /> Pick List ({paperSize})
          </a>
          <a
            href={getDocUrl("pick-list", { format: "jpeg", download: true })}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold border-l transition ${
              isDark
                ? "bg-teal-950 hover:bg-teal-900 text-teal-300 border-teal-700"
                : "bg-white hover:bg-teal-50 text-teal-800 border-teal-300"
            }`}
            title={`Download Pick List as JPEG (${paperSize})`}
          >
            <FileImage className="h-3.5 w-3.5" /> JPEG
          </a>
        </div>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-not-allowed ${
            isDark
              ? "bg-slate-800/60 text-slate-500 border-slate-800"
              : "bg-slate-100 text-slate-400 border-slate-200"
          }`}
          title={
            !isPaymentConfirmed
              ? "Available after payment confirmation"
              : "Pick list pending warehouse generation"
          }
        >
          <Warehouse className="h-3.5 w-3.5" /> Pick List{" "}
          {!isPaymentConfirmed ? "(Locked)" : "(Pending)"}
        </span>
      )}

      {/* 4. VAT Tax Invoice */}
      {hasFinalInvoice ? (
        <div
          className={`inline-flex items-center rounded-lg border overflow-hidden shadow-2xs ${
            isDark ? "border-cyan-700 bg-cyan-900/90" : "border-cyan-300 bg-cyan-50"
          }`}
        >
          <a
            href={getDocUrl("final-invoice")}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${
              isDark
                ? "bg-cyan-900/90 hover:bg-cyan-800 text-cyan-200"
                : "bg-cyan-50 hover:bg-cyan-100 text-cyan-900"
            }`}
            title={`View Tax Invoice PDF (${paperSize})`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Tax Invoice ({paperSize})
          </a>
          <a
            href={getDocUrl("final-invoice", { format: "jpeg", download: true })}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold border-l transition ${
              isDark
                ? "bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border-cyan-700"
                : "bg-white hover:bg-cyan-50 text-cyan-800 border-cyan-200"
            }`}
            title={`Download Tax Invoice as JPEG (${paperSize})`}
          >
            <FileImage className="h-3.5 w-3.5" /> JPEG
          </a>
        </div>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-not-allowed ${
            isDark
              ? "bg-slate-800/60 text-slate-500 border-slate-800"
              : "bg-slate-100 text-slate-400 border-slate-200"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Tax Invoice (Pending)
        </span>
      )}

      {/* 5. Packaging List */}
      {isPaymentConfirmed && (hasPackingList || packageCount > 0) ? (
        <div
          className={`inline-flex items-center rounded-lg border overflow-hidden shadow-2xs ${
            isDark ? "border-emerald-700 bg-emerald-900/90" : "border-emerald-300 bg-emerald-50"
          }`}
        >
          <a
            href={getDocUrl("packing-list")}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${
              isDark
                ? "bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900"
            }`}
            title={`View Packaging List PDF (${paperSize})`}
          >
            <PackageCheck className="h-3.5 w-3.5" /> Packing List ({paperSize})
          </a>
          <a
            href={getDocUrl("packing-list", { format: "jpeg", download: true })}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold border-l transition ${
              isDark
                ? "bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-700"
                : "bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300"
            }`}
            title={`Download Packaging List as JPEG (${paperSize})`}
          >
            <FileImage className="h-3.5 w-3.5" /> JPEG
          </a>
        </div>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-not-allowed ${
            isDark
              ? "bg-slate-800/60 text-slate-500 border-slate-800"
              : "bg-slate-100 text-slate-400 border-slate-200"
          }`}
          title={
            !isPaymentConfirmed
              ? "Available after payment confirmation and warehouse release"
              : "Packaging pending"
          }
        >
          <PackageCheck className="h-3.5 w-3.5" /> Packing List{" "}
          {!isPaymentConfirmed ? "(Locked)" : "(Pending)"}
        </span>
      )}

      {/* 6. Carton Labels */}
      {isPaymentConfirmed && packageCount > 0 ? (
        <div
          className={`inline-flex items-center rounded-lg border overflow-hidden shadow-2xs ${
            isDark ? "border-amber-700 bg-amber-900/90" : "border-amber-300 bg-amber-50"
          }`}
        >
          <div
            className={`flex items-center px-1.5 border-r ${
              isDark ? "border-amber-700/80 bg-amber-950/60" : "border-amber-200 bg-amber-100/50"
            }`}
          >
            <select
              value={cartonLayout}
              onChange={(e) => setCartonLayout(e.target.value as CartonLayout)}
              className={`bg-transparent text-[11px] font-medium focus:outline-none cursor-pointer py-1 ${
                isDark ? "text-amber-200" : "text-amber-900"
              }`}
              title="Carton Sticker Layout Grid"
            >
              <option value="a4_4" className={isDark ? "bg-slate-900 text-white" : ""}>
                4 / Page (2x2)
              </option>
              <option value="a4_2" className={isDark ? "bg-slate-900 text-white" : ""}>
                2 / Page
              </option>
              <option value="a4_1" className={isDark ? "bg-slate-900 text-white" : ""}>
                1 / Page
              </option>
              <option value="thermal" className={isDark ? "bg-slate-900 text-white" : ""}>
                Thermal 100mm
              </option>
            </select>
          </div>
          <a
            href={getDocUrl("package-labels", { layout: cartonLayout })}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${
              isDark
                ? "bg-amber-900/90 hover:bg-amber-800 text-amber-200"
                : "bg-amber-50 hover:bg-amber-100 text-amber-900"
            }`}
            title={`View Carton Labels PDF (${paperSize}, ${cartonLayout})`}
          >
            <Tag className="h-3.5 w-3.5" /> Carton Labels ({packageCount})
          </a>
          <a
            href={getDocUrl("package-labels", {
              layout: cartonLayout,
              format: "jpeg",
              download: true,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold border-l transition ${
              isDark
                ? "bg-amber-950 hover:bg-amber-900 text-amber-300 border-amber-700"
                : "bg-white hover:bg-amber-50 text-amber-900 border-amber-300"
            }`}
            title={`Download Carton Labels as JPEG (${paperSize}, ${cartonLayout})`}
          >
            <FileImage className="h-3.5 w-3.5" /> JPEG
          </a>
        </div>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-not-allowed ${
            isDark
              ? "bg-slate-800/60 text-slate-500 border-slate-800"
              : "bg-slate-100 text-slate-400 border-slate-200"
          }`}
        >
          <Tag className="h-3.5 w-3.5" /> Labels {!isPaymentConfirmed ? "(Locked)" : "(Pending)"}
        </span>
      )}

      {/* 7. Delivery Challan */}
      {isPaymentConfirmed && hasShipment ? (
        <div
          className={`inline-flex items-center rounded-lg border overflow-hidden shadow-2xs ${
            isDark ? "border-blue-700 bg-blue-900/90" : "border-blue-300 bg-blue-50"
          }`}
        >
          <a
            href={getDocUrl("dispatch-challan")}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${
              isDark
                ? "bg-blue-900/90 hover:bg-blue-800 text-blue-200"
                : "bg-blue-50 hover:bg-blue-100 text-blue-900"
            }`}
            title={`View Delivery Challan PDF (${paperSize})`}
          >
            <Truck className="h-3.5 w-3.5" /> Delivery Challan ({paperSize})
          </a>
          <a
            href={getDocUrl("dispatch-challan", { format: "jpeg", download: true })}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold border-l transition ${
              isDark
                ? "bg-blue-950 hover:bg-blue-900 text-blue-300 border-blue-700"
                : "bg-white hover:bg-blue-50 text-blue-800 border-blue-200"
            }`}
            title={`Download Delivery Challan as JPEG (${paperSize})`}
          >
            <FileImage className="h-3.5 w-3.5" /> JPEG
          </a>
        </div>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-not-allowed ${
            isDark
              ? "bg-slate-800/60 text-slate-500 border-slate-800"
              : "bg-slate-100 text-slate-400 border-slate-200"
          }`}
        >
          <Truck className="h-3.5 w-3.5" /> Challan (Pending Shipment)
        </span>
      )}
    </div>
  );
}
