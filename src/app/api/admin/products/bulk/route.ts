import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface BulkProductItem {
  sku: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  unitCode?: string | null;
  mrp?: number | string | null;
  dealerPrice?: number | string | null;
  taxPercent?: number | string | null;
  stock?: number | string | null;
  description?: string | null;
}

const SAMPLE_CSV_TEMPLATE = `SKU,Product Name,Category,Brand,Unit,MRP,Dealer Price,VAT %,Stock,Description
BT-1011,Front Axle Pinion 18T,Tractor Transmission,Bageshwari Genuine,PCS,4500,3800,13,50,High grade alloy steel pinion for 45HP tractor
BT-1012,Hydraulic Filter Cartridge,Hydraulics & Filters,Bageshwari Genuine,PCS,1250,950,13,120,Heavy duty filtration cartridge 10 micron
BT-1013,Clutch Plate Assembly 11 Inch,Clutch & Brakes,Bageshwari Genuine,SET,8200,6900,13,30,Ceramic-metallic 11 inch dual clutch assembly
BT-1014,Taper Roller Bearing 30207,Bearings,NBC Bearings,PCS,1650,1350,13,85,Precision tapered roller bearing for steering knuckle
BT-1015,Fuel Injection Pump Element,Fuel System,Bosch Genuine,PCS,3100,2650,13,40,High pressure diesel pump element assembly`;

const SAMPLE_JSON_TEMPLATE = [
  {
    sku: "BT-1011",
    name: "Front Axle Pinion 18T",
    category: "Tractor Transmission",
    brand: "Bageshwari Genuine",
    unitCode: "PCS",
    mrp: 4500,
    dealerPrice: 3800,
    taxPercent: 13,
    stock: 50,
    description: "High grade alloy steel pinion for 45HP tractor",
  },
  {
    sku: "BT-1012",
    name: "Hydraulic Filter Cartridge",
    category: "Hydraulics & Filters",
    brand: "Bageshwari Genuine",
    unitCode: "PCS",
    mrp: 1250,
    dealerPrice: 950,
    taxPercent: 13,
    stock: 120,
    description: "Heavy duty filtration cartridge 10 micron",
  },
  {
    sku: "BT-1013",
    name: "Clutch Plate Assembly 11 Inch",
    category: "Clutch & Brakes",
    brand: "Bageshwari Genuine",
    unitCode: "SET",
    mrp: 8200,
    dealerPrice: 6900,
    taxPercent: 13,
    stock: 30,
    description: "Ceramic-metallic 11 inch dual clutch assembly",
  },
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  // Authorize Admin and Accounts roles
  const userRoles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true },
  });
  const roleCodes = userRoles.map((r) => r.role.code);
  const isAuthorized =
    roleCodes.some((rc) =>
      [
        "SUPER_ADMIN",
        "PLATFORM_ADMIN",
        "SELLER_OWNER",
        "ADMIN",
        "STAFF",
        "ACCOUNTANT",
        "ACCOUNTS_MANAGER",
        "FINANCE",
      ].includes(rc)
    ) ||
    (session.user as any)?.role === "ADMIN" ||
    (session.user as any)?.role === "SUPER_ADMIN" ||
    roleCodes.length === 0;

  if (!isAuthorized) {
    return apiError("FORBIDDEN", "Insufficient permissions for bulk product operations.", 403);
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "export"; // 'export' | 'template'
  const format = (searchParams.get("format") || "csv").toLowerCase(); // 'csv' | 'xlsx' | 'xls' | 'json'

  // 1. Download Sample Template
  if (action === "template") {
    if (format === "xlsx" || format === "xls") {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Bageshwari Tractors";
      const sheet = workbook.addWorksheet("Product Template");

      sheet.columns = [
        { header: "SKU", key: "sku", width: 14 },
        { header: "Product Name", key: "name", width: 32 },
        { header: "Category", key: "category", width: 22 },
        { header: "Brand", key: "brand", width: 20 },
        { header: "Unit", key: "unitCode", width: 10 },
        { header: "MRP", key: "mrp", width: 12 },
        { header: "Dealer Price", key: "dealerPrice", width: 14 },
        { header: "VAT %", key: "taxPercent", width: 10 },
        { header: "Stock", key: "stock", width: 10 },
        { header: "Description", key: "description", width: 40 },
      ];

      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF092F5C" },
      };

      SAMPLE_JSON_TEMPLATE.forEach((row) => sheet.addRow(row));

      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="product-import-sample-template.xlsx"',
        },
      });
    }

    if (format === "json") {
      return new Response(JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="product-import-sample-template.json"',
        },
      });
    }

    return new Response(SAMPLE_CSV_TEMPLATE, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="product-import-sample-template.csv"',
      },
    });
  }

  // 2. Export Products (All or category-filtered)
  let sellerId = session.sellerId;
  if (!sellerId) {
    const activeSeller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } });
    sellerId = activeSeller?.id;
  }
  if (!sellerId) return apiError("SELLER_NOT_FOUND", "Seller not configured.", 404);

  const categoryId = searchParams.get("categoryId");
  const whereClause: any = {
    sellerId,
    status: "ACTIVE",
    ...(categoryId && categoryId !== "ALL" ? { categoryId } : {}),
  };

  const products = await prisma.product.findMany({
    where: whereClause,
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { name: true } },
      variants: { where: { isDefault: true }, take: 1 },
      prices: { where: { priceType: "DEFAULT_DEALER" }, take: 1 },
      inventories: { select: { availableQuantity: true } },
    },
    orderBy: { name: "asc" },
  });

  const exportRows = products.map((p) => {
    const variant = p.variants[0];
    const price = p.prices[0];
    const stock = p.inventories[0]?.availableQuantity ? Number(p.inventories[0].availableQuantity) : 0;
    return {
      sku: p.sku,
      name: p.name,
      category: p.category?.name || "General",
      brand: p.brand?.name || "Bageshwari Genuine",
      unitCode: p.unitCode || "PCS",
      mrp: variant ? Number(variant.mrp) : 0,
      dealerPrice: price ? Number(price.amount) : 0,
      taxPercent: p.taxPercent !== null && p.taxPercent !== undefined ? Number(p.taxPercent) : 13,
      stock,
      description: p.shortDescription || "",
    };
  });

  if (format === "xlsx" || format === "xls") {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Bageshwari Tractors";
    const sheet = workbook.addWorksheet("Product Catalogue");

    sheet.columns = [
      { header: "SKU", key: "sku", width: 14 },
      { header: "Product Name", key: "name", width: 32 },
      { header: "Category", key: "category", width: 22 },
      { header: "Brand", key: "brand", width: 20 },
      { header: "Unit", key: "unitCode", width: 10 },
      { header: "MRP", key: "mrp", width: 12 },
      { header: "Dealer Price", key: "dealerPrice", width: 14 },
      { header: "VAT %", key: "taxPercent", width: 10 },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Description", key: "description", width: 40 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF092F5C" },
    };

    exportRows.forEach((r) => sheet.addRow(r));

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="products-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  }

  if (format === "json") {
    return new Response(JSON.stringify(exportRows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="products-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  // Generate CSV
  const header = "SKU,Product Name,Category,Brand,Unit,MRP,Dealer Price,VAT %,Stock,Description\n";
  const csvLines = exportRows.map((r) => {
    const esc = (s: any) => `"${String(s || "").replace(/"/g, '""')}"`;
    return [
      esc(r.sku),
      esc(r.name),
      esc(r.category),
      esc(r.brand),
      esc(r.unitCode),
      r.mrp,
      r.dealerPrice,
      r.taxPercent,
      r.stock,
      esc(r.description),
    ].join(",");
  });

  const fullCsv = header + csvLines.join("\n");

  return new Response(fullCsv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function getCellValueString(cellValue: any): string {
  if (cellValue === null || cellValue === undefined) return "";
  if (typeof cellValue === "object") {
    if (cellValue.result !== undefined && cellValue.result !== null) return String(cellValue.result).trim();
    if (cellValue.text !== undefined && cellValue.text !== null) return String(cellValue.text).trim();
    if (Array.isArray(cellValue.richText)) {
      return cellValue.richText.map((rt: any) => rt.text || "").join("").trim();
    }
  }
  return String(cellValue).trim();
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const userRoles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true },
  });
  const roleCodes = userRoles.map((r) => r.role.code);
  const isAuthorized =
    roleCodes.some((rc) =>
      [
        "SUPER_ADMIN",
        "PLATFORM_ADMIN",
        "SELLER_OWNER",
        "ADMIN",
        "STAFF",
        "ACCOUNTANT",
        "ACCOUNTS_MANAGER",
        "FINANCE",
      ].includes(rc)
    ) ||
    (session.user as any)?.role === "ADMIN" ||
    (session.user as any)?.role === "SUPER_ADMIN" ||
    roleCodes.length === 0;

  if (!isAuthorized) {
    return apiError("FORBIDDEN", "Insufficient permissions for bulk product operations.", 403);
  }

  let sellerId = session.sellerId;
  if (!sellerId) {
    const activeSeller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } });
    sellerId = activeSeller?.id;
  }
  if (!sellerId) return apiError("SELLER_NOT_FOUND", "Seller not configured.", 404);

  let rawItems: BulkProductItem[] = [];
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return apiError("INVALID_INPUT", "No file uploaded in form data.", 400);
    }
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.worksheets[0];
      if (worksheet) {
        let headers: string[] = [];
        worksheet.eachRow((row, rowNumber) => {
          const colCount = Math.max(row.cellCount || 0, 15);
          const rowVals: string[] = [];
          for (let c = 1; c <= colCount; c++) {
            rowVals.push(getCellValueString(row.getCell(c).value));
          }

          if (rowNumber === 1) {
            headers = rowVals.map((v) => v.toLowerCase().replace(/[^a-z0-9]/g, ""));
          } else {
            const item: any = {};
            headers.forEach((h, i) => {
              const val = rowVals[i] || "";
              if (!h) return;
              if (h.includes("sku") || h.includes("code") || h.includes("partno") || h.includes("itemcode")) item.sku = val;
              else if (h.includes("name") || h.includes("title") || h.includes("product") || h.includes("item")) item.name = val;
              else if (h.includes("cat")) item.category = val;
              else if (h.includes("brand") || h.includes("mfg")) item.brand = val;
              else if (h.includes("unit") || h.includes("uom")) item.unitCode = val;
              else if (h.includes("mrp") || h.includes("retail")) item.mrp = val;
              else if (h.includes("dealer") || h.includes("dp") || h.includes("price") || h.includes("rate") || h.includes("wholesale")) item.dealerPrice = val;
              else if (h.includes("vat") || h.includes("tax")) item.taxPercent = val;
              else if (h.includes("stock") || h.includes("qty") || h.includes("quantity")) item.stock = val;
              else if (h.includes("desc")) item.description = val;
            });
            if (item.sku && item.name) {
              rawItems.push(item);
            }
          }
        });
      }
    } else if (name.endsWith(".json")) {
      const text = await file.text();
      const body = JSON.parse(text);
      if (Array.isArray(body)) rawItems = body;
      else if (body && Array.isArray(body.items)) rawItems = body.items;
      else if (body && Array.isArray(body.products)) rawItems = body.products;
    } else {
      const text = await file.text();
      rawItems = parseCsvToItems(text);
    }
  } else if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (Array.isArray(body)) {
      rawItems = body;
    } else if (body && Array.isArray(body.items)) {
      rawItems = body.items;
    } else if (body && Array.isArray(body.products)) {
      rawItems = body.products;
    } else if (body && typeof body.csvContent === "string") {
      rawItems = parseCsvToItems(body.csvContent);
    }
  } else {
    const text = await request.text();
    rawItems = parseCsvToItems(text);
  }

  if (!rawItems || rawItems.length === 0) {
    return apiError("INVALID_INPUT", "No valid product records found in import payload.", 400);
  }

  // Default warehouse lookup
  const warehouse = await prisma.warehouse.findFirst({
    where: { sellerId, isActive: true },
  });

  let defaultWarehouseId = warehouse?.id;
  if (!defaultWarehouseId) {
    const createdWh = await prisma.warehouse.create({
      data: {
        sellerId,
        code: "WH-MAIN",
        name: "Main Distribution Center",
        isActive: true,
      },
    });
    defaultWarehouseId = createdWh.id;
  }

  let createdCount = 0;
  let updatedCount = 0;
  const errors: Array<{ sku: string; error: string }> = [];

  // Group items by unique SKU to deduplicate within the file
  const seenSkus = new Map<string, BulkProductItem>();
  for (const item of rawItems) {
    const cleanSku = String(item.sku || "").trim().toUpperCase();
    if (!cleanSku || !item.name) continue;
    seenSkus.set(cleanSku, { ...item, sku: cleanSku });
  }

  // Pre-load all existing categories for seller
  const categories = await prisma.productCategory.findMany({
    where: { sellerId },
  });
  const categoryMap = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));

  // Ensure all categories needed exist up front
  for (const item of seenSkus.values()) {
    if (item.category && item.category.trim()) {
      const catKey = item.category.trim().toLowerCase();
      if (!categoryMap.has(catKey)) {
        try {
          const catCode = item.category.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 20) + "_" + Date.now().toString().slice(-4);
          const catSlug = item.category.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) + "-" + Date.now().toString().slice(-4);
          const newCat = await prisma.productCategory.create({
            data: {
              sellerId,
              name: item.category.trim(),
              code: catCode,
              slug: catSlug,
            },
          });
          categoryMap.set(catKey, newCat.id);
        } catch {
          // If concurrent create happened, re-fetch
          const existing = await prisma.productCategory.findFirst({
            where: { sellerId, name: item.category.trim() },
          });
          if (existing) categoryMap.set(catKey, existing.id);
        }
      }
    }
  }

  // Process in batches of 100 for high performance and minimal latency
  const allItems = Array.from(seenSkus.values());
  const BATCH_SIZE = 100;

  for (let b = 0; b < allItems.length; b += BATCH_SIZE) {
    const batch = allItems.slice(b, b + BATCH_SIZE);
    const batchSkus = batch.map((item) => item.sku);

    // Preload existing products in this batch in 1 single query
    const existingProducts = await prisma.product.findMany({
      where: {
        sellerId,
        sku: { in: batchSkus },
      },
      include: {
        variants: { where: { isDefault: true }, take: 1 },
        prices: { where: { priceType: "DEFAULT_DEALER" }, take: 1 },
        inventories: { take: 1 },
      },
    });

    const existingMap = new Map(existingProducts.map((p) => [p.sku.toUpperCase(), p]));

    // Execute updates/creates in concurrent sub-batches of 20
    const CONCURRENCY = 20;
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      const chunk = batch.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (item) => {
          const sku = item.sku;
          try {
            const mrpNum = Math.max(0, parseFloat(String(item.mrp || 0)) || 0);
            const dpNum = Math.max(0, parseFloat(String(item.dealerPrice || 0)) || (mrpNum > 0 ? mrpNum * 0.85 : 0));
            const stockNum = Math.max(0, parseInt(String(item.stock || 0), 10) || 0);
            const taxNum = item.taxPercent !== undefined && item.taxPercent !== null && item.taxPercent !== ""
              ? parseFloat(String(item.taxPercent))
              : 13.0;

            const catId = item.category?.trim() ? categoryMap.get(item.category.trim().toLowerCase()) || null : null;
            const existingProduct = existingMap.get(sku);

            if (existingProduct) {
              // Smart Upsert: Update Product, Variant MRP, Dealer Price, Stock
              await prisma.$transaction(async (tx) => {
                await tx.product.update({
                  where: { id: existingProduct.id },
                  data: {
                    name: item.name.trim(),
                    ...(catId ? { categoryId: catId } : {}),
                    ...(item.unitCode ? { unitCode: item.unitCode.trim().toUpperCase() } : {}),
                    ...(item.description ? { shortDescription: item.description.trim() } : {}),
                    taxPercent: new Prisma.Decimal(taxNum),
                  },
                });

                let variantId = existingProduct.variants[0]?.id;
                if (variantId) {
                  await tx.productVariant.update({
                    where: { id: variantId },
                    data: {
                      mrp: new Prisma.Decimal(mrpNum),
                    },
                  });
                } else {
                  const newVar = await tx.productVariant.create({
                    data: {
                      sellerId,
                      productId: existingProduct.id,
                      name: "Standard",
                      sku,
                      mrp: new Prisma.Decimal(mrpNum),
                      isDefault: true,
                    },
                  });
                  variantId = newVar.id;
                }

                const existingPrice = existingProduct.prices[0];
                if (existingPrice) {
                  await tx.productPrice.update({
                    where: { id: existingPrice.id },
                    data: {
                      amount: new Prisma.Decimal(dpNum),
                    },
                  });
                } else {
                  await tx.productPrice.create({
                    data: {
                      sellerId,
                      productId: existingProduct.id,
                      variantId,
                      priceType: "DEFAULT_DEALER",
                      amount: new Prisma.Decimal(dpNum),
                      currencyCode: "NPR",
                    },
                  });
                }

                const existingInv = existingProduct.inventories[0];
                if (existingInv) {
                  await tx.inventory.update({
                    where: { id: existingInv.id },
                    data: {
                      availableQuantity: new Prisma.Decimal(stockNum),
                    },
                  });
                } else {
                  await tx.inventory.create({
                    data: {
                      sellerId,
                      warehouseId: defaultWarehouseId!,
                      productId: existingProduct.id,
                      variantId: variantId!,
                      availableQuantity: new Prisma.Decimal(stockNum),
                    },
                  });
                }
              });

              updatedCount++;
            } else {
              // Create brand new product
              const slug = sku.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 35) + "-" + Date.now().toString().slice(-6);

              await prisma.$transaction(async (tx) => {
                const product = await tx.product.create({
                  data: {
                    sellerId,
                    name: item.name.trim(),
                    sku,
                    slug,
                    categoryId: catId,
                    unitCode: item.unitCode?.trim().toUpperCase() || "PCS",
                    shortDescription: item.description?.trim() || null,
                    taxPercent: new Prisma.Decimal(taxNum),
                    status: "ACTIVE",
                    publishStatus: "PUBLISHED",
                  },
                });

                const variant = await tx.productVariant.create({
                  data: {
                    sellerId,
                    productId: product.id,
                    name: "Standard",
                    sku,
                    mrp: new Prisma.Decimal(mrpNum),
                    isDefault: true,
                  },
                });

                await tx.productPrice.create({
                  data: {
                    sellerId,
                    productId: product.id,
                    variantId: variant.id,
                    priceType: "DEFAULT_DEALER",
                    amount: new Prisma.Decimal(dpNum),
                    currencyCode: "NPR",
                  },
                });

                await tx.inventory.create({
                  data: {
                    sellerId,
                    warehouseId: defaultWarehouseId!,
                    productId: product.id,
                    variantId: variant.id,
                    availableQuantity: new Prisma.Decimal(stockNum),
                  },
                });
              });

              createdCount++;
            }
          } catch (err: any) {
            errors.push({ sku, error: err?.message || "Failed to process item." });
          }
        })
      );
    }
  }

  return apiSuccess({
    totalReceived: rawItems.length,
    totalProcessed: seenSkus.size,
    createdCount,
    updatedCount,
    created: createdCount,
    updated: updatedCount,
    errorCount: errors.length,
    errors: errors.slice(0, 50),
  });
}

function parseCsvToItems(csvText: string): BulkProductItem[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const headerLine = lines[0];
  const headers = parseCsvRow(headerLine).map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));

  const skuIdx = headers.findIndex((h) => h.includes("sku") || h.includes("code"));
  const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("title") || h.includes("product"));
  const catIdx = headers.findIndex((h) => h.includes("cat"));
  const brandIdx = headers.findIndex((h) => h.includes("brand"));
  const unitIdx = headers.findIndex((h) => h.includes("unit"));
  const mrpIdx = headers.findIndex((h) => h.includes("mrp") || h.includes("retail"));
  const dpIdx = headers.findIndex((h) => h.includes("dealer") || h.includes("dp") || h.includes("price"));
  const vatIdx = headers.findIndex((h) => h.includes("vat") || h.includes("tax"));
  const stockIdx = headers.findIndex((h) => h.includes("stock") || h.includes("qty") || h.includes("quantity"));
  const descIdx = headers.findIndex((h) => h.includes("desc"));

  const items: BulkProductItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    if (row.length === 0) continue;

    const sku = skuIdx >= 0 ? row[skuIdx] : row[0];
    const name = nameIdx >= 0 ? row[nameIdx] : row[1];
    if (!sku || !name) continue;

    items.push({
      sku: sku.trim(),
      name: name.trim(),
      category: catIdx >= 0 ? row[catIdx]?.trim() : undefined,
      brand: brandIdx >= 0 ? row[brandIdx]?.trim() : undefined,
      unitCode: unitIdx >= 0 ? row[unitIdx]?.trim() : "PCS",
      mrp: mrpIdx >= 0 ? parseFloat(row[mrpIdx]) || 0 : 0,
      dealerPrice: dpIdx >= 0 ? parseFloat(row[dpIdx]) || 0 : 0,
      taxPercent: vatIdx >= 0 ? parseFloat(row[vatIdx]) || 13 : 13,
      stock: stockIdx >= 0 ? parseInt(row[stockIdx], 10) || 0 : 0,
      description: descIdx >= 0 ? row[descIdx]?.trim() : undefined,
    });
  }

  return items;
}

function parseCsvRow(rowStr: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < rowStr.length; i++) {
    const ch = rowStr[i];
    if (ch === '"') {
      if (insideQuotes && rowStr[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (ch === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
