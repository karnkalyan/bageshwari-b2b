import { describe, it, expect } from "vitest";
import { rankProductsBySearchRelevance } from "./search-utils";

describe("rankProductsBySearchRelevance", () => {
  it("prioritizes exact dimension & full phrase matches like 'T HANDLE 8 MM' at the top", () => {
    const products = [
      { name: "19MM T SLIDING HANDLE 3/4\" TAPARIA 2733", sku: "19MTSLI-03166" },
      { name: "HAMMER 2LB FIBRE HANDLE TATA", sku: "HAM2LBFIB-03348" },
      { name: "HAMMER PVC HANDLE 900 GRAM 2LB NEPTOOLS", sku: "HAMPVCHAN-03351" },
      { name: "T HANDLE 10 MM T SPANNER TSP010", sku: "THAN10-03492" },
      { name: "T HANDLE 11 MM T SPANNER TSP011", sku: "THAN11-03493" },
      { name: "T HANDLE 12 MM T SPANNER TSP012", sku: "THAN12-03494" },
      { name: "T HANDLE 13 MM T SPANNER TSP013", sku: "THAN13-03495" },
      { name: "T HANDLE 14 MM T SPANNER TSP014", sku: "THAN14-03496" },
      { name: "T HANDLE 15 MM T SPANNER TSP015", sku: "THAN15-03497" },
      { name: "T HANDLE 8 MM T SPANNER TSP008", sku: "THAN8-03498" },
      { name: "T HANDLE 9 MM T SPANNER TSP009", sku: "THAN9-03499" },
    ];

    const ranked = rankProductsBySearchRelevance(products, "T handle 8 mm");

    // The top product must be T HANDLE 8 MM
    expect(ranked[0].name).toBe("T HANDLE 8 MM T SPANNER TSP008");
    expect(ranked[0].sku).toBe("THAN8-03498");

    // Hammers must be scored lower than T spanners
    const hammerIdx = ranked.findIndex((p) => p.name.includes("HAMMER"));
    const spanner8Idx = ranked.findIndex((p) => p.sku === "THAN8-03498");
    expect(spanner8Idx).toBeLessThan(hammerIdx);
  });
});
