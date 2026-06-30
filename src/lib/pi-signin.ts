const OAUTH_AUTHORIZE_URL = "https://accounts.pinet.com/oauth/authorize";

export interface PiSignInOptions {
  redirectUri?: string;
  scopes?: string[];
  state?: string;
}

/**
 * Gets the configured Pi OAuth client ID.
 *
 * @returns The value of `process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID`, or `null` when it is unavailable.
 */
export function getPiOAuthClientId(): string | null {
  if (typeof process === "undefined") return null;
  return process.env.NEXT_PUBLIC_PI_OAUTH_CLIENT_ID || null;
}

/**
 * Builds the Pi OAuth authorization URL.
 *
 * @param options - Sign-in options used to set the redirect URI, scopes, and state.
 * @returns The complete Pi authorization URL.
 * @throws If the Pi OAuth client ID is not configured.
 */
export function buildPiSignInUrl(options: PiSignInOptions): string {
  const clientId = getPiOAuthClientId();
  if (!clientId) throw new Error("NEXT_PUBLIC_PI_OAUTH_CLIENT_ID not configured");

  const state = options.state || crypto.randomUUID();
  const url = new URL(OAUTH_AUTHORIZE_URL);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", options.redirectUri || `${window.location.origin}/signin/callback`);
  url.searchParams.set("scope", (options.scopes || ["username"]).join(" "));
  url.searchParams.set("state", state);

  return url.toString();
}

/**
 * Starts the Pi sign-in flow.
 *
 * @param options - Sign-in settings such as redirect URI, scopes, and state.
 */
export function initiatePiSignIn(options?: PiSignInOptions): void {
  try {
    if (typeof window !== "undefined" && window.Pi?.signIn && getPiOAuthClientId()) {
      window.Pi.signIn({
        clientId: getPiOAuthClientId()!,
        redirectUri: options?.redirectUri || `${window.location.origin}/signin/callback`,
        scopes: options?.scopes || ["username"],
        state: options?.state || crypto.randomUUID(),
      });
      return;
    }
  } catch {}
  window.location.assign(buildPiSignInUrl(options || {}));
}

export interface PiSignInCallbackResult {
  accessToken?: string;
  error?: string;
}

/**
 * Parses the Pi OAuth sign-in callback from the URL fragment.
 *
 * @returns The access token on success, or an error message if sign-in failed or the callback is invalid.
 */
export function parsePiSignInCallback(): PiSignInCallbackResult {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const expectedState = sessionStorage.getItem("pi_oauth_state");
  const returnedState = params.get("state");

  if (!returnedState || !expectedState || returnedState !== expectedState) {
    return { error: "State mismatch — possible CSRF" };
  }

  sessionStorage.removeItem("pi_oauth_state");

  const error = params.get("error");
  if (error) {
    const errorMessages: Record<string, string> = {
      access_denied: "You declined the sign-in request.",
      expired: "Sign-in request timed out. Please try again.",
      cancelled: "Sign-in was cancelled.",
      server_error: "Pi server error. Please try again later.",
    };
    return { error: errorMessages[error] || error };
  }

  const accessToken = params.get("access_token");
  if (!accessToken) {
    return { error: "No access token received from Pi." };
  }

  return { accessToken };
}

/**
 * Fetches the Pi profile for an access token.
 *
 * @param accessToken - The Pi OAuth access token.
 * @returns The user's Pi ID and username.
 */
export async function fetchPiUser(accessToken: string): Promise<{ uid: string; username: string }> {
  const res = await fetch("https://api.minepi.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Pi API returned ${res.status}`);
  const data = await res.json();
  return { uid: data.uid, username: data.username || "" };
}
