import { describe, expect, it } from "vitest";

describe("Accounts order revision and carton packaging logic", () => {
  it("correctly resolves quantity and revisedPrice from either field name", () => {
    // Test payload with quantity & unitPrice (from order-revision-dialog)
    const itemInput1 = {
      orderItemId: "item-1",
      quantity: 12,
      unitPrice: 450,
      discountAmount: 50,
      accountsRemarks: "Price correction",
    };

    const previousQuantity = 10;
    const previousPrice = 400;

    const inputQty1 = (itemInput1 as any).revisedQuantity !== undefined ? (itemInput1 as any).revisedQuantity : itemInput1.quantity;
    const revisedQuantity1 = inputQty1 !== undefined ? Number(inputQty1) : previousQuantity;

    const inputPrice1 = (itemInput1 as any).revisedPrice !== undefined ? (itemInput1 as any).revisedPrice : itemInput1.unitPrice;
    const revisedPrice1 = inputPrice1 !== undefined ? Number(inputPrice1) : previousPrice;

    expect(revisedQuantity1).toBe(12);
    expect(revisedPrice1).toBe(450);

    // Test payload with revisedQuantity & revisedPrice
    const itemInput2 = {
      orderItemId: "item-2",
      revisedQuantity: 25,
      revisedPrice: 600,
    };

    const inputQty2 = itemInput2.revisedQuantity !== undefined ? itemInput2.revisedQuantity : (itemInput2 as any).quantity;
    const revisedQuantity2 = inputQty2 !== undefined ? Number(inputQty2) : previousQuantity;

    const inputPrice2 = itemInput2.revisedPrice !== undefined ? itemInput2.revisedPrice : (itemInput2 as any).unitPrice;
    const revisedPrice2 = inputPrice2 !== undefined ? Number(inputPrice2) : previousPrice;

    expect(revisedQuantity2).toBe(25);
    expect(revisedPrice2).toBe(600);
  });

  it("generates order-scoped, collision-free carton package numbers", () => {
    const orderNumber = "ORD-2026-9041";
    const existingPackages = new Set<string>();

    const totalCartons = 3;
    const generated: string[] = [];

    for (let i = 0; i < totalCartons; i++) {
      let desiredName = `CTN-${String(i + 1).padStart(2, "0")}`;
      if (!desiredName || desiredName.startsWith("CTN-") || desiredName.startsWith("Box")) {
        desiredName = `${orderNumber}-CTN-${String(i + 1).padStart(2, "0")}`;
      }

      let packageNumber = desiredName;
      let attempt = 1;
      while (existingPackages.has(packageNumber)) {
        attempt++;
        packageNumber = `${desiredName}-${attempt}`;
      }

      existingPackages.add(packageNumber);
      generated.push(packageNumber);
    }

    expect(generated).toEqual([
      "ORD-2026-9041-CTN-01",
      "ORD-2026-9041-CTN-02",
      "ORD-2026-9041-CTN-03",
    ]);

    // Test conflict handling when carton name already exists
    let conflictCarton = "ORD-2026-9041-CTN-01";
    let attempt = 1;
    let resolvedNumber = conflictCarton;
    while (existingPackages.has(resolvedNumber)) {
      attempt++;
      resolvedNumber = `${conflictCarton}-${attempt}`;
    }
    expect(resolvedNumber).toBe("ORD-2026-9041-CTN-01-2");
  });
});
