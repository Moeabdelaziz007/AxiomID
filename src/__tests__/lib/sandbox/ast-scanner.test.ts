import { scanScript, validatePayloadSize } from "@/lib/sandbox/ast-scanner";

describe("AST Scanner & Payload Validation", () => {
  it("allows harmless code", () => {
    const code = "const x = 1 + 2; console.log(x);";
    expect(scanScript(code)).toEqual({ allowed: true });
  });

  it("blocks malicious require/imports", () => {
    const badCode1 = "const fs = require('fs');";
    const badCode2 = "import { exec } from 'child_process';";
    expect(scanScript(badCode1).allowed).toBe(false);
    expect(scanScript(badCode2).allowed).toBe(false);
  });

  it("blocks eval and Function constructors", () => {
    const badCode1 = "eval('alert(1)');";
    const badCode2 = "const f = new Function('return process');";
    expect(scanScript(badCode1).allowed).toBe(false);
    expect(scanScript(badCode2).allowed).toBe(false);
  });

  it("blocks network objects and processes", () => {
    const badCode1 = "fetch('https://malicious.com');";
    const badCode2 = "console.log(process.env.SECRET);";
    expect(scanScript(badCode1).allowed).toBe(false);
    expect(scanScript(badCode2).allowed).toBe(false);
  });

  it("restricts payload size under 8KB limit", () => {
    const smallPayload = "a".repeat(4000);
    const largePayload = "a".repeat(8193);
    expect(validatePayloadSize(smallPayload)).toBe(true);
    expect(validatePayloadSize(largePayload)).toBe(false);
  });
});
