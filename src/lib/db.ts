import { PrismaClient } from "@prisma/client";
import fs from "fs";

function resolveDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_PASSWORD_FILE && fs.existsSync(process.env.DATABASE_PASSWORD_FILE)) {
    try {
      const password = fs.readFileSync(process.env.DATABASE_PASSWORD_FILE, "utf8").trim();
      const host = process.env.DATABASE_HOST || "host.docker.internal";
      const port = process.env.DATABASE_PORT || "3306";
      const user = process.env.DATABASE_USER || "admin";
      const dbName = process.env.DATABASE_NAME || "bageshwari_b2b";
      const encodedPassword = encodeURIComponent(password);
      const constructed = `mysql://${user}:${encodedPassword}@${host}:${port}/${dbName}`;
      process.env.DATABASE_URL = constructed;
      return constructed;
    } catch {
      // fallback
    }
  }
  return process.env.DATABASE_URL;
}

const resolvedUrl = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: resolvedUrl ? { db: { url: resolvedUrl } } : undefined,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
