import { describe, it, expect } from "vitest";
import {
  renderTaxInvoicePdf,
  renderProformaInvoicePdf,
  renderPickListPdf,
  renderSalesOrderPdf,
  renderPackageLabelPdf,
  renderDispatchChallanPdf,
  renderPackingListPdf,
  renderProductBarcodeLabelPdf,
} from "./templates";

const mockCompany = {
  legalName: "Bageshwari Tractors Pvt. Ltd.",
  tradingName: "Bageshwari Tractors",
  panNumber: "302918239",
  vatNumber: "302918239",
  registrationNumber: "29384/078/079",
  address: "Main Highway Road",
  city: "Nepalgunj",
  district: "Banke",
  province: "Lumbini Province",
  phone: "+977-81-520123",
  email: "info@bageshwari.com.np",
  website: "https://bageshwari.com.np",
  bankName: "NIC ASIA Bank Ltd.",
  bankAccountName: "Bageshwari Tractors Pvt. Ltd.",
  bankAccountNumber: "0194291823901928",
  bankBranch: "Nepalgunj Main Branch",
  bankSwiftCode: "NICA-NP",
};

const mockDealer = {
  legalName: "Karnali Agro Traders Pvt. Ltd.",
  tradingName: "Karnali Agro Traders",
  code: "DLR-0042",
  taxNumber: "601928374",
  contactName: "Birendra Shrestha",
  phone: "+977-9858012345",
  email: "birendra@karnaliagro.com",
  addressLine1: "Surkhet Road",
  city: "Birendranagar",
  district: "Surkhet",
  province: "Karnali",
};

const mockItems = [
  {
    sn: 1,
    sku: "SW-CLUTCH-01",
    description: "Swaraj 735 FE Heavy Duty Clutch Plate Assembly",
    unit: "PCS",
    quantity: 4,
    unitPrice: 12500,
    discountAmount: 1000,
    lineTotal: 49000,
  },
  {
    sn: 2,
    sku: "MF-FLTR-HYD",
    description: "Massey Ferguson 241 DI Hydraulic Filter Cartridge",
    unit: "PCS",
    quantity: 10,
    unitPrice: 1850,
    discountAmount: 500,
    lineTotal: 18000,
  },
];

describe("PDF Template Renderers", () => {
  it("renders Tax Invoice PDF bytes successfully", async () => {
    const bytes = await renderTaxInvoicePdf({
      invoiceNumber: "INV-2026-00088",
      issueDate: new Date(),
      orderNumber: "ORD-2026-00109",
      company: mockCompany,
      dealer: mockDealer,
      items: mockItems,
      subtotal: 67000,
      discountTotal: 1500,
      taxTotal: 8710,
      freightTotal: 1200,
      grandTotal: 75410,
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    // PDF Magic bytes: %PDF
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders Proforma Invoice PDF bytes successfully", async () => {
    const bytes = await renderProformaInvoicePdf({
      proformaNumber: "PI-2026-00012",
      issueDate: new Date(),
      orderNumber: "ORD-2026-00109",
      company: mockCompany,
      dealer: mockDealer,
      items: mockItems,
      subtotal: 67000,
      discountTotal: 1500,
      taxTotal: 8710,
      freightTotal: 1200,
      grandTotal: 75410,
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders Pick List PDF bytes successfully", async () => {
    const bytes = await renderPickListPdf({
      pickListNumber: "PL-2026-00005",
      orderNumber: "ORD-2026-00109",
      warehouseName: "Central Fulfillment Depot - Nepalgunj",
      createdAt: new Date(),
      company: mockCompany,
      dealer: mockDealer,
      items: mockItems,
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders Sales Order PDF bytes successfully", async () => {
    const bytes = await renderSalesOrderPdf({
      orderNumber: "ORD-2026-00109",
      orderDate: new Date(),
      source: "DEALER_PORTAL",
      status: "FINAL_ORDER_CONFIRMED",
      company: mockCompany,
      dealer: mockDealer,
      items: mockItems,
      subtotal: 67000,
      discountTotal: 1500,
      taxTotal: 8710,
      freightTotal: 1200,
      grandTotal: 75410,
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders Carton Shipping Label PDF bytes successfully", async () => {
    const bytes = await renderPackageLabelPdf({
      packageNumber: "PKG-2026-00045",
      cartonIndex: 1,
      totalCartons: 3,
      orderNumber: "ORD-2026-00109",
      weight: 14.5,
      company: mockCompany,
      dealer: mockDealer,
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders Dispatch Delivery Challan PDF bytes successfully", async () => {
    const bytes = await renderDispatchChallanPdf({
      challanNumber: "CHL-2026-00034",
      shipmentNumber: "SHP-2026-00012",
      dispatchDate: new Date(),
      orderNumber: "ORD-2026-00109",
      company: mockCompany,
      dealer: mockDealer,
      transporterName: "Karnali Express Freight",
      driverName: "Hari Bahadur Thapa",
      driverPhone: "+977-9848011223",
      vehicleNumber: "Lu 1 Kha 8832",
      totalCartons: 3,
      totalWeight: 42.5,
      packages: [
        { packageNumber: "PKG-2026-00045", packageType: "Heavy Box", weight: 14.5 },
        { packageNumber: "PKG-2026-00046", packageType: "Heavy Box", weight: 15.0 },
        { packageNumber: "PKG-2026-00047", packageType: "Heavy Box", weight: 13.0 },
      ],
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders Product Barcode Label PDF bytes with VAT Included successfully", async () => {
    const bytes = await renderProductBarcodeLabelPdf({
      name: "Swaraj 735 FE Heavy Duty Clutch Plate Assembly",
      sku: "SW-CLUTCH-01",
      barcode: "SW-CLUTCH-01",
      mrp: 14500,
      vatPercent: 13,
      mrpInclVat: 16385,
      categoryName: "Clutch & Transmission",
      brandName: "Swaraj Genuine",
      unitCode: "PCS",
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders Detailed Packaging List PDF bytes with carton manifest successfully", async () => {
    const bytes = await renderPackingListPdf({
      packingListNumber: "PKL-2026-00018",
      orderNumber: "ORD-2026-00109",
      shipmentNumber: "SHP-2026-00012",
      challanNumber: "CHL-2026-00034",
      packingDate: new Date(),
      company: mockCompany,
      dealer: mockDealer,
      totalCartons: 3,
      totalWeight: 42.5,
      warehouseName: "Nepalgunj Central Warehouse",
      packedByName: "Bikram Thapa",
      packages: [
        {
          packageNumber: "PKG-2026-00045",
          boxIndex: 1,
          totalBoxes: 3,
          packageType: "Heavy Corrugated Box",
          weight: 14.5,
          length: 45,
          width: 35,
          height: 25,
          handlingInstructions: "Sealed Clutch Assemblies",
          items: [{ sku: "SW-CLUTCH-01", name: "Swaraj Clutch Plate", quantity: 4, unit: "PCS" }],
        },
        {
          packageNumber: "PKG-2026-00046",
          boxIndex: 2,
          totalBoxes: 3,
          packageType: "Heavy Corrugated Box",
          weight: 15.0,
          length: 40,
          width: 30,
          height: 20,
          handlingInstructions: "Hydraulic Filters",
          items: [{ sku: "MF-FLTR-HYD", name: "Hydraulic Filter Cartridge", quantity: 10, unit: "PCS" }],
        },
        {
          packageNumber: "PKG-2026-00047",
          boxIndex: 3,
          totalBoxes: 3,
          packageType: "Heavy Corrugated Box",
          weight: 13.0,
          length: 30,
          width: 25,
          height: 15,
          handlingInstructions: "Gasket Sets",
          items: [],
        },
      ],
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });
});
