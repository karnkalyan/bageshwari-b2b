import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string,
  currencyCode: string = "NPR"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${currencyCode} 0.00`;

  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kathmandu",
    ...options,
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export function generateCode(prefix: string, num: number, padLength = 5): string {
  return `${prefix}${String(num).padStart(padLength, "0")}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_ACCOUNTS_REVIEW: "Pending Accounts Review",
  ACCOUNTS_REVIEW_IN_PROGRESS: "Accounts Review",
  WAITING_FOR_DEALER_CONFIRMATION: "Awaiting Dealer Confirmation",
  DEALER_CHANGE_REQUESTED: "Dealer Change Requested",
  FINAL_ORDER_CONFIRMED: "Order Confirmed",
  PROFORMA_INVOICE_GENERATED: "Proforma Generated",
  PROFORMA_INVOICE_CONFIRMED: "Proforma Confirmed",
  READY_FOR_WAREHOUSE: "Ready for Warehouse",
  PICK_LIST_GENERATED: "Pick List Generated",
  PICKING_IN_PROGRESS: "Picking in Progress",
  PARTIALLY_PICKED: "Partially Picked",
  PICKING_COMPLETED: "Picking Completed",
  PICKING_EXCEPTION: "Picking Exception",
  PICK_LIST_COMPLETED: "Pick List Completed",
  FINAL_INVOICE_ISSUED: "Invoice Issued",
  PAYMENT_PENDING: "Payment Pending",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  CREDIT_PENDING: "Credit Pending",
  CREDIT_APPROVED: "Credit Approved",
  PAYMENT_ON_HOLD: "Payment on Hold",
  PAYMENT_OVERDUE: "Payment Overdue",
  PACKING_IN_PROGRESS: "Packing",
  PACKED: "Packed",
  PACKED_AND_LABELLED: "Packed & Labelled",
  SHIPPED: "Shipped",
  IN_TRANSIT: "In Transit",
  PARTIALLY_DELIVERED: "Partially Delivered",
  DELIVERED: "Delivered",
  DELIVERY_FAILED: "Delivery Failed",
  RETURNED: "Returned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_ACCOUNTS_REVIEW: "bg-yellow-100 text-yellow-800",
  ACCOUNTS_REVIEW_IN_PROGRESS: "bg-blue-100 text-blue-800",
  WAITING_FOR_DEALER_CONFIRMATION: "bg-orange-100 text-orange-800",
  DEALER_CHANGE_REQUESTED: "bg-red-100 text-red-800",
  FINAL_ORDER_CONFIRMED: "bg-green-100 text-green-800",
  PROFORMA_INVOICE_GENERATED: "bg-indigo-100 text-indigo-800",
  PROFORMA_INVOICE_CONFIRMED: "bg-indigo-200 text-indigo-900",
  READY_FOR_WAREHOUSE: "bg-purple-100 text-purple-800",
  PICK_LIST_GENERATED: "bg-violet-100 text-violet-800",
  PICKING_IN_PROGRESS: "bg-amber-100 text-amber-800",
  PICKING_COMPLETED: "bg-emerald-100 text-emerald-800",
  PICKING_EXCEPTION: "bg-red-200 text-red-900",
  PICK_LIST_COMPLETED: "bg-teal-100 text-teal-800",
  FINAL_INVOICE_ISSUED: "bg-cyan-100 text-cyan-800",
  PAYMENT_PENDING: "bg-yellow-200 text-yellow-900",
  PAID: "bg-green-200 text-green-900",
  SHIPPED: "bg-blue-200 text-blue-900",
  IN_TRANSIT: "bg-sky-100 text-sky-800",
  DELIVERED: "bg-green-300 text-green-900",
  COMPLETED: "bg-emerald-200 text-emerald-900",
  CANCELLED: "bg-gray-200 text-gray-600",
};
