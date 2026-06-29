/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://axiomid.app/"}
 *
 * Tests for src/lib/pi-signin.ts
 *
 * Covers: getPiOAuthClientId, buildPiSignInUrl, initiatePiSignIn,
 *         parsePiSignInCallback, fetchPiUser
 */

import "jest-location-mock";

import {
  getPiOAuthClientId,
  buildPiSignInUrl,
  initiatePiSignIn,
  parsePiSignInCallback,
  fetchPiUser,
} from "@/lib/pi-signin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setHash(hash: string) {
  window.location.hash = hash;
}

function setSessionState(state: string | null) {
  if (state === null) {
    sessionStorage.removeItem("pi_oauth_state");
  } else {
    sessionStorage.setItem("pi_oauth_state", state);
  }
}

// ---------------------------------------------------------------------------
// getPiOAuthClientId
// ---------------------------------------------------------------------------

describe("getPiOAuthClientId", () => {
  const origEnv = process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID;

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID;
    } else {
      process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID = origEnv;
    }
  });

  it("returns the configured client ID string", () => {
    process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID = "my-client-id";
    expect(getPiOAuthClientId()).toBe("my-client-id");
  });

  it("returns null when env var is not set", () => {
    delete process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID;
    expect(getPiOAuthClientId()).toBeNull();
  });

  it("returns null when env var is an empty string", () => {
    process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID = "";
    expect(getPiOAuthClientId()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildPiSignInUrl
// ---------------------------------------------------------------------------

describe("buildPiSignInUrl", () => {
  const origEnv = process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID = "test-client-id";
    window.location.assign("https://axiomid.app/");
    window.location.hash = "";
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID;
    } else {
      process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID = origEnv;
    }
  });

  it("throws when NEXT_PUBLIC_PI_OAUTH_CLIENT_ID is not set", () => {
    delete process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID;
    expect(() => buildPiSignInUrl({})).toThrow(
      "NEXT_PUBLIC_PI_OAUTH_CLIENT_ID not configured"
    );
  });

  it("returns a URL pointing to the Pi OAuth authorize endpoint", () => {
    const url = buildPiSignInUrl({ state: "fixed-state" });
    expect(url).toContain("accounts.pinet.com/oauth/authorize");
  });

  it("sets response_type=token in the URL", () => {
    const url = new URL(buildPiSignInUrl({ state: "s1" }));
    expect(url.searchParams.get("response_type")).toBe("token");
  });

  it("includes the configured client_id in the URL", () => {
    const url = new URL(buildPiSignInUrl({ state: "s2" }));
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
  });

  it("uses the provided redirectUri", () => {
    const url = new URL(
      buildPiSignInUrl({ redirectUri: "https://myapp.com/cb", state: "s3" })
    );
    expect(url.searchParams.get("redirect_uri")).toBe("https://myapp.com/cb");
  });

  it("falls back to window.location.origin + /signin/callback for redirectUri", () => {
    const url = new URL(buildPiSignInUrl({ state: "s4" }));
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://axiomid.app/signin/callback"
    );
  });

  it("joins provided scopes with a space", () => {
    const url = new URL(
      buildPiSignInUrl({ scopes: ["username", "payments"], state: "s5" })
    );
    expect(url.searchParams.get("scope")).toBe("username payments");
  });

  it("defaults scope to 'username' when no scopes are given", () => {
    const url = new URL(buildPiSignInUrl({ state: "s6" }));
    expect(url.searchParams.get("scope")).toBe("username");
  });

  it("uses the provided state value", () => {
    const url = new URL(buildPiSignInUrl({ state: "my-custom-state" }));
    expect(url.searchParams.get("state")).toBe("my-custom-state");
  });

  it("generates a random state when none is provided", () => {
    const url1 = new URL(buildPiSignInUrl({}));
    const url2 = new URL(buildPiSignInUrl({}));
    const state1 = url1.searchParams.get("state");
    const state2 = url2.searchParams.get("state");
    expect(state1).toBeTruthy();
    expect(state2).toBeTruthy();
    expect(state1).not.toBe(state2);
  });
});

// ---------------------------------------------------------------------------
// initiatePiSignIn
// ---------------------------------------------------------------------------

describe("initiatePiSignIn", () => {
  const origEnv = process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID = "init-client-id";
    window.location.assign("https://axiomid.app/");
    window.location.hash = "";
    // Clear Pi from window
    (window as any).Pi = undefined;
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID;
    } else {
      process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID = origEnv;
    }
  });

  it("calls window.location.assign with a valid OAuth URL when window.Pi is not available", () => {
    initiatePiSignIn({ state: "test-state" });
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    const calledUrl = (window.location.assign as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("accounts.pinet.com/oauth/authorize");
    expect(calledUrl).toContain("client_id=init-client-id");
  });

  it("uses window.Pi.signIn when available and calls it with correct params", () => {
    const signInMock = jest.fn();
    (window as any).Pi = { signIn: signInMock };

    initiatePiSignIn({
      redirectUri: "https://axiomid.app/signin/callback",
      scopes: ["username"],
      state: "pi-state",
    });

    expect(signInMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "init-client-id",
        redirectUri: "https://axiomid.app/signin/callback",
        scopes: ["username"],
        state: "pi-state",
      })
    );
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("falls back to window.location.assign when window.Pi.signIn throws", () => {
    (window as any).Pi = {
      signIn: () => {
        throw new Error("signIn crash");
      },
    };

    initiatePiSignIn({ state: "fallback-state" });
    expect(window.location.assign).toHaveBeenCalledTimes(1);
  });

  it("falls back to window.location.assign when client ID is missing (Pi.signIn branch skipped)", () => {
    delete process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID;
    const signInMock = jest.fn();
    (window as any).Pi = { signIn: signInMock };

    // Without client ID, buildPiSignInUrl throws — initiatePiSignIn should propagate
    expect(() => initiatePiSignIn({ state: "no-id" })).toThrow();
    expect(signInMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// parsePiSignInCallback
// ---------------------------------------------------------------------------

describe("parsePiSignInCallback", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  function buildHash(params: Record<string, string>): string {
    return (
      "#" +
      Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&")
    );
  }

  it("returns error when no state is stored in sessionStorage", () => {
    setHash(buildHash({ access_token: "tok", state: "some-state" }));
    setSessionState(null);

    const result = parsePiSignInCallback();
    expect(result.error).toMatch(/state mismatch/i);
    expect(result.accessToken).toBeUndefined();
  });

  it("returns error when returned state does not match sessionStorage state", () => {
    setHash(buildHash({ access_token: "tok", state: "wrong-state" }));
    setSessionState("expected-state");

    const result = parsePiSignInCallback();
    expect(result.error).toMatch(/state mismatch/i);
  });

  it("removes pi_oauth_state from sessionStorage after successful validation", () => {
    setHash(buildHash({ access_token: "good-token", state: "match-state" }));
    setSessionState("match-state");

    parsePiSignInCallback();
    expect(sessionStorage.getItem("pi_oauth_state")).toBeNull();
  });

  it("returns the access token on success", () => {
    setHash(buildHash({ access_token: "my-access-token", state: "valid-state" }));
    setSessionState("valid-state");

    const result = parsePiSignInCallback();
    expect(result.accessToken).toBe("my-access-token");
    expect(result.error).toBeUndefined();
  });

  it("returns friendly error for access_denied error param", () => {
    setHash(buildHash({ error: "access_denied", state: "s" }));
    setSessionState("s");

    const result = parsePiSignInCallback();
    expect(result.error).toMatch(/declined/i);
  });

  it("returns friendly error for expired error param", () => {
    setHash(buildHash({ error: "expired", state: "s" }));
    setSessionState("s");

    const result = parsePiSignInCallback();
    expect(result.error).toMatch(/timed out/i);
  });

  it("returns friendly error for cancelled error param", () => {
    setHash(buildHash({ error: "cancelled", state: "s" }));
    setSessionState("s");

    const result = parsePiSignInCallback();
    expect(result.error).toMatch(/cancelled/i);
  });

  it("returns friendly error for server_error error param", () => {
    setHash(buildHash({ error: "server_error", state: "s" }));
    setSessionState("s");

    const result = parsePiSignInCallback();
    expect(result.error).toMatch(/Pi server error/i);
  });

  it("returns raw error string for unknown error codes", () => {
    setHash(buildHash({ error: "unknown_custom_error", state: "s" }));
    setSessionState("s");

    const result = parsePiSignInCallback();
    expect(result.error).toBe("unknown_custom_error");
  });

  it("returns error when access_token is absent after successful state validation", () => {
    setHash(buildHash({ state: "s" }));
    setSessionState("s");

    const result = parsePiSignInCallback();
    expect(result.error).toMatch(/no access token/i);
    expect(result.accessToken).toBeUndefined();
  });

  it("does not remove sessionStorage state when state validation fails", () => {
    setHash(buildHash({ access_token: "tok", state: "wrong" }));
    setSessionState("correct");

    parsePiSignInCallback();
    // State should remain because validation failed before removal
    expect(sessionStorage.getItem("pi_oauth_state")).toBe("correct");
  });
});

// ---------------------------------------------------------------------------
// fetchPiUser
// ---------------------------------------------------------------------------

describe("fetchPiUser", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it("returns uid and username on a successful response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uid: "pi-uid-abc", username: "alice" }),
    });

    const user = await fetchPiUser("valid-token");
    expect(user.uid).toBe("pi-uid-abc");
    expect(user.username).toBe("alice");
  });

  it("sends Authorization: Bearer header with the access token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uid: "u1", username: "bob" }),
    });

    await fetchPiUser("my-secret-token");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.minepi.com/v2/me",
      expect.objectContaining({
        headers: { Authorization: "Bearer my-secret-token" },
      })
    );
  });

  it("calls the correct Pi API endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uid: "u2", username: "carol" }),
    });

    await fetchPiUser("t");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.minepi.com/v2/me",
      expect.anything()
    );
  });

  it("throws when the Pi API returns a non-ok status", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    await expect(fetchPiUser("bad-token")).rejects.toThrow(
      "Pi API returned 401"
    );
  });

  it("returns empty string for username when API omits it", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uid: "u3" }),
    });

    const user = await fetchPiUser("t");
    expect(user.username).toBe("");
  });

  it("throws when fetch itself rejects (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    await expect(fetchPiUser("t")).rejects.toThrow("Network failure");
  });
});