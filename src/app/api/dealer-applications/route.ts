import { POST as submitApplication } from "@/app/api/s/[sellerSlug]/dealership-application/route";

export function POST(request: Request) {
  return submitApplication(request, {
    params: Promise.resolve({ sellerSlug: "bageshwari" }),
  });
}
