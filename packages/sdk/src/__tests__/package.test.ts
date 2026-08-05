/**
 * Sanity checks for packages/sdk/package.json.
 *
 * The package was flipped from a private, source-only workspace package to a
 * publishable npm package (main/types pointing at dist/, an "exports" map,
 * "files" shipping src/ alongside dist/, and npm registry metadata). These
 * tests guard against accidental regressions to that packaging contract.
 */

import * as fs from "fs";
import * as path from "path";

interface PackageJson {
  name: string;
  version: string;
  private: boolean;
  main: string;
  types: string;
  sideEffects: boolean;
  exports: Record<string, { types: string; default: string }>;
  files: string[];
  scripts: Record<string, string>;
  keywords: string[];
  homepage: string;
  repository: { type: string; url: string; directory: string };
  author: string;
  license: string;
  engines: Record<string, string>;
  devDependencies: Record<string, string>;
}

const pkg: PackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf-8")
);

describe("@axiomid/sdk package.json", () => {
  it("is publishable (not private)", () => {
    expect(pkg.private).toBe(false);
  });

  it("points main/types at the compiled dist output, not source", () => {
    expect(pkg.main).toBe("dist/index.js");
    expect(pkg.types).toBe("dist/index.d.ts");
  });

  it("declares a modern conditional exports map consistent with main/types", () => {
    expect(pkg.exports["."]).toEqual({
      types: "./dist/index.d.ts",
      default: "./dist/index.js",
    });
  });

  it("marks the package as side-effect free for bundlers", () => {
    expect(pkg.sideEffects).toBe(false);
  });

  it("ships dist, src, README.md, and LICENSE to npm", () => {
    expect(pkg.files).toEqual(
      expect.arrayContaining(["dist", "src", "README.md", "LICENSE"])
    );
  });

  it("retains build/test/type-check scripts", () => {
    expect(pkg.scripts.build).toBe("tsc");
    expect(pkg.scripts.test).toBe("jest --runInBand --forceExit");
    expect(pkg.scripts["type-check"]).toBe("tsc --noEmit");
  });

  it("has npm registry metadata (homepage, repository, author)", () => {
    expect(pkg.homepage).toBe("https://axiomid.app");
    expect(pkg.repository).toEqual({
      type: "git",
      url: "https://github.com/Moeabdelaziz007/AxiomID.git",
      directory: "packages/sdk",
    });
    expect(pkg.author).toContain("Mohamed Abdelaziz");
  });

  it("has a non-empty, deduplicated keywords list", () => {
    expect(pkg.keywords.length).toBeGreaterThan(0);
    expect(new Set(pkg.keywords).size).toBe(pkg.keywords.length);
    expect(pkg.keywords).toContain("axiomid");
    expect(pkg.keywords).toContain("sdk");
  });

  it("requires Node >= 20 and declares MIT license", () => {
    expect(pkg.engines.node).toBe(">=20.0.0");
    expect(pkg.license).toBe("MIT");
  });

  it("declares the jest/ts-jest/typescript toolchain used by the test script", () => {
    expect(pkg.devDependencies).toMatchObject({
      jest: expect.any(String),
      "ts-jest": expect.any(String),
      typescript: expect.any(String),
      "@types/jest": expect.any(String),
      "@types/node": expect.any(String),
    });
  });

  it("has the expected scoped package name and a semver-formatted version", () => {
    expect(pkg.name).toBe("@axiomid/sdk");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("regression: no longer points main/types at the legacy source entrypoint", () => {
    // Prior to this PR, main/types pointed directly at "src/index.ts". Guard
    // against accidentally reverting the publishable dist/ configuration.
    expect(pkg.main).not.toBe("src/index.ts");
    expect(pkg.types).not.toBe("src/index.ts");
    expect(pkg.main).not.toMatch(/\.ts$/);
    expect(pkg.types).not.toMatch(/\.ts$/);
  });

  it("regression: private is strictly the boolean false, not a truthy/string value", () => {
    expect(pkg.private).not.toBe(true);
    expect(typeof pkg.private).toBe("boolean");
  });
});