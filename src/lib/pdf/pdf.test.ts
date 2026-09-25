import { describe, it, expect } from "vitest";
import {
  renderTaxInvoicePdf,
  renderProformaInvoicePdf,
  renderPickListPdf,
  renderSalesOrderPdf,
  renderPackageLabelPdf,
  renderPackageLabelsPdf,
  renderDispatchChallanPdf,
  renderPackingListPdf,
  renderProductBarcodeLabelPdf,
} from "./templates";
import { formatFullAddress } from "./helpers";
import { convertPdfToJpeg } from "./pdf-to-jpeg";

const mockCompany = {
  legalName: "Bageshwari Tractors",
  tradingName: "Bageshwari Tractors",
  panNumber: "302918239",
  vatNumber: "302918239",
  registrationNumber: "29384/078/079",
  address: "Nepalgunj, Banke",
  city: "Nepalgunj",
  district: "Banke",
  province: "Lumbini Province",
  phone: "+977-81-520123",
  email: "info@bageshwari.com.np",
  website: "https://bageshwari.com.np",
  bankName: "NIC ASIA Bank Ltd.",
  bankAccountName: "Bageshwari Tractors",
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

  it("renders 4 carton labels on a single A4 page in 2x2 grid layout", async () => {
    const packages = [1, 2, 3, 4].map((idx) => ({
      packageNumber: `PKG-2026-00045-${idx}`,
      cartonIndex: idx,
      totalCartons: 4,
      orderNumber: "ORD-2026-00109",
      weight: 10 + idx,
      company: mockCompany,
      dealer: mockDealer,
    }));

    const bytes = await renderPackageLabelsPdf(packages, "a4_4");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(2000);
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
      items: mockItems,
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

  it("renders 32x20 micro thermal sticker without overlapping for TYRPAT7-03678", async () => {
    const bytes = await renderProductBarcodeLabelPdf({
      name: "TYRE PATCH 7 NO",
      sku: "TYRPAT7-03678",
      barcode: "TYRPAT7-03678",
      mrp: 500,
      vatPercent: 13,
      companyName: "BAGESHWARI TRACTORS",
      stickerSize: "32x20",
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders 32x20 micro thermal sticker gracefully with long SKU (stacked layout)", async () => {
    const bytes = await renderProductBarcodeLabelPdf({
      name: "Swaraj 735 FE Heavy Duty Clutch Plate Assembly",
      sku: "SWARAJ-735-FE-CLUTCH-PLATE-01",
      barcode: "SWARAJ-735-FE-CLUTCH-PLATE-01",
      mrp: 14500,
      vatPercent: 13,
      companyName: "BAGESHWARI TRACTORS, NEPALGUNJ",
      stickerSize: "32x20",
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

  describe("formatFullAddress helper", () => {
    it("deduplicates address when address already contains city, district, and country", () => {
      const formatted = formatFullAddress(
        "Main Highway Road, Nepalgunj, Banke, Nepal",
        "Nepalgunj",
        "Banke",
        "Nepal"
      );
      expect(formatted).toBe("Main Highway Road, Nepalgunj, Banke, Nepal");
    });

    it("deduplicates address when address has street and city/district only", () => {
      const formatted = formatFullAddress(
        "Nepalgunj, Banke",
        "Nepalgunj",
        "Banke",
        "Nepal"
      );
      expect(formatted).toBe("Nepalgunj, Banke, Nepal");
    });

    it("combines distinct street, city, district, and country without repeating", () => {
      const formatted = formatFullAddress(
        "Main Highway Road",
        "Nepalgunj",
        "Banke",
        "Nepal"
      );
      expect(formatted).toBe("Main Highway Road, Nepalgunj, Banke, Nepal");
    });

    it("handles missing address gracefully", () => {
      const formatted = formatFullAddress(
        null,
        "Nepalgunj",
        "Banke",
        "Nepal"
      );
      expect(formatted).toBe("Nepalgunj, Banke, Nepal");
    });
  });

  describe("convertPdfToJpeg", () => {
    it("converts a rendered PDF into valid JPEG bytes with correct magic header", async () => {
      const pdfBytes = await renderPackageLabelPdf({
        packageNumber: "PKG-2026-TEST",
        cartonIndex: 1,
        totalCartons: 1,
        orderNumber: "ORD-2026-TEST",
        weight: 5.2,
        company: mockCompany,
        dealer: mockDealer,
      });

      const jpegBytes = await convertPdfToJpeg(pdfBytes, { scale: 1.5, quality: 85 });
      expect(jpegBytes).toBeInstanceOf(Uint8Array);
      expect(jpegBytes.length).toBeGreaterThan(1000);

      // Verify JPEG magic bytes: 0xFF, 0xD8, 0xFF
      expect(jpegBytes[0]).toBe(0xff);
      expect(jpegBytes[1]).toBe(0xd8);
      expect(jpegBytes[2]).toBe(0xff);
    });
  });

  describe("Adjustable Paper Sizes (A4, A5, Letter, Legal)", () => {
    it("renders Tax Invoice in A5 compact format", async () => {
      const bytes = await renderTaxInvoicePdf({
        invoiceNumber: "INV-A5-001",
        issueDate: new Date(),
        orderNumber: "ORD-A5-001",
        company: mockCompany,
        dealer: mockDealer,
        items: mockItems,
        subtotal: 67000,
        discountTotal: 1500,
        taxTotal: 8710,
        freightTotal: 1200,
        grandTotal: 75410,
        paperSize: "A5",
      });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
    });

    it("renders Proforma Invoice in A5 format", async () => {
      const bytes = await renderProformaInvoicePdf({
        proformaNumber: "PI-A5-001",
        issueDate: new Date(),
        orderNumber: "ORD-A5-001",
        company: mockCompany,
        dealer: mockDealer,
        items: mockItems,
        subtotal: 67000,
        discountTotal: 1500,
        taxTotal: 8710,
        freightTotal: 1200,
        grandTotal: 75410,
        paperSize: "A5",
      });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
    });

    it("renders Delivery Challan in A5 format", async () => {
      const bytes = await renderDispatchChallanPdf({
        challanNumber: "CHL-A5-001",
        dispatchDate: new Date(),
        orderNumber: "ORD-A5-001",
        company: mockCompany,
        dealer: mockDealer,
        items: mockItems,
        packages: [{ packageNumber: "PKG-01", packageType: "Carton", weight: 8.5 }],
        totalCartons: 1,
        totalWeight: 8.5,
        paperSize: "A5",
      });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
    });

    it("renders Warehouse Pick List in A5 format", async () => {
      const bytes = await renderPickListPdf({
        pickListNumber: "PL-A5-001",
        orderNumber: "ORD-A5-001",
        warehouseName: "Central Fulfillment Depot - Nepalgunj",
        createdAt: new Date(),
        company: mockCompany,
        dealer: mockDealer,
        items: mockItems,
        paperSize: "A5",
      });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
    });

    it("renders Packing List in A5 format", async () => {
      const bytes = await renderPackingListPdf({
        packingListNumber: "PKL-A5-001",
        orderNumber: "ORD-A5-001",
        packingDate: new Date(),
        company: mockCompany,
        dealer: mockDealer,
        packages: [
          {
            packageNumber: "PKG-01",
            boxIndex: 1,
            totalBoxes: 1,
            packageType: "Box",
            weight: 5,
            items: [{ sku: "SKU-1", name: "Item 1", quantity: 2, unit: "PCS" }],
          },
        ],
        totalCartons: 1,
        totalWeight: 5,
        paperSize: "A5",
      });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
    });

    it("renders Package Labels in various layouts and paper sizes", async () => {
      const label = {
        packageNumber: "PKG-01",
        cartonIndex: 1,
        totalCartons: 1,
        orderNumber: "ORD-TEST",
        weight: 5,
        company: mockCompany,
        dealer: mockDealer,
      };

      const a4_4 = await renderPackageLabelsPdf([label], "a4_4", "A4");
      expect(a4_4).toBeInstanceOf(Uint8Array);

      const a4_2 = await renderPackageLabelsPdf([label], "a4_2", "A4");
      expect(a4_2).toBeInstanceOf(Uint8Array);

      const a4_1 = await renderPackageLabelsPdf([label], "a4_1", "A4");
      expect(a4_1).toBeInstanceOf(Uint8Array);

      const thermal = await renderPackageLabelsPdf([label], "thermal", "A4");
      expect(thermal).toBeInstanceOf(Uint8Array);

      const a5_label = await renderPackageLabelsPdf([label], "a4_4", "A5");
      expect(a5_label).toBeInstanceOf(Uint8Array);
    });

    it("renders Product Barcodes in A4 sheet (24 grid) and A5 sheet (12 grid)", async () => {
      const barcodeData = {
        name: "Swaraj Clutch Plate Assembly",
        sku: "SW-CLUTCH-01",
        barcode: "8901234567890",
        mrp: 12500,
        vatPercent: 13,
        mrpInclVat: 12500,
        companyName: "Bageshwari Tractors",
      };

      // A4 Sheet Grid
      const a4Sheet = await renderProductBarcodeLabelPdf(
        { ...barcodeData, stickerSize: "a4_sheet", paperSize: "A4" },
        24
      );
      expect(a4Sheet).toBeInstanceOf(Uint8Array);
      expect(String.fromCharCode(...a4Sheet.slice(0, 4))).toBe("%PDF");

      // A5 Sheet Grid
      const a5Sheet = await renderProductBarcodeLabelPdf(
        { ...barcodeData, stickerSize: "a5_sheet", paperSize: "A5" },
        12
      );
      expect(a5Sheet).toBeInstanceOf(Uint8Array);
      expect(String.fromCharCode(...a5Sheet.slice(0, 4))).toBe("%PDF");

      // Convert A5 Sheet to JPEG
      const a5Jpeg = await convertPdfToJpeg(a5Sheet, { scale: 1.5 });
      expect(a5Jpeg).toBeInstanceOf(Uint8Array);
      expect(a5Jpeg[0]).toBe(0xff);
      expect(a5Jpeg[1]).toBe(0xd8);
      expect(a5Jpeg[2]).toBe(0xff);
    });
  });
});
