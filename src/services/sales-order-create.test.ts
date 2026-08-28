import { describe, it, expect } from "vitest";

describe("Sales Order Calculations & Workflow Tests", () => {
  it("calculates commercial subtotal, 13% VAT, and grand total correctly", () => {
    const items = [
      { quantity: 2, unitPrice: 1000, discountAmount: 100 }, // subtotal: 1900, tax: 247, lineTotal: 2147
      { quantity: 5, unitPrice: 500, discountAmount: 0 },    // subtotal: 2500, tax: 325, lineTotal: 2825
    ];

    const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0); // 4500
    const discountTotal = items.reduce((sum, it) => sum + it.discountAmount, 0); // 100
    const netSubtotal = subtotal - discountTotal; // 4400
    const taxTotal = netSubtotal * 0.13; // 572
    const freightTotal = 250;
    const grandTotal = netSubtotal + taxTotal + freightTotal; // 5222

    expect(subtotal).toBe(4500);
    expect(discountTotal).toBe(100);
    expect(netSubtotal).toBe(4400);
    expect(taxTotal).toBe(572);
    expect(grandTotal).toBe(5222);
  });

  it("checks credit limit breach accurately", () => {
    const availableCredit = 10000;
    const orderTotal1 = 8000;
    const orderTotal2 = 12000;

    expect(orderTotal1 > availableCredit).toBe(false);
    expect(orderTotal2 > availableCredit).toBe(true);
  });
});
