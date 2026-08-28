import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { formatCurrency } from "@/lib/utils";
import { isAllowedOrderTransition } from "@/modules/orders/order-transition.service";
import { toDealerVariant, toPublicVariant } from "./product-visibility";
import {
  assertAssignedDealer,
  assertFinalInvoiceAllowed,
  assertPackingAllowed,
  assertProformaAllowed,
  assertTransportSelection,
  assertWarehouseReleaseAllowed,
  calculateShipmentWeight,
  defaultBusinessLocale,
  finalInvoiceQuantity,
  requireRevisionReason,
} from "./business-rules";

const variant = { id: "v1", name: "Standard", sku: "SKU-1", mrp: 1000, isDefault: true };

describe("mandatory Bageshwari business rules", () => {
  it("does not serialize dealer price for public users", () => {
    const databaseRow = { ...variant, dealerPrice: 700 };
    expect(JSON.stringify(toPublicVariant(databaseRow))).not.toContain("dealerPrice");
  });
  it("serializes dealer price for authorized dealers", () => expect(toDealerVariant(variant, 700, 8).dealerPrice).toBe(700));
  it("blocks a salesperson from an unassigned dealer", () => expect(() => assertAssignedDealer(["d1"], "d2")).toThrowError(/unassigned/i));
  it("allows an assigned salesperson dealer", () => expect(() => assertAssignedDealer(["d1"], "d1")).not.toThrow());
  it("requires an accounts revision reason", () => expect(() => requireRevisionReason(" ")).toThrowError(/reason/i));
  it("normalizes an accounts revision reason", () => expect(requireRevisionReason("  stock correction ")).toBe("stock correction"));
  it("blocks Proforma before final confirmation", () => expect(() => assertProformaAllowed("DRAFT")).toThrowError(/confirmation/i));
  it("allows Proforma after final confirmation", () => expect(() => assertProformaAllowed("FINAL_ORDER_CONFIRMED")).not.toThrow());
  it("blocks warehouse release before Proforma confirmation", () => expect(() => assertWarehouseReleaseAllowed("GENERATED")).toThrowError(/Proforma/i));
  it("allows warehouse release after Proforma confirmation", () => expect(() => assertWarehouseReleaseAllowed("CONFIRMED")).not.toThrow());
  it("blocks final invoice before Pick List completion", () => expect(() => assertFinalInvoiceAllowed({ pickListStatus: "PICKING_IN_PROGRESS", unresolvedExceptions: 0 })).toThrowError(/Pick List/i));
  it("blocks final invoice with an unresolved exception", () => expect(() => assertFinalInvoiceAllowed({ pickListStatus: "COMPLETED", unresolvedExceptions: 1 })).toThrowError(/exceptions/i));
  it("uses actual picked quantity for final invoice", () => expect(finalInvoiceQuantity(7)).toBe(7));
  it("blocks invalid picked quantity", () => expect(() => finalInvoiceQuantity(-1)).toThrowError(/quantity/i));
  it("requires payment or approved credit before packing", () => expect(() => assertPackingAllowed({ confirmedPayment: 0, approvedCredit: 0 })).toThrowError(/payment/i));
  it("allows approved credit before packing", () => expect(() => assertPackingAllowed({ confirmedPayment: 0, approvedCredit: 5000 })).not.toThrow());
  it("calculates carton total weight", () => expect(calculateShipmentWeight([12.25, 8.5, 0.125])).toBe(20.875));
  it("rejects a driver from another transporter", () => expect(() => assertTransportSelection({ transportCompanyId: "t1", driverCompanyId: "t2", vehicleCompanyId: "t1", challanNumber: "CHL-1" })).toThrowError(/Driver/i));
  it("rejects a vehicle from another transporter", () => expect(() => assertTransportSelection({ transportCompanyId: "t1", driverCompanyId: "t1", vehicleCompanyId: "t2", challanNumber: "CHL-1" })).toThrowError(/Vehicle/i));
  it("requires and retains a Challan number", () => expect(assertTransportSelection({ transportCompanyId: "t1", driverCompanyId: "t1", vehicleCompanyId: "t1", challanNumber: " CHL-2026-1 " }).challanNumber).toBe("CHL-2026-1"));
  it("prevents skipping order stages", () => expect(isAllowedOrderTransition("DRAFT", "FINAL_ORDER_CONFIRMED")).toBe(false));
  it("formats values as NPR", () => expect(formatCurrency(1250)).toMatch(/NPR|Rs/));
  it("uses the Nepalgunj, Nepal defaults", () => expect(defaultBusinessLocale).toMatchObject({ country: "Nepal", city: "Nepalgunj", district: "Banke", currencyCode: "NPR", timeZone: "Asia/Kathmandu" }));
});
