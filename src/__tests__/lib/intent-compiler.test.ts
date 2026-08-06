import { compileIntent } from "@/lib/intent-compiler";

describe("compileIntent", () => {
  it("maps claim intent to identity capability", () => {
    const result = compileIntent("I want to claim my identity");
    expect(result).not.toBeNull();
    expect(result?.capability).toBe("identity");
    expect(result?.route).toBe("/claim");
  });

  it("maps deploy intent to agent capability", () => {
    const result = compileIntent("deploy an agent to automate my tasks");
    expect(result?.capability).toBe("agent");
    expect(result?.route).toBe("/dashboard");
  });

  it("maps pay intent to economy capability", () => {
    const result = compileIntent("I need to pay 1 Pi for activation");
    expect(result?.capability).toBe("economy");
  });

  it("maps Arabic claim intent", () => {
    const result = compileIntent("أريد أن أطالب بهويتي");
    expect(result?.capability).toBe("identity");
  });

  it("returns null for unmapped intents (honest fallback)", () => {
    expect(compileIntent("book flight to Cairo")).toBeNull();
    expect(compileIntent("")).toBeNull();
    expect(compileIntent("   ")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(compileIntent("EXPLORE THE NETWORK")?.capability).toBe("explore");
  });
});
