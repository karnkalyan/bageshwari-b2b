import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("request guard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("blocks requests after the configured fixed-window limit", async () => {
    const { checkRateLimit } = await import("./request-guard");
    const key = `test-${crypto.randomUUID()}`;

    expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    const blocked = checkRateLimit(key, { limit: 2, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("releases concurrency capacity when an operation throws", async () => {
    const { withRequestConcurrencyLimit } = await import("./request-guard");
    await expect(withRequestConcurrencyLimit(async () => {
      throw new Error("expected");
    }, 1)).rejects.toThrow("expected");

    await expect(withRequestConcurrencyLimit(async () => "ok", 1)).resolves.toBe("ok");
  });
});
