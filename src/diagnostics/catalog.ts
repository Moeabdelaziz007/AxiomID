import { defineDiagnostics } from "nostics";

/**
 * AxiomID diagnostic catalog.
 * Stable codes that can be searched, linked to docs, and auto-fixed by agents.
 *
 * Format: AXIOMID_{category}{number}
 *   - E = Error (API errors, validation, auth)
 *   - W = Warning (deprecated patterns, config issues)
 *   - I = Information (performance hints)
 */
export const diagnostics = defineDiagnostics({
  docsBase: (code) =>
    `https://axiomid.app/docs/diagnostics/${code.toLowerCase()}`,
  codes: {
    // ── Validation Errors ──────────────────────────────────────
    AXIOMID_E001: {
      why: (p: { field: string; message: string }) =>
        `Validation failed for field "${p.field}": ${p.message}.`,
      fix: () =>
        `Check the request body format and ensure all required fields are provided.`,
    },
    AXIOMID_E002: {
      why: () => `Request body is not valid JSON.`,
      fix: () => `Ensure Content-Type is application/json and body is valid JSON.`,
    },

    // ── Auth Errors ────────────────────────────────────────────
    AXIOMID_E010: {
      why: (p: { reason: string }) =>
        `Authentication failed: ${p.reason}.`,
      fix: () => `Verify the Bearer token is valid and not expired. Re-authenticate via Pi Network.`,
    },
    AXIOMID_E011: {
      why: (p: { reason: string }) =>
        `Authorization denied: ${p.reason}.`,
      fix: () => `Ensure your account has the required role or scope for this action.`,
    },
    AXIOMID_E012: {
      why: (p: { resource: string }) =>
        `Resource "${p.resource}" not found.`,
      fix: () => `Check the resource ID/slug exists and is accessible by your account.`,
    },
    AXIOMID_E013: {
      why: () => `Too many requests. Rate limit exceeded.`,
      fix: () =>
        `Wait for the duration in the Retry-After / X-RateLimit-Reset header before retrying. Reduce request frequency.`,
    },

    // ── Pi Network Errors ──────────────────────────────────────
    AXIOMID_E020: {
      why: (p: { piError: string }) =>
        `Pi Network authentication failed: ${p.piError}.`,
      fix: () => `Ensure PI_API_KEY is set and the Pi SDK is initialized correctly.`,
    },
    AXIOMID_E021: {
      why: (p: { paymentId: string; piError: string }) =>
        `Pi payment ${p.paymentId} failed: ${p.piError}.`,
      fix: () => `Verify the payment exists in Pi Network and the user has approved it.`,
    },
    AXIOMID_E022: {
      why: (p: { paymentId: string; piError: string }) =>
        `Payment ${p.paymentId} verification failed: ${p.piError}.`,
      fix: () => `Confirm the payment was completed on Pi Network and retry verification.`,
    },
    AXIOMID_E023: {
      why: (p: { paymentId: string; piError: string }) =>
        `Payment ${p.paymentId} mismatch: ${p.piError}.`,
      fix: () => `Ensure the payment amount and memo match the expected order details.`,
    },
    AXIOMID_E024: {
      why: (p: { paymentId: string; piError: string }) =>
        `Payment ${p.paymentId} is invalid: ${p.piError}.`,
      fix: () => `Check that the payment is in a valid, completed state before processing.`,
    },

    // ── Conflict Errors ────────────────────────────────────────
    AXIOMID_E030: {
      why: (p: { resource: string }) =>
        `Conflict: ${p.resource} already exists or is in a conflicting state.`,
      fix: () => `Use a different identifier or check the current state before modifying.`,
    },

    // ── Internal Errors ────────────────────────────────────────
    AXIOMID_E040: {
      why: (p: { operation: string; error: string }) =>
        `Internal error during "${p.operation}": ${p.error}.`,
      fix: () => `Check server logs for details. If persistent, file an issue at https://github.com/Moeabdelaziz007/AxiomID/issues`,
    },
  },
});
