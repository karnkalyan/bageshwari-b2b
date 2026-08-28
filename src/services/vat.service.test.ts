import { describe, it, expect } from "vitest";
import { calculateVatBreakdown } from "./vat.service";

describe("VAT Calculation Engine", () => {
  it("correctly computes VAT breakdown for VAT-exclusive prices", () => {
    const basePrice = 1000;
    const qty = 2;
    const vatRate = 13;
    const result = calculateVatBreakdown(basePrice, qty, vatRate, false);

    expect(result.netUnitPrice).toBe(1000);
    expect(result.vatUnitPrice).toBe(130);
    expect(result.grossUnitPrice).toBe(1130);
    expect(result.subtotal).toBe(2000);
    expect(result.vatTotal).toBe(260);
    expect(result.grandTotal).toBe(2260);
  });

  it("correctly extracts VAT breakdown for VAT-inclusive prices", () => {
    const grossPrice = 1130;
    const qty = 1;
    const vatRate = 13;
    const result = calculateVatBreakdown(grossPrice, qty, vatRate, true);

    expect(result.grossUnitPrice).toBe(1130);
    expect(result.netUnitPrice).toBe(1000);
    expect(result.vatUnitPrice).toBe(130);
    expect(result.subtotal).toBe(1000);
    expect(result.vatTotal).toBe(130);
    expect(result.grandTotal).toBe(1130);
  });

  it("handles 0% VAT rate (exempt items)", () => {
    const basePrice = 500;
    const qty = 3;
    const vatRate = 0;
    const result = calculateVatBreakdown(basePrice, qty, vatRate, false);

    expect(result.netUnitPrice).toBe(500);
    expect(result.vatUnitPrice).toBe(0);
    expect(result.grossUnitPrice).toBe(500);
    expect(result.subtotal).toBe(1500);
    expect(result.vatTotal).toBe(0);
    expect(result.grandTotal).toBe(1500);
  });
});
