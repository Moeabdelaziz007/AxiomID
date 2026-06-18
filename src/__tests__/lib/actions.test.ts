import { ACTIONS } from "@/lib/actions";

describe("ACTIONS configuration", () => {
  it("should have positive xp for each action", () => {
    Object.values(ACTIONS).forEach(action => {
      expect(action.xp).toBeGreaterThan(0);
    });
  });

  it("should have unique action IDs", () => {
    const ids = Object.values(ACTIONS).map(action => action.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should match exact action configuration values", () => {
    expect(ACTIONS.CONNECT_TWITTER).toEqual({ id: 'connect_twitter', xp: 50 });
    expect(ACTIONS.CONNECT_DISCORD).toEqual({ id: 'connect_discord', xp: 50 });
    expect(ACTIONS.VERIFY_IDENTITY).toEqual({ id: 'verify_identity', xp: 100 });
    expect(ACTIONS.PROOF_OF_WORK_DAILY).toEqual({ id: 'daily_pow', xp: 20 });
    expect(ACTIONS.WALLET_ACTIVITY).toEqual({ id: 'wallet_age', xp: 300 });
    expect(ACTIONS.CONNECT_GOOGLE).toEqual({ id: 'connect_google', xp: 50 });
    expect(ACTIONS.CONNECT_CRYPTO_WALLET).toEqual({ id: 'connect_crypto_wallet', xp: 100 });
  });
});
