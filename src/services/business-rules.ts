export class BusinessRuleError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

export function assertAssignedDealer(assignedDealerIds: readonly string[], dealerId: string) {
  if (!assignedDealerIds.includes(dealerId)) {
    throw new BusinessRuleError("DEALER_NOT_ASSIGNED", "Salesperson cannot order for an unassigned dealer.");
  }
}

export function requireRevisionReason(reason: string | null | undefined) {
  if (!reason?.trim()) throw new BusinessRuleError("REVISION_REASON_REQUIRED", "Every accounts revision requires a reason.");
  return reason.trim();
}

export function assertProformaAllowed(status: string) {
  if (status !== "FINAL_ORDER_CONFIRMED") throw new BusinessRuleError("FINAL_CONFIRMATION_REQUIRED", "Final confirmation is required before Proforma generation.");
}

export function assertWarehouseReleaseAllowed(proformaStatus: string | null) {
  if (proformaStatus !== "CONFIRMED") throw new BusinessRuleError("PROFORMA_CONFIRMATION_REQUIRED", "Confirmed Proforma is required before warehouse release.");
}

export function assertFinalInvoiceAllowed(input: { pickListStatus: string | null; unresolvedExceptions: number }) {
  if (input.pickListStatus !== "COMPLETED") throw new BusinessRuleError("PICK_LIST_COMPLETION_REQUIRED", "Completed Pick List is required.");
  if (input.unresolvedExceptions > 0) throw new BusinessRuleError("PICKING_EXCEPTION_UNRESOLVED", "Picking exceptions must be resolved.");
}

export function finalInvoiceQuantity(pickedQuantity: number) {
  if (!Number.isFinite(pickedQuantity) || pickedQuantity < 0) throw new BusinessRuleError("INVALID_PICKED_QUANTITY", "Picked quantity must be non-negative.");
  return pickedQuantity;
}

export function assertPackingAllowed(input: { confirmedPayment: number; approvedCredit: number }) {
  if (input.confirmedPayment <= 0 && input.approvedCredit <= 0) throw new BusinessRuleError("PAYMENT_OR_CREDIT_REQUIRED", "Confirmed payment or approved credit is required.");
}

export function calculateShipmentWeight(weights: readonly number[]) {
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) throw new BusinessRuleError("INVALID_PACKAGE_WEIGHT", "Package weights must be non-negative.");
  return Math.round(weights.reduce((total, weight) => total + weight, 0) * 1000) / 1000;
}

export function assertTransportSelection(input: {
  transportCompanyId: string;
  driverCompanyId: string;
  vehicleCompanyId: string;
  challanNumber?: string | null;
}) {
  if (input.driverCompanyId !== input.transportCompanyId) throw new BusinessRuleError("DRIVER_TRANSPORT_MISMATCH", "Driver must belong to the selected transporter.");
  if (input.vehicleCompanyId !== input.transportCompanyId) throw new BusinessRuleError("VEHICLE_TRANSPORT_MISMATCH", "Vehicle must belong to the selected transporter.");
  if (!input.challanNumber?.trim()) throw new BusinessRuleError("CHALLAN_REQUIRED", "A Challan number is required before dispatch.");
  return { ...input, challanNumber: input.challanNumber.trim() };
}

export const defaultBusinessLocale = {
  country: "Nepal",
  city: "Nepalgunj",
  district: "Banke",
  currencyCode: "NPR",
  timeZone: "Asia/Kathmandu",
} as const;
