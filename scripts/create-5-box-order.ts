import { PrismaClient, Prisma, OrderStatus, OrderSource, PaymentMethod, ShipmentStatus, PackageStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating full-featured 5-box order with barcode labels and complete packing list...");

  // 1. Get Seller & Dealer
  const seller = await prisma.seller.findFirst({
    where: { status: "ACTIVE" },
  });
  if (!seller) throw new Error("No active seller found.");

  const dealer = await prisma.dealer.findFirst({
    where: { sellerId: seller.id },
    include: { creditProfile: true, addresses: { where: { isDefault: true } } },
  });
  if (!dealer) throw new Error("No dealer found.");

  // 2. Get Products
  const products = await prisma.product.findMany({
    where: { sellerId: seller.id, status: "ACTIVE" },
    include: { variants: true, prices: true },
    take: 5,
  });
  if (products.length === 0) throw new Error("No products found.");

  // 3. Generate Order Number
  const count = await prisma.order.count({ where: { sellerId: seller.id } });
  const orderNumber = `ORD-BOX5-${String(count + 1).padStart(4, "0")}`;

  // 4. Build Order Items
  let subtotal = 0;
  const processedItems = products.map((p, idx) => {
    const variant = p.variants[0];
    const qty = (idx + 1) * 2;
    const unitPrice = p.prices[0] ? Number(p.prices[0].amount) : 1250;
    const mrp = unitPrice * 1.15;
    const lineSubtotal = unitPrice * qty;
    const tax = lineSubtotal * 0.13;
    const lineTotal = lineSubtotal + tax;

    subtotal += lineSubtotal;

    return {
      sellerId: seller.id,
      productId: p.id,
      variantId: variant?.id || p.id,
      sku: variant?.sku || p.sku,
      productName: p.name,
      variantName: variant?.name || "Default",
      status: "ACTIVE" as const,
      originalQuantity: new Prisma.Decimal(qty),
      approvedQuantity: new Prisma.Decimal(qty),
      pickedQuantity: new Prisma.Decimal(qty),
      mrp: new Prisma.Decimal(mrp),
      dealerPrice: new Prisma.Decimal(unitPrice),
      discountAmount: new Prisma.Decimal(0),
      taxAmount: new Prisma.Decimal(tax),
      lineTotal: new Prisma.Decimal(lineTotal),
      accountsRemarks: `Packed across cartons.`,
    };
  });

  const taxTotal = subtotal * 0.13;
  const freightTotal = 1500;
  const grandTotal = subtotal + taxTotal + freightTotal;

  // 5. Create Order
  const order = await prisma.order.create({
    data: {
      sellerId: seller.id,
      dealerId: dealer.id,
      orderNumber,
      source: OrderSource.SALESPERSON_PORTAL,
      status: OrderStatus.PACKED_AND_LABELLED,
      currencyCode: "NPR",
      subtotal: new Prisma.Decimal(subtotal),
      discountTotal: new Prisma.Decimal(0),
      taxTotal: new Prisma.Decimal(taxTotal),
      freightTotal: new Prisma.Decimal(freightTotal),
      grandTotal: new Prisma.Decimal(grandTotal),
      salespersonNotes: "Urgent 5-box consolidated shipment with barcode labels.",
      items: {
        create: processedItems,
      },
    },
    include: { items: true },
  });

  console.log(`Created Order ${order.orderNumber} (ID: ${order.id})`);

  // 6. Create Proforma Invoice
  const proformaNumber = `PI-${orderNumber.replace(/^[A-Za-z]+-?/, "")}`;
  await prisma.proformaInvoice.create({
    data: {
      sellerId: seller.id,
      orderId: order.id,
      proformaNumber,
      status: "CONFIRMED",
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      taxTotal: order.taxTotal,
      freightTotal: order.freightTotal,
      grandTotal: order.grandTotal,
      paymentTerms: "Confirmed via Dealer Credit (30 Days Net Terms)",
      items: {
        create: order.items.map((it) => ({
          sellerId: seller.id,
          orderItemId: it.id,
          productId: it.productId,
          variantId: it.variantId,
          sku: it.sku,
          description: `${it.productName} (${it.variantName})`,
          quantity: it.originalQuantity,
          unitPrice: it.dealerPrice,
          taxAmount: it.taxAmount,
          lineTotal: it.lineTotal,
        })),
      },
    },
  });

  // 7. Create Pick List
  const pickListNumber = `PL-${orderNumber.replace(/^[A-Za-z]+-?/, "")}`;
  const defaultWarehouse = await prisma.warehouse.findFirst({ where: { sellerId: seller.id } });
  if (defaultWarehouse) {
    await prisma.pickList.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        warehouseId: defaultWarehouse.id,
        pickListNumber,
        status: "COMPLETED",
        notes: "All 5 line items picked and verified for 5-box packaging.",
        items: {
          create: order.items.map((it) => ({
            sellerId: seller.id,
            productId: it.productId,
            variantId: it.variantId,
            sku: it.sku,
            approvedQuantity: it.originalQuantity,
            pickedQuantity: it.originalQuantity,
          })),
        },
      },
    });
  }

  // 8. Create Final Tax Invoice
  const invoiceNumber = `INV-${orderNumber.replace(/^[A-Za-z]+-?/, "")}`;
  const finalInvoice = await prisma.finalInvoice.create({
    data: {
      sellerId: seller.id,
      orderId: order.id,
      invoiceNumber,
      status: "ISSUED",
      subtotal: order.subtotal,
      taxTotal: order.taxTotal,
      freightTotal: order.freightTotal,
      grandTotal: order.grandTotal,
      paidAmount: order.grandTotal,
      outstandingAmount: new Prisma.Decimal(0),
      paymentTerms: "Settled via Dealer Credit Facility",
      items: {
        create: order.items.map((it) => ({
          sellerId: seller.id,
          orderItemId: it.id,
          productId: it.productId,
          variantId: it.variantId,
          sku: it.sku,
          description: it.productName,
          quantity: it.originalQuantity,
          unitPrice: it.dealerPrice,
          taxAmount: it.taxAmount,
          lineTotal: it.lineTotal,
        })),
      },
    },
  });

  // 9. Create Payment & Credit Approval
  await prisma.payment.create({
    data: {
      sellerId: seller.id,
      orderId: order.id,
      finalInvoiceId: finalInvoice.id,
      paymentNumber: `REC-${orderNumber.replace(/^[A-Za-z]+-?/, "")}`,
      method: PaymentMethod.CREDIT,
      status: "CONFIRMED",
      amount: order.grandTotal,
      transactionRef: "CREDIT-30D-APPROVED",
      remarks: "Authorized under dealer credit profile.",
    },
  });

  // 10. Create Transport & Shipment Record
  const shipmentNumber = `SHP-${orderNumber.replace(/^[A-Za-z]+-?/, "")}`;
  const challanNumber = `CHL-${orderNumber.replace(/^[A-Za-z]+-?/, "")}`;

  const shipment = await prisma.shipment.create({
    data: {
      sellerId: seller.id,
      orderId: order.id,
      finalInvoiceId: finalInvoice.id,
      shipmentNumber,
      challanNumber,
      trackingNumber: `TRK-NP-${orderNumber.replace(/^[A-Za-z]+-?/, "")}`,
      status: ShipmentStatus.DISPATCHED,
      transporter: "Nepal Cargo & Express Freight Logistics Pvt. Ltd.",
      driverName: "Hari Bahadur Thapa",
      driverPhone: "+977-9841234567",
      vehicleNumber: "Ba 2 Kha 4921",
      dispatchDate: new Date(),
      expectedDelivery: new Date(Date.now() + 86_400_000 * 2),
      totalCartons: 5,
      totalWeight: new Prisma.Decimal(82.5),
      remarks: "Consignment packed into 5 numbered cartons with barcode shipping labels.",
    },
  });

  // 11. Create Exactly 5 Packages / Boxes with full details
  const boxConfigs = [
    {
      boxIndex: 1,
      packageType: "Heavy Duty Corrugated Carton",
      weight: 14.5,
      length: 45,
      width: 35,
      height: 25,
      handlingInstructions: "FRAGILE - PRECISION BEARINGS",
      item: order.items[0],
      qty: 4,
    },
    {
      boxIndex: 2,
      packageType: "Reinforced Wooden Crate",
      weight: 22.8,
      length: 55,
      width: 40,
      height: 30,
      handlingInstructions: "HEAVY CARGO - HANDLE WITH CARE",
      item: order.items[1] || order.items[0],
      qty: 6,
    },
    {
      boxIndex: 3,
      packageType: "Standard Heavy Parts Box",
      weight: 11.2,
      length: 40,
      width: 30,
      height: 20,
      handlingInstructions: "KEEP DRY - THIS SIDE UP",
      item: order.items[2] || order.items[0],
      qty: 8,
    },
    {
      boxIndex: 4,
      packageType: "Component Sealed Box",
      weight: 18.6,
      length: 50,
      width: 35,
      height: 25,
      handlingInstructions: "DO NOT DROP - PRECISION SEALS",
      item: order.items[3] || order.items[0],
      qty: 10,
    },
    {
      boxIndex: 5,
      packageType: "Heavy Spares Carton",
      weight: 15.4,
      length: 45,
      width: 35,
      height: 25,
      handlingInstructions: "TOP STACK ONLY - FRAGILE",
      item: order.items[4] || order.items[0],
      qty: 12,
    },
  ];

  for (const box of boxConfigs) {
    const packageNumber = `PKG-${orderNumber.slice(-5)}-0${box.boxIndex}`;
    const barcodeData = `${packageNumber}-${order.orderNumber}-BOX${box.boxIndex}OF5`;

    await prisma.package.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        shipmentId: shipment.id,
        packageNumber,
        packageType: box.packageType,
        weight: new Prisma.Decimal(box.weight),
        length: new Prisma.Decimal(box.length),
        width: new Prisma.Decimal(box.width),
        height: new Prisma.Decimal(box.height),
        status: PackageStatus.LABELLED,
        barcodeData,
        handlingInstructions: box.handlingInstructions,
        itemsJson: JSON.stringify([
          {
            sku: box.item.sku,
            productName: box.item.productName,
            quantity: box.qty,
            unitCode: "PCS",
          },
        ]),
      },
    });

    console.log(`Created Box ${box.boxIndex} of 5: ${packageNumber} (${box.weight} kg)`);
  }

  console.log(`\n✅ Successfully created 5-Box Order ${order.orderNumber} (ID: ${order.id})!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
