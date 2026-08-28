import { z } from "zod";
export const createShipmentSchema = z.object({
  orderId: z.string().min(1),
  finalInvoiceId: z.string().min(1).optional(),
  transportCompanyId: z.string().min(1),
  driverId: z.string().min(1),
  vehicleId: z.string().min(1),
  challanNumber: z.string().trim().max(50).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
  expectedDeliveryDate: z.coerce.date().optional(),
  remarks: z.string().trim().max(2000).optional(),
});
