import "server-only";
import { prisma } from "@/lib/db";

export class CompanyService {
  getPublicProfile() {
    return prisma.companyProfile.findUnique({
      where: { id: "bageshwari-tractors" },
      select: {
        companyName: true,
        tradingName: true,
        email: true,
        phone: true,
        website: true,
        country: true,
        province: true,
        district: true,
        city: true,
        address: true,
        currencyCode: true,
        timeZone: true,
        businessHours: true,
        footerText: true,
      },
    });
  }
}

export const companyService = new CompanyService();
