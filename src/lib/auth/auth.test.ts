import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth/auth.config";
import bcrypt from "bcryptjs";

describe("Admin and Dealer Login Tests", () => {
  const defaultPassword = process.env.SEED_PASSWORD || "ChangeMe-Bageshwari-2026!";
  const credProvider = authConfig.providers[0] as any;
  const authorize = credProvider.options.authorize;

  beforeAll(async () => {
    // Ensure all active users have the password hash corresponding to SEED_PASSWORD
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    await prisma.user.updateMany({
      data: {
        passwordHash,
        status: "ACTIVE",
        loginAttempts: 0,
        lockedUntil: null,
      },
    });
  });

  it("should successfully authorize Staff Admin login", async () => {
    const dummyReq = new Request("http://localhost:3000/api/auth/callback/credentials", {
      headers: {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "Mozilla/5.0 AdminTest",
      },
    });

    const user = await authorize(
      {
        email: "admin@bageshwari.com.np",
        password: defaultPassword,
        loginScope: "staff",
      },
      dummyReq
    );

    expect(user).not.toBeNull();
    expect(user?.email).toBe("admin@bageshwari.com.np");
    expect(user?.roles).toContain("ADMIN");
    expect(user?.sellerSlug).toBe("bageshwari");
    expect(user?.dealerId).toBeNull();
  });

  it("should successfully authorize Platform Super Admin login", async () => {
    const dummyReq = new Request("http://localhost:3000/api/auth/callback/credentials", {
      headers: {
        "x-forwarded-for": "10.0.0.2",
        "user-agent": "Mozilla/5.0 SuperAdminTest",
      },
    });

    const user = await authorize(
      {
        email: "admin@bageshwarib2b.local",
        password: defaultPassword,
        loginScope: "staff",
      },
      dummyReq
    );

    expect(user).not.toBeNull();
    expect(user?.email).toBe("admin@bageshwarib2b.local");
    expect(user?.roles).toContain("SUPER_ADMIN");
    expect(user?.sellerSlug).toBe("bageshwari");
  });

  it("should successfully authorize Dealer login", async () => {
    const dummyReq = new Request("http://localhost:3000/api/auth/callback/credentials", {
      headers: {
        "x-forwarded-for": "10.0.0.3",
        "user-agent": "Mozilla/5.0 DealerTest",
      },
    });

    const user = await authorize(
      {
        email: "dealer1@bageshwari.local",
        password: defaultPassword,
        loginScope: "dealer",
      },
      dummyReq
    );

    expect(user).not.toBeNull();
    expect(user?.email).toBe("dealer1@bageshwari.local");
    expect(user?.roles).toContain("DEALER_OWNER");
    expect(user?.sellerSlug).toBe("bageshwari");
    expect(user?.dealerId).toBeTruthy();
  });

  it("should reject staff trying to log in as dealer", async () => {
    const dummyReq = new Request("http://localhost:3000/api/auth/callback/credentials", {
      headers: {
        "x-forwarded-for": "10.0.0.4",
        "user-agent": "Mozilla/5.0 CrossScopeTest",
      },
    });

    const user = await authorize(
      {
        email: "admin@bageshwari.com.np",
        password: defaultPassword,
        loginScope: "dealer",
      },
      dummyReq
    );

    expect(user).toBeNull();
  });

  it("should reject dealer trying to log in as staff", async () => {
    const dummyReq = new Request("http://localhost:3000/api/auth/callback/credentials", {
      headers: {
        "x-forwarded-for": "10.0.0.5",
        "user-agent": "Mozilla/5.0 CrossScopeTest",
      },
    });

    const user = await authorize(
      {
        email: "dealer1@bageshwari.local",
        password: defaultPassword,
        loginScope: "staff",
      },
      dummyReq
    );

    expect(user).toBeNull();
  });

  it("should reject invalid passwords", async () => {
    const dummyReq = new Request("http://localhost:3000/api/auth/callback/credentials", {
      headers: {
        "x-forwarded-for": "10.0.0.6",
        "user-agent": "Mozilla/5.0 WrongPasswordTest",
      },
    });

    const user = await authorize(
      {
        email: "admin@bageshwari.com.np",
        password: "IncorrectPassword123!",
        loginScope: "staff",
      },
      dummyReq
    );

    expect(user).toBeNull();
  });
});
