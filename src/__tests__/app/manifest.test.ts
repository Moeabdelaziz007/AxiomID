/**
 * @jest-environment node
 *
 * Tests for src/app/manifest.ts
 *
 * PR change: manifest.ts is a new Next.js MetadataRoute.Manifest file that
 * replaces the deleted static public/manifest.json. It generates the PWA
 * manifest dynamically, ensuring TypeScript type safety for icon purposes.
 *
 * Key constraint: icon `purpose` must be the literal 'any' | 'maskable' |
 * 'monochrome' — NOT the space-separated "any maskable" string used in the
 * old static JSON (which caused TypeScript compile errors).
 */

import manifest from "@/app/manifest";

describe("manifest()", () => {
  let result: ReturnType<typeof manifest>;

  beforeAll(() => {
    result = manifest();
  });

  it("returns an object (not null or undefined)", () => {
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();
  });

  it("has the correct app name", () => {
    expect(result.name).toBe("AxiomID - Agent Identity Protocol");
  });

  it("has the correct short_name", () => {
    expect(result.short_name).toBe("AxiomID");
  });

  it("has a non-empty description", () => {
    expect(typeof result.description).toBe("string");
    expect(result.description!.length).toBeGreaterThan(0);
  });

  it("has start_url of '/'", () => {
    expect(result.start_url).toBe("/");
  });

  it("has display mode of 'standalone'", () => {
    expect(result.display).toBe("standalone");
  });

  it("has background_color set", () => {
    expect(result.background_color).toBe("#09090b");
  });

  it("has theme_color set", () => {
    expect(result.theme_color).toBe("#10131a");
  });

  it("has an icons array", () => {
    expect(Array.isArray(result.icons)).toBe(true);
    expect(result.icons!.length).toBeGreaterThan(0);
  });

  it("has 8 icons (192/512 × SVG/PNG × any/maskable)", () => {
    expect(result.icons!.length).toBe(8);
  });

  it("each icon has required fields: src, sizes, type, purpose", () => {
    for (const icon of result.icons!) {
      expect(typeof icon.src).toBe("string");
      expect(icon.src.length).toBeGreaterThan(0);
      expect(typeof icon.sizes).toBe("string");
      expect(typeof icon.type).toBe("string");
      expect(typeof icon.purpose).toBe("string");
    }
  });

  it("all icon purposes are single-word literals ('any' or 'maskable'), not space-separated", () => {
    // PR change: old manifest.json used "any maskable" (space-separated) which
    // caused TypeScript compile errors with MetadataRoute.Manifest type.
    // New file splits them into separate icon entries with single-word purposes.
    for (const icon of result.icons!) {
      expect(["any", "maskable", "monochrome"]).toContain(icon.purpose);
      // Must NOT contain the old space-separated format
      expect(icon.purpose).not.toContain(" ");
    }
  });

  it("has both 'any' and 'maskable' purpose variants", () => {
    const purposes = result.icons!.map((icon) => icon.purpose);
    expect(purposes).toContain("any");
    expect(purposes).toContain("maskable");
  });

  it("includes 192x192 SVG icon", () => {
    const icon = result.icons!.find(
      (i) => i.sizes === "192x192" && i.type === "image/svg+xml"
    );
    expect(icon).toBeDefined();
    expect(icon!.src).toContain("192x192");
  });

  it("includes 512x512 SVG icon", () => {
    const icon = result.icons!.find(
      (i) => i.sizes === "512x512" && i.type === "image/svg+xml"
    );
    expect(icon).toBeDefined();
    expect(icon!.src).toContain("512x512");
  });

  it("includes 192x192 PNG icon", () => {
    const icon = result.icons!.find(
      (i) => i.sizes === "192x192" && i.type === "image/png"
    );
    expect(icon).toBeDefined();
    expect(icon!.src).toContain("192x192");
  });

  it("includes 512x512 PNG icon", () => {
    const icon = result.icons!.find(
      (i) => i.sizes === "512x512" && i.type === "image/png"
    );
    expect(icon).toBeDefined();
    expect(icon!.src).toContain("512x512");
  });

  it("has categories array that includes 'identity'", () => {
    expect(Array.isArray(result.categories)).toBe(true);
    expect(result.categories).toContain("identity");
  });

  it("has lang set to 'en-US'", () => {
    expect(result.lang).toBe("en-US");
  });

  it("has dir set to 'ltr'", () => {
    expect(result.dir).toBe("ltr");
  });

  it("is deterministic — calling manifest() twice returns identical data", () => {
    const first = manifest();
    const second = manifest();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});