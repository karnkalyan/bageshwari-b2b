import { expect, test } from "@playwright/test";

test("single-seller storefront and catalogue are reachable", async ({ request }) => {
  const home = await request.get("/");
  expect(home.ok()).toBeTruthy();
  expect(await home.text()).toContain("Bageshwari Tractors");

  const catalogue = await request.get("/products");
  expect(catalogue.ok()).toBeTruthy();
});

test("anonymous catalogue API never returns dealer pricing", async ({ request }) => {
  const response = await request.get("/api/products?pageSize=2");
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).not.toContain("dealerPrice");
  expect(body).not.toContain("DEFAULT_DEALER");
});
