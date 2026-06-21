jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/telegram", () => ({
  sendMilestoneNotification: jest.fn().mockResolvedValue(true),
}));

import { checkSessionMilestone, notifyMilestone } from "@/lib/soul/session-analytics";
import { sendMilestoneNotification } from "@/lib/telegram";

describe("session-analytics", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("checkSessionMilestone", () => {
    it("returns null when no milestone crossed", () => {
      expect(checkSessionMilestone(100, 50)).toBeNull();
    });

    it("detects 700 milestone crossing", () => {
      const result = checkSessionMilestone(700, 650);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("700");
      expect(result!.successCount).toBe(700);
    });

    it("does not re-detect 700 if already past it", () => {
      expect(checkSessionMilestone(750, 710)).toBeNull();
    });

    it("detects 7000 milestone crossing", () => {
      const result = checkSessionMilestone(7000, 6500);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("7000");
      expect(result!.successCount).toBe(7000);
    });

    it("does not re-detect 7000 if already past it", () => {
      expect(checkSessionMilestone(7500, 7100)).toBeNull();
    });

    it("prefers 7000 over 700 when both cross simultaneously", () => {
      const result = checkSessionMilestone(7000, 0);
      expect(result!.type).toBe("7000");
    });
  });

  describe("notifyMilestone", () => {
    it("sends notification when chatId provided", async () => {
      await notifyMilestone("12345", {
        type: "700",
        successCount: 700,
        timestamp: Date.now(),
        message: "Test milestone",
      });

      expect(sendMilestoneNotification).toHaveBeenCalledWith("12345", {
        type: "barakah",
        count: 700,
        message: "Test milestone",
      });
    });

    it("skips notification when no chatId", async () => {
      await notifyMilestone(undefined, {
        type: "700",
        successCount: 700,
        timestamp: Date.now(),
        message: "Test",
      });

      expect(sendMilestoneNotification).not.toHaveBeenCalled();
    });

    it("does not throw on notification failure", async () => {
      (sendMilestoneNotification as jest.Mock).mockRejectedValue(new Error("API down"));

      await expect(
        notifyMilestone("12345", {
          type: "700",
          successCount: 700,
          timestamp: Date.now(),
          message: "Test",
        })
      ).resolves.toBeUndefined();
    });
  });
});
