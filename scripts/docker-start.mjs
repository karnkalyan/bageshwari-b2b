import { execSync, spawn } from "child_process";
import net from "net";

const databaseUrl = process.env.DATABASE_URL || "";
console.log("==========================================");
console.log(" Starting Bageshwari B2B in Docker");
console.log("==========================================");

// Wait for database server to accept TCP connections before pushing schema
async function waitForDatabase() {
  if (!databaseUrl) {
    console.warn("DATABASE_URL is not configured.");
    return;
  }

  try {
    // Parse host and port from connection string
    const url = new URL(databaseUrl.replace(/^mysql:\/\//, "http://"));
    const host = url.hostname || "127.0.0.1";
    const port = parseInt(url.port || "3306", 10);

    console.log(`Connecting to database at ${host}:${port}...`);
    let connected = false;

    for (let i = 1; i <= 30; i++) {
      connected = await new Promise((resolve) => {
        const socket = net.createConnection({ host, port, timeout: 2000 }, () => {
          socket.destroy();
          resolve(true);
        });
        socket.on("error", () => resolve(false));
        socket.on("timeout", () => {
          socket.destroy();
          resolve(false);
        });
      });

      if (connected) {
        console.log(`✓ Database at ${host}:${port} is online and ready!`);
        return;
      }

      console.log(`Database is still initializing... retrying in 2s (${i}/30)`);
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.warn("Proceeding after timeout: database might be on another network interface.");
  } catch (err) {
    console.warn("Could not parse host from DATABASE_URL, proceeding directly:", err.message);
  }
}

async function start() {
  await waitForDatabase();

  // Run db push to ensure schema is synced
  try {
    console.log("Syncing database schema (prisma db push)...");
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
  } catch (err) {
    console.warn("Notice: prisma db push warning:", err.message);
  }

  // Normalize any legacy fractional VAT values (e.g. 0.13 -> 13.00) in database
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$executeRawUnsafe(`UPDATE Product SET taxPercent = taxPercent * 100 WHERE taxPercent > 0 AND taxPercent <= 1.0`);
    await prisma.$executeRawUnsafe(`UPDATE ProductCategory SET taxPercent = taxPercent * 100 WHERE taxPercent > 0 AND taxPercent <= 1.0`);
    await prisma.$executeRawUnsafe(`UPDATE CompanyProfile SET defaultVatPercent = defaultVatPercent * 100 WHERE defaultVatPercent > 0 AND defaultVatPercent <= 1.0`);
    
    // Auto-repair legacy company profile name, address duplication, and double hyphens
    await prisma.$executeRawUnsafe(`UPDATE CompanyProfile SET companyName = 'Bageshwari Tractors' WHERE companyName = 'Bageshwari Tractors Pvt. Ltd.'`);
    await prisma.$executeRawUnsafe(`UPDATE CompanyProfile SET bankAccountName = 'Bageshwari Tractors' WHERE bankAccountName = 'Bageshwari Tractors Pvt. Ltd.'`);
    await prisma.$executeRawUnsafe(`UPDATE CompanyProfile SET address = 'Nepalgunj, Banke' WHERE address LIKE 'Main Highway Road, Nepalgunj, Banke, Nepal%'`);
    await prisma.$executeRawUnsafe(`UPDATE ProformaInvoice SET proformaNumber = REPLACE(proformaNumber, '--', '-') WHERE proformaNumber LIKE '%--%'`);
    await prisma.$executeRawUnsafe(`UPDATE \`Order\` SET orderNumber = REPLACE(orderNumber, '--', '-') WHERE orderNumber LIKE '%--%'`);
    await prisma.$executeRawUnsafe(`UPDATE FinalInvoice SET invoiceNumber = REPLACE(invoiceNumber, '--', '-') WHERE invoiceNumber LIKE '%--%'`);
    await prisma.$executeRawUnsafe(`UPDATE NumberSequence SET prefix = TRIM(TRAILING '-' FROM prefix) WHERE prefix LIKE '%-'`);
    
    await prisma.$disconnect();
    console.log("✓ Verified database VAT percentages, company profile, and document number formats.");
  } catch (err) {
    console.warn("Notice: Database maintenance and normalization notice:", err.message);
  }

  // Seed initial data only if database is fresh / unseeded
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const existingSeller = await prisma.seller.findFirst().catch(() => null);
    await prisma.$disconnect();

    if (existingSeller) {
      console.log("✓ Database already seeded, skipping prisma db seed.");
    } else {
      console.log("Seeding initial data (prisma db seed)...");
      execSync("npx prisma db seed", { stdio: "inherit" });
    }
  } catch (err) {
    console.warn("Notice: prisma db seed skipped or check failed:", err.message);
  }

  // Start Next.js production server
  const port = process.env.PORT || "3011";
  console.log(`Launching Next.js production server on http://0.0.0.0:${port}...`);
  const child = spawn("npx", ["next", "start", "-p", port, "-H", "0.0.0.0"], {
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
