/**
 * Unit tests for src/lib/ghost.ts — the ghost.build server-side client.
 * Contract pins: shared POST /databases/spaces/{space} {name, wait:false},
 * dedicated POST /dedicated/spaces/{space} {name, size, wait:false}.
 * The connection string must never leave the server.
 */

import { ghostApiKeyConfigured, provisionGhostDatabase } from "@/lib/ghost";

const KEY = "ghost_test_key";
const env = process.env;

describe("ghost lib — shared vs dedicated provisioning", () => {
  beforeEach(() => {
    process.env = { ...env, GHOST_API_KEY: KEY };
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it("reports whether the API key is configured", () => {
    expect(ghostApiKeyConfigured()).toBe(true);
    delete process.env.GHOST_API_KEY;
    expect(ghostApiKeyConfigured()).toBe(false);
  });

  it("rejects when the API key is missing", async () => {
    delete process.env.GHOST_API_KEY;
    await expect(provisionGhostDatabase("creator")).rejects.toThrow(
      "GHOST_API_KEY is not configured",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("provisions a shared database for the creator plan", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "db_shared_1", name: "aura-creator-1" }),
    });
    const result = await provisionGhostDatabase("creator");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.ghost.build/v0/databases/spaces/personal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: expect.stringContaining('"wait":false'),
      },
    );
    expect(result).toEqual({ id: "db_shared_1", name: "aura-creator-1", status: "provisioning" });
  });

  it("provisions a dedicated 1x database for the power plan", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "db_ded_2", name: "aura-power-1", size: "1x" }),
    });
    const result = await provisionGhostDatabase("power");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/dedicated/spaces/personal"),
      expect.objectContaining({
        body: expect.stringContaining('"size":"1x"'),
      }),
    );
    expect(result.size).toBe("1x");
  });

  it("uses the configured GHOST_SPACE_ID for the space path", async () => {
    process.env.GHOST_SPACE_ID = "team-alpha";
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    await provisionGhostDatabase("creator");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/databases/spaces/team-alpha"),
      expect.anything(),
    );
  });

  it("throws a descriptive error when the ghost API fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    });
    await expect(provisionGhostDatabase("creator")).rejects.toThrow("Ghost API 500: boom");
  });

  it("falls back to the generated name when the API returns no name", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    const result = await provisionGhostDatabase("creator");
    expect(result.id).toBe("");
    expect(result.name).toMatch(/^aura-creator-\d+$/);
  });
});