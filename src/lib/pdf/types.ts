import type { CompanyProfile, Dealer, Order, OrderItem, FinalInvoice, ProformaInvoice, PickList, Package, Shipment } from "@prisma/client";

export type OrderDocumentKind =
  | "sales-order"
  | "proforma"
  | "pick-list"
  | "final-invoice"
  | "dispatch-challan"
  | "shipping-label"
  | "package-labels";

export interface CompanyInfo {
  legalName: string;
  tradingName: string;
  panNumber: string;
  vatNumber?: string | null;
  registrationNumber?: string | null;
  address: string;
  city: string;
  district: string;
  province?: string | null;
  phone: string;
  email: string;
  website?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankBranch?: string | null;
  bankSwiftCode?: string | null;
}

export interface DealerInfo {
  legalName: string;
  tradingName?: string | null;
  code: string;
  taxNumber?: string | null;
  registrationNumber?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
}

export interface LineItemDto {
  sn: number;
  sku: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxAmount?: number;
  lineTotal: number;
  hsnCode?: string | null;
  rackLocation?: string | null;
  binLocation?: string | null;
}
