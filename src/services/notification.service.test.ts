import { describe, it, expect } from "vitest";

describe("Notification Service Tests", () => {
  it("formats relative timestamps correctly", () => {
    const formatRelative = (diffMs: number) => {
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    };

    expect(formatRelative(10000)).toBe("Just now");
    expect(formatRelative(5 * 60000)).toBe("5m ago");
    expect(formatRelative(2 * 3600000)).toBe("2h ago");
    expect(formatRelative(3 * 86400000)).toBe("3d ago");
  });

  it("identifies correct notification icon type", () => {
    const getType = (title: string, linkUrl?: string) => {
      const lower = `${title} ${linkUrl || ""}`.toLowerCase();
      if (lower.includes("invoice") || lower.includes("proforma")) return "INVOICE";
      if (lower.includes("pick") || lower.includes("warehouse")) return "WAREHOUSE";
      if (lower.includes("ship") || lower.includes("dispatch")) return "LOGISTICS";
      if (lower.includes("payment") || lower.includes("paid")) return "PAYMENT";
      if (lower.includes("order") || lower.includes("cart")) return "ORDER";
      return "DEFAULT";
    };

    expect(getType("New Order Received: SO-001")).toBe("ORDER");
    expect(getType("Proforma Invoice Confirmed")).toBe("INVOICE");
    expect(getType("Order Ready for Warehouse")).toBe("WAREHOUSE");
    expect(getType("Shipment Dispatched", "/dealer/shipments")).toBe("LOGISTICS");
    expect(getType("Payment Verified")).toBe("PAYMENT");
  });
});
