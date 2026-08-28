import "server-only";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { productService } from "@/services/product.service";

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(50).optional(),
  brand: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export async function listProducts(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid catalogue filters.", 422);
  const session = await auth();
  try {
    const result = await productService.list(parsed.data, { dealerId: session?.dealerId });
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof Error && error.message === "COMPANY_NOT_CONFIGURED") {
      return apiError("COMPANY_NOT_CONFIGURED", "Bageshwari Tractors is not initialized.", 503);
    }
    return apiError("CATALOGUE_UNAVAILABLE", "The catalogue is temporarily unavailable.", 503);
  }
}
