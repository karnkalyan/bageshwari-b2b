import "server-only";
import { apiError, apiSuccess } from "@/lib/api-response";
import { companyService } from "@/services/company.service";

export async function getCompany() {
  const company = await companyService.getPublicProfile();
  return company
    ? apiSuccess(company)
    : apiError("COMPANY_NOT_CONFIGURED", "Bageshwari Tractors is not initialized.", 404);
}
