import { describe, expect, it, vi } from "vitest";
import type { OrderStatus } from "@prisma/client";

vi.mock("server-only", () => ({}));

import { isAllowedOrderTransition } from "./order-transition.service";

describe("Bageshwari order state machine", () => {
  it("supports the mandatory order-to-delivery sequence", () => {
    const sequence: OrderStatus[] = [
      "DRAFT",
      "PENDING_ACCOUNTS_REVIEW",
      "ACCOUNTS_REVIEW_IN_PROGRESS",
      "WAITING_FOR_DEALER_CONFIRMATION",
      "FINAL_ORDER_CONFIRMED",
      "PROFORMA_INVOICE_GENERATED",
      "PROFORMA_INVOICE_CONFIRMED",
      "READY_FOR_WAREHOUSE",
      "PICK_LIST_GENERATED",
      "PICKING_IN_PROGRESS",
      "PICKING_COMPLETED",
      "PICK_LIST_COMPLETED",
      "FINAL_INVOICE_ISSUED",
      "PAYMENT_PENDING",
      "PAID",
      "PACKING_IN_PROGRESS",
      "PACKED",
      "PACKED_AND_LABELLED",
      "SHIPPED",
      "IN_TRANSIT",
      "DELIVERED",
      "COMPLETED",
    ];

    for (let index = 0; index < sequence.length - 1; index += 1) {
      expect(isAllowedOrderTransition(sequence[index], sequence[index + 1])).toBe(true);
    }
  });

  it("blocks bypasses around confirmation, picking, and payment", () => {
    expect(isAllowedOrderTransition("FINAL_ORDER_CONFIRMED", "READY_FOR_WAREHOUSE")).toBe(false);
    expect(isAllowedOrderTransition("PICK_LIST_GENERATED", "FINAL_INVOICE_ISSUED")).toBe(false);
    expect(isAllowedOrderTransition("FINAL_INVOICE_ISSUED", "PACKING_IN_PROGRESS")).toBe(false);
  });
});
