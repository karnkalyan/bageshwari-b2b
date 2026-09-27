import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "./proxy";

describe("proxy", () => {
  it("rejects malformed Server Action IDs before Next.js tries to decode them", () => {
    const request = new NextRequest("http://localhost/admin/orders/new", {
      method: "POST",
      headers: { "next-action": "x" },
    });

    const response = proxy(request);

    expect(response.status).toBe(400);
  });

  it("allows framework-generated Server Action IDs", () => {
    const request = new NextRequest("http://localhost/admin/orders/new", {
      method: "POST",
      headers: { "next-action": "4041b318a966a18f61bd27b7b8a1ce62cbe3039caf" },
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("runs on staff pages where Server Actions are submitted", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: "/admin/orders/new",
      })
    ).toBe(true);
  });
});
