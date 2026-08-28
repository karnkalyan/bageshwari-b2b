import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const hostnamePattern = /^(?=.{1,100}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;

function normalizeDomain(input: string): string {
  const hostname = input.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  if (!hostnamePattern.test(hostname)) throw new Error("Invalid domain name.");
  return hostname;
}

export async function registerSellerDomain(input: {
  sellerId: string;
  hostname: string;
  makePrimary?: boolean;
}) {
  const hostname = normalizeDomain(input.hostname);
  const rawVerificationToken = randomBytes(32).toString("base64url");
  const verificationToken = createHash("sha256").update(rawVerificationToken).digest("hex");

  const domain = await prisma.$transaction(async (tx) => {
    if (input.makePrimary) {
      await tx.sellerDomain.updateMany({
        where: { sellerId: input.sellerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await tx.sellerDomain.create({
      data: {
        sellerId: input.sellerId,
        hostname,
        isPrimary: Boolean(input.makePrimary),
        verificationToken,
        verificationStatus: "PENDING_VERIFICATION",
        status: "PENDING_VERIFICATION",
        sslStatus: "pending",
      },
    });
    await tx.auditLog.create({
      data: {
        sellerId: input.sellerId,
        action: "seller.domain.registered",
        entity: "SellerDomain",
        entityId: created.id,
        newValue: JSON.stringify({ hostname, isPrimary: Boolean(input.makePrimary) }),
      },
    });
    return created;
  });

  return {
    domain,
    verification: {
      recordType: "TXT" as const,
      recordName: `_bageshwari-verification.${hostname}`,
      recordValue: rawVerificationToken,
    },
  };
}

export async function activateVerifiedDomain(input: {
  sellerId: string;
  domainId: string;
  presentedToken: string;
}) {
  const tokenHash = createHash("sha256").update(input.presentedToken).digest("hex");
  const domain = await prisma.sellerDomain.findFirst({
    where: { id: input.domainId, sellerId: input.sellerId },
  });
  if (!domain || !domain.verificationToken || domain.verificationToken !== tokenHash) {
    throw new Error("Domain verification failed.");
  }

  return prisma.sellerDomain.update({
    where: { id: domain.id },
    data: {
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      status: "ACTIVE",
    },
  });
}
