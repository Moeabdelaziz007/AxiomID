/**
 * Tests for src/app/claim/error.tsx
 *
 * PR change: new route-level error boundary page for /claim, wrapping the
 * shared RouteErrorPage component with a fixed "Claim Error" title.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ClaimError from "@/app/claim/error";

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

function makeError(message: string, digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string };
  if (digest) err.digest = digest;
  return err;
}

describe("claim/error.tsx — ClaimError page", () => {
  it("renders the 'Claim Error' title", () => {
    render(<ClaimError error={makeError("boom")} reset={jest.fn()} />);
    expect(screen.getByText("Claim Error")).toBeInTheDocument();
  });

  it("renders a RETRY button that calls reset()", () => {
    const resetFn = jest.fn();
    render(<ClaimError error={makeError("boom")} reset={resetFn} />);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it("renders a BACK TO DASHBOARD link pointing to /dashboard", () => {
    render(<ClaimError error={makeError("boom")} reset={jest.fn()} />);
    const link = screen.getByRole("link", { name: /back to dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("logs the error to console.error with the 'Claim Error' title", () => {
    const error = makeError("claim failure");
    render(<ClaimError error={error} reset={jest.fn()} />);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Claim Error:", error);
  });

  it("handles an error carrying a digest without crashing", () => {
    expect(() => {
      render(<ClaimError error={makeError("digest error", "digest-456")} reset={jest.fn()} />);
    }).not.toThrow();
  });
});