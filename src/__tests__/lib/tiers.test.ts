import {
  calculateTier,
  getLevelProgress,
  getNextLevelXP,
  getScoreColor,
  getTierColor,
  TIER_COLORS,
  TIERS
} from "../../lib/tiers";

describe("Tiers Library", () => {
  describe("calculateTier", () => {
    it("should return Visitor for xp < 100", () => {
      expect(calculateTier(0)).toBe("Visitor");
      expect(calculateTier(50)).toBe("Visitor");
      expect(calculateTier(99)).toBe("Visitor");
      expect(calculateTier(-10)).toBe("Visitor"); // Edge case: negative xp
    });

    it("should return Citizen for 100 <= xp < 500", () => {
      expect(calculateTier(100)).toBe("Citizen");
      expect(calculateTier(250)).toBe("Citizen");
      expect(calculateTier(499)).toBe("Citizen");
    });

    it("should return Validator for 500 <= xp < 1000", () => {
      expect(calculateTier(500)).toBe("Validator");
      expect(calculateTier(750)).toBe("Validator");
      expect(calculateTier(999)).toBe("Validator");
    });

    it("should return Sovereign for xp >= 1000", () => {
      expect(calculateTier(1000)).toBe("Sovereign");
      expect(calculateTier(1500)).toBe("Sovereign");
      expect(calculateTier(10000)).toBe("Sovereign");
    });
  });

  describe("getTierColor", () => {
    it("should return the correct color for each tier", () => {
      expect(getTierColor("Visitor")).toBe(TIER_COLORS.Visitor);
      expect(getTierColor("Citizen")).toBe(TIER_COLORS.Citizen);
      expect(getTierColor("Validator")).toBe(TIER_COLORS.Validator);
      expect(getTierColor("Sovereign")).toBe(TIER_COLORS.Sovereign);
    });

    it("should return Visitor color as a fallback for invalid tier", () => {
      // @ts-expect-error - testing runtime fallback for invalid inputs
      expect(getTierColor("InvalidTier")).toBe(TIER_COLORS.Visitor);
    });
  });

  describe("getScoreColor", () => {
    it("should return red (#ef4444) for score < 40", () => {
      expect(getScoreColor(0)).toBe("#ef4444");
      expect(getScoreColor(39)).toBe("#ef4444");
      expect(getScoreColor(-10)).toBe("#ef4444");
    });

    it("should return orange (#f59e0b) for 40 <= score < 60", () => {
      expect(getScoreColor(40)).toBe("#f59e0b");
      expect(getScoreColor(50)).toBe("#f59e0b");
      expect(getScoreColor(59)).toBe("#f59e0b");
    });

    it("should return blue (#00d4ff) for 60 <= score < 80", () => {
      expect(getScoreColor(60)).toBe("#00d4ff");
      expect(getScoreColor(70)).toBe("#00d4ff");
      expect(getScoreColor(79)).toBe("#00d4ff");
    });

    it("should return green (#00ff41) for score >= 80", () => {
      expect(getScoreColor(80)).toBe("#00ff41");
      expect(getScoreColor(90)).toBe("#00ff41");
      expect(getScoreColor(100)).toBe("#00ff41");
      expect(getScoreColor(150)).toBe("#00ff41");
    });
  });

  describe("getLevelProgress", () => {
    it("should calculate correct progress for Visitor", () => {
      expect(getLevelProgress(0, "Visitor")).toBe(0);
      expect(getLevelProgress(50, "Visitor")).toBe(50);
      expect(getLevelProgress(100, "Visitor")).toBe(100);
      expect(getLevelProgress(-10, "Visitor")).toBe(0); // bounded to 0
      expect(getLevelProgress(150, "Visitor")).toBe(100); // bounded to 100
    });

    it("should calculate correct progress for Citizen", () => {
      expect(getLevelProgress(100, "Citizen")).toBe(0); // Range is 100-500 (400 difference)
      expect(getLevelProgress(300, "Citizen")).toBe(50);
      expect(getLevelProgress(500, "Citizen")).toBe(100);
      expect(getLevelProgress(50, "Citizen")).toBe(0); // below current threshold
      expect(getLevelProgress(600, "Citizen")).toBe(100); // above next threshold
    });

    it("should calculate correct progress for Validator", () => {
      expect(getLevelProgress(500, "Validator")).toBe(0); // Range is 500-1000 (500 difference)
      expect(getLevelProgress(750, "Validator")).toBe(50);
      expect(getLevelProgress(1000, "Validator")).toBe(100);
      expect(getLevelProgress(400, "Validator")).toBe(0); // below threshold
      expect(getLevelProgress(1200, "Validator")).toBe(100); // above next threshold
    });

    it("should return 100 for Sovereign as it is the max level", () => {
      expect(getLevelProgress(1000, "Sovereign")).toBe(100);
      expect(getLevelProgress(2000, "Sovereign")).toBe(100);
      expect(getLevelProgress(500, "Sovereign")).toBe(100); // even if xp is lower than Sovereign threshold
    });
  });

  describe("getNextLevelXP", () => {
    it("should return correct next level XP for each tier", () => {
      expect(getNextLevelXP("Visitor")).toBe(TIERS.Citizen);
      expect(getNextLevelXP("Citizen")).toBe(TIERS.Validator);
      expect(getNextLevelXP("Validator")).toBe(TIERS.Sovereign);
    });

    it("should return null for Sovereign as it is the max level", () => {
      expect(getNextLevelXP("Sovereign")).toBeNull();
    });

    it("should return null for unknown tier", () => {
      // @ts-expect-error - testing runtime fallback
      expect(getNextLevelXP("Unknown")).toBeNull();
    });
  });
});
