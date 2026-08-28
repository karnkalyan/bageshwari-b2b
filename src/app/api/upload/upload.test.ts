import { describe, it, expect, vi } from "vitest";

describe("Upload RBAC and Validation Test", () => {
  it("validates allowed image mime types", () => {
    const ALLOWED_MIME_TYPES = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
      "image/svg+xml",
    ]);

    expect(ALLOWED_MIME_TYPES.has("image/jpeg")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("image/png")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("image/webp")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("application/pdf")).toBe(false);
    expect(ALLOWED_MIME_TYPES.has("text/html")).toBe(false);
    expect(ALLOWED_MIME_TYPES.has("application/javascript")).toBe(false);
  });

  it("checks staff / admin RBAC roles", () => {
    const privilegedRoles = ["SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF", "ACCOUNTANT", "WAREHOUSE_MANAGER"];
    const checkAuth = (roles: string[]) => roles.some((r) => privilegedRoles.includes(r));

    expect(checkAuth(["ADMIN"])).toBe(true);
    expect(checkAuth(["ACCOUNTANT"])).toBe(true);
    expect(checkAuth(["DEALER"])).toBe(false);
    expect(checkAuth([])).toBe(false);
  });
});
