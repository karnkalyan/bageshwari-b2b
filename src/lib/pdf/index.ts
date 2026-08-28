import "server-only";

import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/db";
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
import { CompanyInfo, DealerInfo, LineItemDto } from "./types";

export * from "./templates";
export * from "./types";
export * from "./helpers";

export type OrderDocumentKind =
  | "sales-order"
  | "proforma"
  | "pick-list"
  | "final-invoice"
  | "dispatch-challan"
  | "shipping-label"
  | "package-labels"
  | "packing-list";

function mapCompany(company: any): CompanyInfo {
  return {
    legalName: company?.companyName || company?.legalName || "",
    tradingName: company?.tradingName || company?.companyName || "",
    panNumber: company?.panNumber || "",
    vatNumber: company?.vatNumber || company?.panNumber || "",
    registrationNumber: company?.registrationNumber || "",
    address: company?.address || "",
    city: company?.city || "",
    district: company?.district || "",
    province: company?.province || "",
    phone: company?.phone || "",
    email: company?.email || "",
    website: company?.website || "",
    bankName: company?.bankName || "",
    bankAccountName: company?.bankAccountName || company?.companyName || "",
    bankAccountNumber: company?.bankAccountNumber || "",
    bankBranch: company?.bankBranch || "",
    bankSwiftCode: company?.bankSwiftCode || "",
  };
}

function mapDealer(dealer: any): DealerInfo {
  const address = dealer?.addresses?.[0];
  return {
    legalName: dealer?.legalName || "",
    tradingName: dealer?.tradingName || dealer?.legalName || "",
    code: dealer?.code || "",
    taxNumber: dealer?.taxNumber || dealer?.panNumber || "N/A",
    contactName: dealer?.contactName || "",
    phone: dealer?.phone || "N/A",
    email: dealer?.email || "N/A",
    addressLine1: address?.line1 || dealer?.address || "",
    city: address?.city || dealer?.city || "",
    district: address?.district || "",
    province: address?.province || "",
  };
}

async function getCompanyProfileSafe(): Promise<any> {
  try {
    return await prisma.companyProfile.findUnique({ where: { id: "bageshwari-tractors" } });
  } catch {
    try {
      const rows = await prisma.$queryRaw<any[]>`SELECT * FROM CompanyProfile WHERE id = 'bageshwari-tractors' LIMIT 1`;
      return rows?.[0] || null;
    } catch {
      return null;
    }
  }
}

export async function generateOrderPdf(
  orderId: string,
  sellerId: string,
  kind: OrderDocumentKind
): Promise<Uint8Array | null> {
  const [order, companyRaw] = await Promise.all([
    prisma.order.findFirst({
      where: { id: orderId, sellerId },
      include: {
        dealer: { include: { addresses: { where: { isDefault: true }, take: 1 } } },
        items: true,
        proformaInvoices: { orderBy: { createdAt: "desc" }, take: 1 },
        finalInvoices: { orderBy: { createdAt: "desc" }, take: 1, include: { items: true } },
        pickLists: { orderBy: { createdAt: "desc" }, take: 1, include: { items: true, assignedTo: { select: { id: true, name: true, email: true } } } },
        packages: { orderBy: { packageNumber: "asc" } },
        shipments: { orderBy: { createdAt: "desc" }, take: 1, include: { transportCompany: true, driver: true, vehicle: true, packages: { orderBy: { packageNumber: "asc" } } } },
      },
    }),
    getCompanyProfileSafe(),
  ]);

  if (!order) return null;

  const company = mapCompany(companyRaw);
  const dealer = mapDealer(order.dealer);
  const orderPackages = (order.packages && order.packages.length > 0)
    ? order.packages
    : (order.shipments[0]?.packages || []);

  // 1. FINAL TAX INVOICE
  if (kind === "final-invoice") {
    const finalInv = order.finalInvoices[0];
    const invoiceNumber = finalInv?.invoiceNumber || `INV-${order.orderNumber.replace(/^[A-Za-z]+-?/, "")}`;
    const issueDate = finalInv?.createdAt || new Date();

    const items: LineItemDto[] = (finalInv?.items && finalInv.items.length > 0
      ? finalInv.items
      : order.items
    ).map((item: any, idx: number) => {
      const qty = Number(item.quantity ?? item.approvedQuantity ?? item.originalQuantity);
      const unitPrice = Number(item.unitPrice ?? item.dealerPrice);
      const discount = Number(item.discountAmount ?? 0);
      const lineTotal = Number(item.lineTotal ?? qty * unitPrice);

      return {
        sn: idx + 1,
        sku: item.sku,
        description: item.description || item.productName + (item.variantName ? ` (${item.variantName})` : ""),
        unit: "PCS",
        quantity: qty,
        unitPrice,
        discountAmount: discount,
        lineTotal,
      };
    });

    const subtotal = Number(finalInv?.subtotal ?? order.subtotal);
    const taxTotal = Number(finalInv?.taxTotal ?? order.taxTotal);
    const freightTotal = Number(finalInv?.freightTotal ?? order.freightTotal);
    const grandTotal = Number(finalInv?.grandTotal ?? order.grandTotal);

    return renderTaxInvoicePdf({
      invoiceNumber,
      issueDate,
      dueDate: finalInv?.dueDate,
      orderNumber: order.orderNumber,
      purchaseOrderNumber: order.purchaseOrderNumber,
      challanNumber: order.shipments[0]?.challanNumber,
      company,
      dealer,
      items,
      subtotal,
      discountTotal: Number(order.discountTotal),
      taxTotal,
      freightTotal,
      grandTotal,
      paymentTerms: finalInv?.paymentTerms || "Credit 30 Days",
      remarks: finalInv?.remarks || order.dealerNotes,
    });
  }

  // 2. PROFORMA INVOICE
  if (kind === "proforma") {
    const proforma = order.proformaInvoices[0];
    const proformaNumber = proforma?.proformaNumber || `PI-${order.orderNumber.replace(/^[A-Za-z]+-?/, "")}`;
    const issueDate = proforma?.issueDate || order.createdAt;

    const items: LineItemDto[] = order.items.map((item, idx) => {
      const qty = Number(item.approvedQuantity ?? item.originalQuantity);
      const unitPrice = Number(item.dealerPrice);
      const lineTotal = qty * unitPrice;

      return {
        sn: idx + 1,
        sku: item.sku,
        description: item.productName + (item.variantName ? ` (${item.variantName})` : ""),
        unit: "PCS",
        quantity: qty,
        unitPrice,
        discountAmount: Number(item.discountAmount ?? 0),
        lineTotal,
      };
    });

    return renderProformaInvoicePdf({
      proformaNumber,
      issueDate,
      validUntil: proforma?.validUntil,
      orderNumber: order.orderNumber,
      company,
      dealer,
      items,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      taxTotal: Number(order.taxTotal),
      freightTotal: Number(order.freightTotal),
      grandTotal: Number(order.grandTotal),
      paymentTerms: proforma?.paymentTerms || "100% Advance Bank Transfer or Approved Credit Limit",
      creditTerms: proforma?.creditTerms || "30 Days Dealer Credit terms",
    });
  }

  // 3. WAREHOUSE PICK LIST
  if (kind === "pick-list") {
    const pickList = order.pickLists[0];
    const pickListNumber = pickList?.pickListNumber || `PL-${order.orderNumber.replace(/^[A-Za-z]+-?/, "")}`;

    const items: LineItemDto[] = order.items.map((item, idx) => {
      const approvedQty = Number(item.approvedQuantity ?? item.originalQuantity);
      return {
        sn: idx + 1,
        sku: item.sku,
        description: item.productName + (item.variantName ? ` (${item.variantName})` : ""),
        unit: "PCS",
        quantity: approvedQty,
        unitPrice: Number(item.dealerPrice),
        lineTotal: approvedQty * Number(item.dealerPrice),
      };
    });

    // Use real assigned picker name from the pick list record
    const assignedPicker = pickList?.assignedTo;
    const pickerName = assignedPicker?.name || assignedPicker?.email || (pickList?.assignedToId ? "Assigned Picker" : null);
    // Use warehouse name from company profile settings if available
    const warehouseName = companyRaw?.warehouseName || (company.city ? `${company.city} Warehouse` : "Warehouse");

    return renderPickListPdf({
      pickListNumber,
      createdAt: pickList?.createdAt || order.createdAt,
      orderNumber: order.orderNumber,
      company,
      dealer,
      warehouseName,
      assignedPickerName: pickerName,
      items,
      notes: pickList?.notes || null,
    });
  }

  // 4. DELIVERY CHALLAN / PACKING LIST
  if (kind === "dispatch-challan" || kind === "packing-list") {
    const shipment = order.shipments[0];
    const challanNumber = shipment?.challanNumber || `CHL-${order.orderNumber.replace(/^[A-Za-z]+-?/, "")}`;
    const dispatchDate = shipment?.dispatchDate || new Date();

    const items: LineItemDto[] = order.items.map((item, idx) => {
      const qty = Number(item.approvedQuantity ?? item.originalQuantity);
      return {
        sn: idx + 1,
        sku: item.sku,
        description: item.productName + (item.variantName ? ` (${item.variantName})` : ""),
        unit: "PCS",
        quantity: qty,
        unitPrice: Number(item.dealerPrice),
        lineTotal: qty * Number(item.dealerPrice),
      };
    });

    const packages = orderPackages.map((pkg, idx) => ({
      packageNumber: pkg.packageNumber || `PKG-${order.orderNumber.slice(-5)}-0${idx + 1}`,
      packageType: pkg.packageType || "Box",
      weight: Number(pkg.weight || 0),
      length: pkg.length ? Number(pkg.length) : null,
      width: pkg.width ? Number(pkg.width) : null,
      height: pkg.height ? Number(pkg.height) : null,
    }));

    return renderDispatchChallanPdf({
      challanNumber,
      shipmentNumber: shipment?.shipmentNumber || "",
      dispatchDate,
      orderNumber: order.orderNumber,
      invoiceNumber: order.finalInvoices[0]?.invoiceNumber,
      company,
      dealer,
      packages,
      totalCartons: packages.length || Number(shipment?.totalCartons || 0),
      totalWeight: Number(shipment?.totalWeight || packages.reduce((sum, p) => sum + p.weight, 0)),
      transporterName: shipment?.transporter || shipment?.transportCompany?.name || "",
      driverName: shipment?.driverName || shipment?.driver?.name,
      driverPhone: shipment?.driverPhone || shipment?.driver?.phone,
      vehicleNumber: shipment?.vehicleNumber || shipment?.vehicle?.vehicleNumber,
      remarks: shipment?.remarks || order.dealerNotes,
    });
  }

  // 6. PACKAGE LABELS (MULTI-PAGE FOR ALL CARTONS)
  if (kind === "package-labels" || kind === "shipping-label") {
    const shipment = order.shipments[0];
    const packages = orderPackages;

    if (!packages || packages.length === 0) {
      return renderPackageLabelPdf({
        packageNumber: `PKG-${order.orderNumber.slice(-5)}-01`,
        cartonIndex: 1,
        totalCartons: 1,
        orderNumber: order.orderNumber,
        shipmentNumber: shipment?.shipmentNumber,
        challanNumber: shipment?.challanNumber,
        weight: 0,
        company,
        dealer,
        transporterName: shipment?.transporter || shipment?.transportCompany?.name || "",
      });
    }

    // Merge multiple package labels into a single PDF
    const mergedPdf = await PDFDocument.create();
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const singleBytes = await renderPackageLabelPdf({
        packageNumber: pkg.packageNumber,
        cartonIndex: i + 1,
        totalCartons: packages.length,
        orderNumber: order.orderNumber,
        shipmentNumber: shipment?.shipmentNumber,
        challanNumber: shipment?.challanNumber,
        weight: Number(pkg.weight),
        length: pkg.length ? Number(pkg.length) : null,
        width: pkg.width ? Number(pkg.width) : null,
        height: pkg.height ? Number(pkg.height) : null,
        packageType: pkg.packageType,
        handlingInstructions: pkg.handlingInstructions,
        company,
        dealer,
        transporterName: shipment?.transporter || shipment?.transportCompany?.name,
      });

      const singleDoc = await PDFDocument.load(singleBytes);
      const copiedPages = await mergedPdf.copyPages(singleDoc, singleDoc.getPageIndices());
      copiedPages.forEach((p) => mergedPdf.addPage(p));
    }

    return mergedPdf.save();
  }

  // DEFAULT: SALES ORDER
  const items: LineItemDto[] = order.items.map((item, idx) => ({
    sn: idx + 1,
    sku: item.sku,
    description: item.productName + (item.variantName ? ` (${item.variantName})` : ""),
    unit: "PCS",
    quantity: Number(item.originalQuantity),
    unitPrice: Number(item.dealerPrice),
    discountAmount: Number(item.discountAmount ?? 0),
    lineTotal: Number(item.lineTotal),
  }));

  return renderSalesOrderPdf({
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    source: order.source,
    status: order.status,
    company,
    dealer,
    items,
    subtotal: Number(order.subtotal),
    discountTotal: Number(order.discountTotal),
    taxTotal: Number(order.taxTotal),
    freightTotal: Number(order.freightTotal),
    grandTotal: Number(order.grandTotal),
    dealerNotes: order.dealerNotes,
    accountsNotes: order.accountsNotes,
  });
}

export async function generatePackageLabelPdf(packageId: string, sellerId: string): Promise<Uint8Array | null> {
  const [pkg, companyRaw] = await Promise.all([
    prisma.package.findFirst({
      where: { id: packageId, sellerId },
      include: {
        order: {
          include: {
            dealer: { include: { addresses: { where: { isDefault: true }, take: 1 } } },
            shipments: { include: { transportCompany: true }, take: 1 },
          },
        },
        shipment: { include: { transportCompany: true, packages: true } },
      },
    }),
    getCompanyProfileSafe(),
  ]);

  if (!pkg) return null;

  const company = mapCompany(companyRaw);
  const dealer = mapDealer(pkg.order.dealer);
  const totalCartons = pkg.shipment?.packages?.length || 1;
  const cartonIndex = pkg.shipment?.packages?.findIndex((p) => p.id === pkg.id) ?? 0;

  return renderPackageLabelPdf({
    packageNumber: pkg.packageNumber,
    cartonIndex: cartonIndex + 1,
    totalCartons,
    orderNumber: pkg.order.orderNumber,
    shipmentNumber: pkg.shipment?.shipmentNumber,
    challanNumber: pkg.shipment?.challanNumber,
    weight: Number(pkg.weight),
    length: pkg.length ? Number(pkg.length) : null,
    width: pkg.width ? Number(pkg.width) : null,
    height: pkg.height ? Number(pkg.height) : null,
    packageType: pkg.packageType,
    handlingInstructions: pkg.handlingInstructions,
    company,
    dealer,
    transporterName: pkg.shipment?.transporter || pkg.shipment?.transportCompany?.name || pkg.order.shipments[0]?.transportCompany?.name,
  });
}

export async function generateProductBarcodeLabelPdf(
  productIdOrSku: string,
  sellerId: string,
  count = 1
): Promise<Uint8Array | null> {
  const [product, companyRaw] = await Promise.all([
    prisma.product.findFirst({
      where: {
        sellerId,
        OR: [{ id: productIdOrSku }, { sku: productIdOrSku }],
      },
      include: {
        category: true,
        brand: true,
        variants: { where: { isDefault: true }, take: 1 },
      },
    }),
    getCompanyProfileSafe(),
  ]);

  if (!product) return null;

  const variant = product.variants[0];
  const mrp = variant ? Number(variant.mrp) : 0;
  const barcode = variant?.barcode || product.sku;

  // 3-Tier VAT Resolution
  const globalVatRaw = companyRaw?.defaultVatPercent ? Number(companyRaw.defaultVatPercent) : 13.0;
  const globalVat = globalVatRaw > 0 && globalVatRaw <= 1.0 ? globalVatRaw * 100 : globalVatRaw;
  const rawVatPercent =
    product.taxPercent !== null && product.taxPercent !== undefined
      ? Number(product.taxPercent)
      : (product.category as any)?.taxPercent !== null && (product.category as any)?.taxPercent !== undefined
      ? Number((product.category as any).taxPercent)
      : globalVat;
  const vatPercent = rawVatPercent > 0 && rawVatPercent <= 1.0 ? rawVatPercent * 100 : rawVatPercent;

  const mrpInclVat = mrp * (1 + vatPercent / 100);

  return renderProductBarcodeLabelPdf(
    {
      name: product.name,
      sku: product.sku,
      barcode,
      mrp,
      vatPercent,
      mrpInclVat,
      categoryName: product.category?.name,
      brandName: product.brand?.name,
      unitCode: product.unitCode,
      companyName: companyRaw?.companyName || companyRaw?.tradingName || "",
    },
    count
  );
}
