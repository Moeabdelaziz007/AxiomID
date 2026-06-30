/**
 * Tests for src/app/signin/callback/page.tsx
 *
 * Covers the Pi OAuth sign-in callback component:
 * - Loading spinner shown while processing
 * - Error state shown for invalid callback, failed API calls, etc.
 * - localStorage populated and redirect to /dashboard on success
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "jest-location-mock";

// ---------------------------------------------------------------------------
// Mock next/navigation (useRouter)
// ---------------------------------------------------------------------------
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ---------------------------------------------------------------------------
// Mock next/link
// ---------------------------------------------------------------------------
jest.mock("next/link", () => {
  const Link = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  Link.displayName = "Link";
  return Link;
});

// ---------------------------------------------------------------------------
// Mock pi-signin module
// ---------------------------------------------------------------------------
jest.mock("@/lib/pi-signin", () => ({
  parsePiSignInCallback: jest.fn(),
  fetchPiUser: jest.fn(),
}));

import { parsePiSignInCallback, fetchPiUser } from "@/lib/pi-signin";
const mockParseCallback = parsePiSignInCallback as jest.MockedFunction<
  typeof parsePiSignInCallback
>;
const mockFetchPiUser = fetchPiUser as jest.MockedFunction<typeof fetchPiUser>;

import PiSignInCallbackPage from "@/app/signin/callback/page";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let mockFetch: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();

  mockFetch = jest.fn();
  global.fetch = mockFetch;

  // Default: successful parse
  mockParseCallback.mockReturnValue({ accessToken: "test-access-token" });

  // Default: successful Pi user fetch
  mockFetchPiUser.mockResolvedValue({
    uid: "pi-uid-123",
    username: "testuser",
  });

  // Default: successful auth API call
  mockFetch.mockResolvedValue({
    ok: true,
    text: async () => "",
    json: async () => ({ userId: "db-user-id" }),
  });

  window.location.assign("https://axiomid.app/");
  window.location.hash = "";
  (window.location.assign as jest.Mock).mockClear();
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe("PiSignInCallbackPage — loading state", () => {
  it("renders the 'Completing sign-in…' text initially", () => {
    // Stall fetchPiUser so component stays in processing state
    mockFetchPiUser.mockReturnValue(new Promise(() => {}));
    render(<PiSignInCallbackPage />);
    expect(screen.getByText("Completing sign-in...")).toBeInTheDocument();
  });

  it("does not show the error heading while loading", () => {
    mockFetchPiUser.mockReturnValue(new Promise(() => {}));
    render(<PiSignInCallbackPage />);
    expect(screen.queryByText("Sign-in failed")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error: parsePiSignInCallback returns an error
// ---------------------------------------------------------------------------

describe("PiSignInCallbackPage — parsePiSignInCallback error", () => {
  beforeEach(() => {
    mockParseCallback.mockReturnValue({
      error: "Invalid sign-in state. Please try again.",
    });
  });

  it("shows the 'Sign-in failed' heading", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(screen.getByText("Sign-in failed")).toBeInTheDocument()
    );
  });

  it("shows the error message returned by parsePiSignInCallback", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(
        screen.getByText("Invalid sign-in state. Please try again.")
      ).toBeInTheDocument()
    );
  });

  it("shows a 'Try again' link pointing to /", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /try again/i });
      expect(link).toHaveAttribute("href", "/");
    });
  });

  it("does not call fetchPiUser when parse fails", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() => screen.getByText("Sign-in failed"));
    expect(mockFetchPiUser).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Error: no access token in callback result
// ---------------------------------------------------------------------------

describe("PiSignInCallbackPage — missing access token", () => {
  beforeEach(() => {
    mockParseCallback.mockReturnValue({});
  });

  it("shows error state when accessToken is absent", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(screen.getByText("Sign-in failed")).toBeInTheDocument()
    );
  });

  it("does not redirect when access token is missing", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() => screen.getByText("Sign-in failed"));
    expect(window.location.href).not.toBe("/dashboard");
  });
});

// ---------------------------------------------------------------------------
// Error: fetchPiUser throws
// ---------------------------------------------------------------------------

describe("PiSignInCallbackPage — fetchPiUser failure", () => {
  beforeEach(() => {
    mockFetchPiUser.mockRejectedValue(new Error("Pi API returned 503"));
  });

  it("shows the error heading", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(screen.getByText("Sign-in failed")).toBeInTheDocument()
    );
  });

  it("shows the underlying error message", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(screen.getByText("Pi API returned 503")).toBeInTheDocument()
    );
  });
});

// ---------------------------------------------------------------------------
// Error: /api/auth/pi returns non-ok status
// ---------------------------------------------------------------------------

describe("PiSignInCallbackPage — /api/auth/pi error", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });
  });

  it("shows error state when auth API rejects", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(screen.getByText("Sign-in failed")).toBeInTheDocument()
    );
  });

  it("displays the text from the failed auth response", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(screen.getByText("Unauthorized")).toBeInTheDocument()
    );
  });

  it("falls back to generic message when response body is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "",
    });
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(screen.getByText("Sign-in failed")).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText(/Auth API returned 500/)).toBeInTheDocument()
    );
  });
});

// ---------------------------------------------------------------------------
// Error: incomplete server response (missing userId)
// ---------------------------------------------------------------------------

describe("PiSignInCallbackPage — incomplete auth response", () => {
  beforeEach(() => {
    // Server response missing userId
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "",
      json: async () => ({}), // no userId
    });
  });

  it("shows error when authData.userId is absent", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(screen.getByText("Sign-in failed")).toBeInTheDocument()
    );
  });

  it("shows 'Incomplete sign-in response' error", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/incomplete sign-in response/i)
      ).toBeInTheDocument()
    );
  });
});

// ---------------------------------------------------------------------------
// Success: localStorage populated and redirect occurs
// ---------------------------------------------------------------------------

describe("PiSignInCallbackPage — successful sign-in", () => {
  it("stores pi_access_token in localStorage", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(localStorage.getItem("pi_access_token")).toBe("test-access-token")
    );
  });

  it("stores axiomid_wallet as pi:<uid>", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(localStorage.getItem("axiomid_wallet")).toBe("pi:pi-uid-123")
    );
  });

  it("stores axiomid_uid in localStorage", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(localStorage.getItem("axiomid_uid")).toBe("pi-uid-123")
    );
  });

  it("stores axiomid_username in localStorage", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(localStorage.getItem("axiomid_username")).toBe("testuser")
    );
  });

  it("stores axiomid_access_token in localStorage", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(localStorage.getItem("axiomid_access_token")).toBe(
        "test-access-token"
      )
    );
  });

  it("removes axiomid_logged_out from localStorage", async () => {
    localStorage.setItem("axiomid_logged_out", "true");
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(localStorage.getItem("axiomid_logged_out")).toBeNull()
    );
  });

  it("removes axiomid_info_modal from localStorage", async () => {
    localStorage.setItem("axiomid_info_modal", "seen");
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(localStorage.getItem("axiomid_info_modal")).toBeNull()
    );
  });

  it("redirects to /dashboard", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith("/dashboard")
    );
  });

  it("posts correct payload to /api/auth/pi", async () => {
    render(<PiSignInCallbackPage />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/auth/pi");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.accessToken).toBe("test-access-token");
    expect(body.uid).toBe("pi-uid-123");
    expect(body.username).toBe("testuser");
  });
});

// ---------------------------------------------------------------------------
// Error: non-Error thrown (catch branch)
// ---------------------------------------------------------------------------

describe("PiSignInCallbackPage — non-Error thrown", () => {
  it("shows generic 'Sign-in failed' for non-Error exceptions", async () => {
    mockFetchPiUser.mockRejectedValue("string error"); // non-Error thrown
    render(<PiSignInCallbackPage />);
    await waitFor(() => {
      expect(screen.getAllByText("Sign-in failed").length).toBeGreaterThan(0);
    });
    const errorEl = screen
      .getAllByText(/sign-in failed/i)
      .find((el) => el.tagName !== "H1");
    // The catch branch returns "Sign-in failed" for non-Error
    expect(screen.getAllByText(/sign-in failed/i).length).toBeGreaterThan(0);
  });
});