import { calculateTrustScore, TOTAL_STAMPS } from "@/lib/trust";
import { calculateTier, getLevelProgress, getNextLevelXP, TIERS } from "@/lib/tiers";

describe("calculateTrustScore", () => {
  it("returns 0 for 0 XP and 0 stamps", () => {
    expect(calculateTrustScore(0, 0)).toBe(0);
  });

  it("returns max score (100) for 1000+ XP and all stamps", () => {
    expect(calculateTrustScore(1000, TOTAL_STAMPS)).toBe(100);
    expect(calculateTrustScore(2000, TOTAL_STAMPS)).toBe(100);
  });

  it("weights XP at 70% and stamps at 30%", () => {
    // 500 XP -> xpScore = 50, 3 stamps -> stampScore = 50
    // 50*0.7 + 50*0.3 = 35 + 15 = 50
    expect(calculateTrustScore(500, 3)).toBe(50);
  });

  it("clamps stamps to [0, TOTAL_STAMPS]", () => {
    const scoreOver = calculateTrustScore(0, TOTAL_STAMPS + 10);
    const scoreAtMax = calculateTrustScore(0, TOTAL_STAMPS);
    // Over-stamped result should equal at-max result (clamped to TOTAL_STAMPS)
    expect(scoreOver).toBe(scoreAtMax);
    expect(scoreOver).toBeGreaterThanOrEqual(0);
    expect(scoreOver).toBeLessThanOrEqual(100);
  });

  it("clamps XP contribution to max 100", () => {
    // 1000 XP -> xpScore = 100, 0 stamps -> stampScore = 0
    // 100*0.7 + 0*0.3 = 70
    expect(calculateTrustScore(1000, 0)).toBe(70);
    // 5000 XP -> still capped at 100
    expect(calculateTrustScore(5000, 0)).toBe(70);
  });

  it("handles negative XP gracefully", () => {
    expect(calculateTrustScore(-100, 0)).toBe(0);
  });

  it("returns result clamped to [0, 100]", () => {
    expect(calculateTrustScore(0, 0)).toBeGreaterThanOrEqual(0);
    expect(calculateTrustScore(1000, TOTAL_STAMPS)).toBeLessThanOrEqual(100);
  });

  it("XP-only score (no stamps)", () => {
    // 100 XP -> xpScore = 10, 0 stamps -> 0
    // 10*0.7 + 0 = 7
    expect(calculateTrustScore(100, 0)).toBe(7);
  });

  it("stamp-only score (no XP)", () => {
    // 0 XP, 6 stamps -> stampScore = 100
    // 0*0.7 + 100*0.3 = 30
    expect(calculateTrustScore(0, TOTAL_STAMPS)).toBe(30);
  });
});

describe("calculateTier", () => {
  it("returns Visitor for 0 XP", () => {
    expect(calculateTier(0)).toBe("Visitor");
  });

  it("returns Citizen for 100 XP", () => {
    expect(calculateTier(100)).toBe("Citizen");
  });

  it("returns Validator for 500 XP", () => {
    expect(calculateTier(500)).toBe("Validator");
  });

  it("returns Sovereign for 1000 XP", () => {
    expect(calculateTier(1000)).toBe("Sovereign");
  });

  it("returns correct tier for boundary values", () => {
    expect(calculateTier(99)).toBe("Visitor");
    expect(calculateTier(499)).toBe("Citizen");
    expect(calculateTier(999)).toBe("Validator");
    expect(calculateTier(5000)).toBe("Sovereign");
  });
});

describe("getLevelProgress", () => {
  it("returns 0% at Visitor start", () => {
    expect(getLevelProgress(0, "Visitor")).toBe(0);
  });

  it("returns 100% at Citizen threshold", () => {
    expect(getLevelProgress(100, "Visitor")).toBe(100);
  });

  it("returns 50% at mid-Visitor range", () => {
    expect(getLevelProgress(50, "Visitor")).toBe(50);
  });

  it("returns 0% at Citizen start", () => {
    expect(getLevelProgress(100, "Citizen")).toBe(0);
  });

  it("returns 100% at Sovereign (max level)", () => {
    expect(getLevelProgress(1000, "Sovereign")).toBe(100);
  });

  it("returns correct progress for Validator tier", () => {
    // 750 XP in Validator: (750-500)/(1000-500) = 250/500 = 50%
    expect(getLevelProgress(750, "Validator")).toBe(50);
  });
});

describe("getNextLevelXP", () => {
  it("returns Citizen threshold for Visitor", () => {
    expect(getNextLevelXP("Visitor")).toBe(TIERS.Citizen);
  });

  it("returns Validator threshold for Citizen", () => {
    expect(getNextLevelXP("Citizen")).toBe(TIERS.Validator);
  });

  it("returns Sovereign threshold for Validator", () => {
    expect(getNextLevelXP("Validator")).toBe(TIERS.Sovereign);
  });

  it("returns null for Sovereign (max tier)", () => {
    expect(getNextLevelXP("Sovereign")).toBeNull();
  });
});
