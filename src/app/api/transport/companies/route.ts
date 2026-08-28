import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { listTransportCompanies, createTransportCompany, updateTransportCompany } from "@/services/transportation.service";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  panNumber: z.string().trim().max(20).optional(),
  vatNumber: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const updateSchema = createSchema.partial().extend({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);
  try {
    const companies = await listTransportCompanies(session.sellerId);
    return apiSuccess(companies);
  } catch (error) {
    return apiError("FETCH_FAILED", "Could not fetch transport companies.", 500);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid transport company details.", 422, parsed.error.format());

  try {
    const company = await createTransportCompany({ sellerId: session.sellerId, ...parsed.data });
    return apiSuccess(company, { status: 201 });
  } catch (error) {
    return apiError("CREATE_FAILED", error instanceof Error ? error.message : "Could not create transport company.", 409);
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid update data.", 422, parsed.error.format());

  const { id, ...data } = parsed.data;
  try {
    const updated = await updateTransportCompany(session.sellerId, id, data);
    return apiSuccess(updated);
  } catch (error) {
    return apiError("UPDATE_FAILED", error instanceof Error ? error.message : "Could not update transport company.", 409);
  }
}
