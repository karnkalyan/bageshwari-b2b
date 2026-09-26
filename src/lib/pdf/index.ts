import "server-only";

import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/db";
import {
  renderTaxInvoicePdf,
  renderProformaInvoicePdf,
  renderPickListPdf,
  renderSalesOrderPdf,
  renderPackageLabelPdf,
  renderPackageLabelsPdf,
  type CartonLabelLayout,
  renderDispatchChallanPdf,
  renderPackingListPdf,
  renderProductBarcodeLabelPdf,
} from "./templates";
import { CompanyInfo, DealerInfo, LineItemDto } from "./types";
import { PaperSize } from "./helpers";

export * from "./templates";
export * from "./types";
export * from "./helpers";
export * from "./pdf-to-jpeg";

export type OrderDocumentKind =
  | "sales-order"
  | "proforma"
  | "pick-list"
  | "final-invoice"
  | "dispatch-challan"
  | "shipping-label"
  | "package-labels"
  | "packing-list";

function mapCompany(company: any, seller?: any): CompanyInfo {
  return {
    legalName: company?.companyName || seller?.legalName || company?.legalName || "Bageshwari Tractors",
    tradingName: company?.tradingName || seller?.tradingName || company?.companyName || "Bageshwari Tractors",
    panNumber: company?.panNumber || company?.vatNumber || seller?.taxNumber || "302918239",
    vatNumber: company?.vatNumber || company?.panNumber || seller?.taxNumber || "302918239",
    registrationNumber: company?.registrationNumber || seller?.registrationNumber || "29384/078/079",
    address: company?.address || seller?.addressLine1 || "Nepalgunj, Banke",
    city: company?.city || seller?.city || "Nepalgunj",
    district: company?.district || seller?.district || "Banke",
    province: company?.province || seller?.province || "Lumbini Province",
    phone: company?.phone || seller?.phone || "+977-81-520123",
    email: company?.email || seller?.email || "info@bageshwari.com.np",
    website: company?.website || seller?.website || "https://bageshwari.com.np",
    bankName: company?.bankName || "NIC ASIA Bank Ltd.",
    bankAccountName: company?.bankAccountName || company?.companyName || seller?.legalName || "Bageshwari Tractors",
    bankAccountNumber: company?.bankAccountNumber || "0194291823901928",
    bankBranch: company?.bankBranch || "Nepalgunj Main Branch",
    bankSwiftCode: company?.bankSwiftCode || "NICA-NP",
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
    addressLine1: address?.addressLine1 || address?.line1 || dealer?.address || "",
    city: address?.city || dealer?.city || "",
    district: address?.district || "",
    province: address?.province || "",
  };
}

async function getCompanyProfileSafe(sellerId?: string): Promise<{ profile: any; seller: any }> {
  let profile: any = null;
  let seller: any = null;

  try {
    if (sellerId) {
      seller = await prisma.seller.findUnique({
        where: { id: sellerId },
      }).catch(() => null);

      profile = await prisma.companyProfile.findFirst({
        where: {
          OR: [{ sellerId }, { id: "bageshwari-tractors" }],
        },
      }).catch(() => null);
    }

    if (!seller) {
      seller = await prisma.seller.findFirst({
        where: { status: "ACTIVE" },
      }).catch(() => null);
    }

    if (!profile) {
      profile = await prisma.companyProfile.findFirst({
        where: {
          OR: [
            ...(seller?.id ? [{ sellerId: seller.id }] : []),
            { id: "bageshwari-tractors" },
          ],
        },
      }).catch(() => null);
    }

    if (!profile) {
      profile = await prisma.companyProfile.findFirst().catch(() => null);
    }
  } catch {
    try {
      const rows = await prisma.$queryRaw<any[]>`SELECT * FROM CompanyProfile WHERE id = 'bageshwari-tractors' LIMIT 1`;
      profile = rows?.[0] || null;
    } catch {
      profile = null;
    }
  }

  return { profile, seller };
}

export async function generateOrderPdf(
  orderId: string,
  sellerId: string,
  kind: OrderDocumentKind,
  options?: { layout?: CartonLabelLayout; paperSize?: PaperSize }
): Promise<Uint8Array | null> {
  const [order, companyMeta] = await Promise.all([
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
    getCompanyProfileSafe(sellerId),
  ]);

  if (!order) return null;

  const company = mapCompany(companyMeta.profile, companyMeta.seller);
  const dealer = mapDealer(order.dealer);
  const orderPackages = (order.packages && order.packages.length > 0)
    ? order.packages
    : (order.shipments[0]?.packages || []);

  // 1. FINAL TAX INVOICE
  if (kind === "final-invoice") {
    const finalInv = order.finalInvoices[0];
    const rawInvoiceNumber = finalInv?.invoiceNumber || `INV-${order.orderNumber.replace(/^[A-Za-z]+[-_]?/, "")}`;
    const invoiceNumber = rawInvoiceNumber.replace(/-+/g, "-");
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
      paperSize: options?.paperSize,
    });
  }

  // 2. PROFORMA INVOICE
  if (kind === "proforma") {
    const proforma = order.proformaInvoices[0];
    const rawProformaNumber = proforma?.proformaNumber || `PI-${order.orderNumber.replace(/^[A-Za-z]+[-_]?/, "")}`;
    const proformaNumber = rawProformaNumber.replace(/-+/g, "-");
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
      paperSize: options?.paperSize,
    });
  }

  // 3. WAREHOUSE PICK LIST
  if (kind === "pick-list") {
    const pickList = order.pickLists[0];
    const rawPickListNumber = pickList?.pickListNumber || `PL-${order.orderNumber.replace(/^[A-Za-z]+[-_]?/, "")}`;
    const pickListNumber = rawPickListNumber.replace(/-+/g, "-");

    const pickListItemsMap = new Map<string, any>();
    if (pickList?.items) {
      for (const pi of pickList.items) {
        if (pi.variantId) pickListItemsMap.set(pi.variantId, pi);
        if (pi.sku) pickListItemsMap.set(pi.sku, pi);
      }
    }

    const items: LineItemDto[] = order.items.map((item, idx) => {
      const approvedQty = Number(item.approvedQuantity ?? item.originalQuantity);
      const matchedPi = (item.variantId ? pickListItemsMap.get(item.variantId) : null) || pickListItemsMap.get(item.sku);
      const pickedQty = matchedPi !== undefined && matchedPi !== null ? Number(matchedPi.pickedQuantity) : null;
      return {
        sn: idx + 1,
        sku: item.sku,
        description: item.productName + (item.variantName ? ` (${item.variantName})` : ""),
        unit: "PCS",
        quantity: approvedQty,
        unitPrice: Number(item.dealerPrice),
        lineTotal: approvedQty * Number(item.dealerPrice),
        rackLocation: matchedPi?.rackLocation || null,
        binLocation: matchedPi?.binLocation || null,
        pickedQuantity: pickedQty,
        isPicked: pickedQty !== null && pickedQty >= approvedQty,
        remarks: matchedPi?.remarks || null,
      };
    });

    // Use real assigned picker name from the pick list record
    const assignedPicker = pickList?.assignedTo;
    const pickerName = assignedPicker?.name || assignedPicker?.email || (pickList?.assignedToId ? "Assigned Picker" : null);
    // Use warehouse name from company profile settings if available
    const warehouseName = (companyMeta.profile as any)?.warehouseName || (company.city ? `${company.city} Warehouse` : "Warehouse");

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
      paperSize: options?.paperSize,
    });
  }

  // 4. PACKING LIST (CARTON MANIFEST & CONTENTS)
  if (kind === "packing-list") {
    const shipment = order.shipments[0];
    const pickList = order.pickLists[0];
    const totalWeight = orderPackages.reduce((sum, p) => sum + Number(p.weight || 0), 0);
    const totalCartons = orderPackages.length;

    const packages = orderPackages.map((pkg, idx) => {
      let parsedItems: { sku: string; name: string; quantity: number; unit?: string }[] = [];
      if (pkg.itemsJson) {
        try {
          const raw = JSON.parse(pkg.itemsJson);
          if (Array.isArray(raw)) {
            parsedItems = raw.map((it: any) => ({
              sku: it.sku || "",
              name: it.productName || it.name || "",
              quantity: Number(it.quantity || 0),
              unit: it.unitCode || it.unit || "PCS",
            }));
          }
        } catch {}
      }

      return {
        packageNumber: pkg.packageNumber || `PKG-${order.orderNumber.slice(-5)}-0${idx + 1}`,
        boxIndex: idx + 1,
        totalBoxes: totalCartons || 1,
        packageType: pkg.packageType || "Standard Corrugated Carton",
        weight: Number(pkg.weight || 0),
        length: pkg.length ? Number(pkg.length) : null,
        width: pkg.width ? Number(pkg.width) : null,
        height: pkg.height ? Number(pkg.height) : null,
        handlingInstructions: pkg.handlingInstructions,
        items: parsedItems,
      };
    });

    return renderPackingListPdf({
      packingListNumber: `PL-${order.orderNumber.replace(/^[A-Za-z]+-?/, "")}`,
      orderNumber: order.orderNumber,
      shipmentNumber: shipment?.shipmentNumber || null,
      challanNumber: shipment?.challanNumber || null,
      invoiceNumber: order.finalInvoices[0]?.invoiceNumber || null,
      packingDate: orderPackages[0]?.packingDate || new Date(),
      company,
      dealer,
      packages:
        packages.length > 0
          ? packages
          : [
              {
                packageNumber: `PKG-${order.orderNumber.slice(-5)}-01`,
                boxIndex: 1,
                totalBoxes: 1,
                packageType: "Standard Corrugated Carton",
                weight: 0,
                items: order.items.map((it) => ({
                  sku: it.sku,
                  name: it.productName,
                  quantity: Number(it.approvedQuantity ?? it.originalQuantity),
                  unit: "PCS",
                })),
              },
            ],
      totalCartons: totalCartons || 1,
      totalWeight,
      warehouseName: (companyMeta.profile as any)?.warehouseName || (company.city ? `${company.city} Central Warehouse` : "Warehouse"),
      packedByName: (pickList?.assignedTo?.name || pickList?.assignedTo?.email || "Warehouse Lead Specialist"),
      transporterName: shipment?.transporter || shipment?.transportCompany?.name || "",
      driverName: shipment?.driverName || shipment?.driver?.name,
      vehicleNumber: shipment?.vehicleNumber || shipment?.vehicle?.vehicleNumber,
      notes: order.dealerNotes,
      paperSize: options?.paperSize,
    });
  }

  // 5. DELIVERY CHALLAN
  if (kind === "dispatch-challan") {
    const shipment = order.shipments[0];
    const rawChallanNumber = shipment?.challanNumber || `CHL-${order.orderNumber.replace(/^[A-Za-z]+[-_]?/, "")}`;
    const challanNumber = rawChallanNumber.replace(/-+/g, "-");
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
      items,
      totalCartons: packages.length || Number(shipment?.totalCartons || 0),
      totalWeight: Number(shipment?.totalWeight || packages.reduce((sum, p) => sum + p.weight, 0)),
      transporterName: shipment?.transporter || shipment?.transportCompany?.name || "",
      driverName: shipment?.driverName || shipment?.driver?.name,
      driverPhone: shipment?.driverPhone || shipment?.driver?.phone,
      vehicleNumber: shipment?.vehicleNumber || shipment?.vehicle?.vehicleNumber,
      remarks: shipment?.remarks || order.dealerNotes,
      paperSize: options?.paperSize,
    });
  }

  // 6. PACKAGE LABELS (A4 4-UP PRINTABLE GRID OR ADJUSTABLE LAYOUT)
  if (kind === "package-labels" || kind === "shipping-label") {
    const shipment = order.shipments[0];
    const packages = orderPackages;
    const layout = options?.layout || "a4_4";

    if (!packages || packages.length === 0) {
      return renderPackageLabelsPdf([
        {
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
        },
      ], layout, options?.paperSize);
    }

    const labelsData = packages.map((pkg, i) => ({
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
    }));

    return renderPackageLabelsPdf(labelsData, layout, options?.paperSize);
  }

  // DEFAULT: SALES ORDER
  const items: LineItemDto[] = order.items.map((item, idx) => ({
    sn: idx + 1,
    sku: item.sku,
    description: item.productName + (item.variantName ? ` (${item.variantName})` : ""),
    unit: "PCS",
    quantity: Number(item.approvedQuantity ?? item.originalQuantity),
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
    paperSize: options?.paperSize,
  });
}

export async function generatePackageLabelPdf(
  packageId: string,
  sellerId: string,
  layout: CartonLabelLayout = "a4_4",
  paperSize: PaperSize = "A4"
): Promise<Uint8Array | null> {
  const [pkg, companyMeta] = await Promise.all([
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
    getCompanyProfileSafe(sellerId),
  ]);

  if (!pkg) return null;

  const company = mapCompany(companyMeta.profile, companyMeta.seller);
  const dealer = mapDealer(pkg.order.dealer);
  const totalCartons = pkg.shipment?.packages?.length || 1;
  const cartonIndex = pkg.shipment?.packages?.findIndex((p) => p.id === pkg.id) ?? 0;

  return renderPackageLabelsPdf([
    {
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
    },
  ], layout, paperSize);
}

export async function generateProductBarcodeLabelPdf(
  productIdOrSku: string,
  sellerId: string,
  count = 1,
  stickerSize: "32x20" | "standard" | "a4_sheet" | "a5_sheet" = "32x20",
  paperSize?: PaperSize
): Promise<Uint8Array | null> {
  const [product, companyMeta] = await Promise.all([
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
    getCompanyProfileSafe(sellerId),
  ]);

  if (!product) return null;

  const variant = product.variants[0];
  const mrp = variant ? Number(variant.mrp) : 0;
  const barcode = variant?.barcode || product.sku;

  // 3-Tier VAT Resolution
  const globalVatRaw = companyMeta.profile?.defaultVatPercent ? Number(companyMeta.profile.defaultVatPercent) : 13.0;
  const globalVat = globalVatRaw > 0 && globalVatRaw <= 1.0 ? globalVatRaw * 100 : globalVatRaw;
  const rawVatPercent =
    product.taxPercent !== null && product.taxPercent !== undefined
      ? Number(product.taxPercent)
      : (product.category as any)?.taxPercent !== null && (product.category as any)?.taxPercent !== undefined
      ? Number((product.category as any).taxPercent)
      : globalVat;
  const vatPercent = rawVatPercent > 0 && rawVatPercent <= 1.0 ? rawVatPercent * 100 : rawVatPercent;

  // MRP is legally and standardly VAT-inclusive in Nepal; do not double-compound VAT on MRP
  const mrpInclVat = mrp;

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
      companyName: companyMeta.profile?.companyName || companyMeta.profile?.tradingName || companyMeta.seller?.tradingName || companyMeta.seller?.companyName || "BAGESHWARI TRACTOR, NEPALGUNJ",
      stickerSize,
      paperSize,
    },
    count
  );
}
