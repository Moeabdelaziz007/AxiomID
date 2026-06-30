// Mock nostics so Jest doesn't try to load the ESM module
jest.mock("nostics", () => ({
  defineDiagnostics: (config: unknown) => config
}));

interface DiagnosticCode {
  why: (...args: unknown[]) => string;
  fix: string;
}

interface Diagnostics {
  docsBase: (code: string) => string;
  codes: Record<string, DiagnosticCode>;
}

describe("Diagnostics Catalog", () => {
  let diagnostics: Diagnostics;

  beforeAll(() => {
    // Unmock to test the actual catalog implementation
    jest.unmock("@/diagnostics/catalog");
    diagnostics = require("@/diagnostics/catalog").diagnostics as Diagnostics;
  });

  it("generates correct docsBase URL", () => {
    expect(diagnostics.docsBase("AXIOMID_E001")).toBe(
      "https://axiomid.app/docs/diagnostics/axiomid_e001"
    );
    expect(diagnostics.docsBase("AXIOMID_w010")).toBe(
      "https://axiomid.app/docs/diagnostics/axiomid_w010"
    );
  });

  describe("Validation Errors", () => {
    it("formats AXIOMID_E001 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E001;
      expect(diag.why({ field: "email", message: "Invalid email format" })).toBe(
        'Validation failed for field "email": Invalid email format.'
      );
      expect(diag.fix).toBe(
        "Check the request body format and ensure all required fields are provided."
      );
    });

    it("formats AXIOMID_E002 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E002;
      expect(diag.why()).toBe("Request body is not valid JSON.");
      expect(diag.fix).toBe(
        "Ensure Content-Type is application/json and body is valid JSON."
      );
    });
  });

  describe("Auth Errors", () => {
    it("formats AXIOMID_E010 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E010;
      expect(diag.why({ reason: "token expired" })).toBe(
        "Authentication failed: token expired."
      );
      expect(diag.fix).toBe(
        "Verify the Bearer token is valid and not expired. Re-authenticate via Pi Network."
      );
    });

    it("formats AXIOMID_E011 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E011;
      expect(diag.why({ reason: "insufficient scopes" })).toBe(
        "Authorization denied: insufficient scopes."
      );
      expect(diag.fix).toBe(
        "Ensure your account has the required role or scope for this action."
      );
    });

    it("formats AXIOMID_E012 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E012;
      expect(diag.why({ resource: "user_123" })).toBe(
        'Resource "user_123" not found.'
      );
      expect(diag.fix).toBe(
        "Check the resource ID/slug exists and is accessible by your account."
      );
    });

    it("formats AXIOMID_E013 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E013;
      expect(diag.why()).toBe("Too many requests. Rate limit exceeded.");
      expect(diag.fix).toBe(
        "Wait for the duration in the Retry-After / X-RateLimit-Reset header before retrying. Reduce request frequency."
      );
    });
  });

  describe("Pi Network Errors", () => {
    it("formats AXIOMID_E020 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E020;
      expect(diag.why({ piError: "Invalid SDK initialization" })).toBe(
        "Pi Network authentication failed: Invalid SDK initialization."
      );
      expect(diag.fix).toBe(
        "Ensure PI_API_KEY is set and the Pi SDK is initialized correctly."
      );
    });

    it("formats AXIOMID_E021 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E021;
      expect(diag.why({ paymentId: "pay_123", piError: "user cancelled" })).toBe(
        "Pi payment pay_123 failed: user cancelled."
      );
      expect(diag.fix).toBe(
        "Verify the payment exists in Pi Network and the user has approved it."
      );
    });

    it("formats AXIOMID_E022 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E022;
      expect(diag.why({ paymentId: "pay_123", piError: "timeout" })).toBe(
        "Payment pay_123 verification failed: timeout."
      );
      expect(diag.fix).toBe(
        "Confirm the payment was completed on Pi Network and retry verification."
      );
    });

    it("formats AXIOMID_E023 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E023;
      expect(diag.why({ paymentId: "pay_123", piError: "amount incorrect" })).toBe(
        "Payment pay_123 mismatch: amount incorrect."
      );
      expect(diag.fix).toBe(
        "Ensure the payment amount and memo match the expected order details."
      );
    });

    it("formats AXIOMID_E024 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E024;
      expect(diag.why({ paymentId: "pay_123", piError: "already processed" })).toBe(
        "Payment pay_123 is invalid: already processed."
      );
      expect(diag.fix).toBe(
        "Check that the payment is in a valid, completed state before processing."
      );
    });
  });

  describe("Conflict Errors", () => {
    it("formats AXIOMID_E030 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E030;
      expect(diag.why({ resource: "user profile" })).toBe(
        "Conflict: user profile already exists or is in a conflicting state."
      );
      expect(diag.fix).toBe(
        "Use a different identifier or check the current state before modifying."
      );
    });
  });

  describe("Internal Errors", () => {
    it("formats AXIOMID_E040 correctly", () => {
      const diag = diagnostics.codes.AXIOMID_E040;
      expect(diag.why({ operation: "db_insert", error: "connection timeout" })).toBe(
        'Internal error during "db_insert": connection timeout.'
      );
      expect(diag.fix).toBe(
        "Check server logs for details. If persistent, file an issue at https://github.com/Moeabdelaziz007/AxiomID/issues"
      );
    });
  });
});
