import { describe, it, expect } from "vitest";
import {
  calculateCreditsNeeded,
  getMaxCompetitorsByPurchased,
  getUserTier,
  formatVND,
  formatCredits,
  getPackageById,
  PRICING_PACKAGES,
} from "./pricing";

describe("calculateCreditsNeeded", () => {
  it("returns 1 credit per keyword", () => {
    expect(calculateCreditsNeeded(1)).toBe(1);
    expect(calculateCreditsNeeded(10)).toBe(10);
    expect(calculateCreditsNeeded(100)).toBe(100);
    expect(calculateCreditsNeeded(0)).toBe(0);
  });
});

describe("getMaxCompetitorsByPurchased", () => {
  it("returns 5 for basic tier", () => {
    expect(getMaxCompetitorsByPurchased(0)).toBe(5);
    expect(getMaxCompetitorsByPurchased(199999)).toBe(5);
  });

  it("returns 10 for pro tier", () => {
    expect(getMaxCompetitorsByPurchased(500000)).toBe(10);
    expect(getMaxCompetitorsByPurchased(1999999)).toBe(10);
  });

  it("returns 15 for enterprise tier", () => {
    expect(getMaxCompetitorsByPurchased(2000000)).toBe(15);
    expect(getMaxCompetitorsByPurchased(5000000)).toBe(15);
  });
});

describe("getUserTier", () => {
  it("returns correct tier names", () => {
    expect(getUserTier(0)).toBe("basic");
    expect(getUserTier(500000)).toBe("pro");
    expect(getUserTier(2000000)).toBe("enterprise");
  });
});

describe("formatVND", () => {
  it("formats currency correctly", () => {
    const result = formatVND(200000);
    expect(result).toContain("200.000");
  });
});

describe("formatCredits", () => {
  it("formats number with locale separators", () => {
    const result = formatCredits(10000);
    expect(result).toContain("10");
  });
});

describe("getPackageById", () => {
  it("returns correct package", () => {
    expect(getPackageById("basic")?.credits).toBe(10000);
    expect(getPackageById("pro")?.credits).toBe(28000);
    expect(getPackageById("enterprise")?.credits).toBe(135000);
  });

  it("returns undefined for unknown id", () => {
    expect(getPackageById("unknown")).toBeUndefined();
  });
});

describe("PRICING_PACKAGES", () => {
  it("has 3 packages", () => {
    expect(PRICING_PACKAGES).toHaveLength(3);
  });

  it("pro package is marked as popular", () => {
    const pro = PRICING_PACKAGES.find((p) => p.id === "pro");
    expect(pro?.popular).toBe(true);
  });
});
