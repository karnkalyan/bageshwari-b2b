import { OrderStatus } from "@prisma/client";
import { z } from "zod";

export const transitionOrderSchema = z.object({
  targetStatus: z.enum(Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]]),
  reason: z.string().trim().max(1000).optional(),
});
