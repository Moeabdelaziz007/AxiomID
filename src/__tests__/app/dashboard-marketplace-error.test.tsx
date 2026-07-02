/**
 * Tests for src/app/dashboard/marketplace/error.tsx
 *
 * PR change: new route-level error boundary page for /dashboard/marketplace,
 * wrapping the shared RouteErrorPage component with a fixed "Marketplace Error"
 * title.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MarketplaceError from "@/app/dashboard/marketplace/error";

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

function makeError(message: string, digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string };
  if (digest) err.digest = digest;
  return err;
}

describe("dashboard/marketplace/error.tsx — MarketplaceError page", () => {
  it("renders the 'Marketplace Error' title", () => {
    render(<MarketplaceError error={makeError("boom")} reset={jest.fn()} />);
    expect(screen.getByText("Marketplace Error")).toBeInTheDocument();
  });

  it("renders a RETRY button that calls reset()", () => {
    const resetFn = jest.fn();
    render(<MarketplaceError error={makeError("boom")} reset={resetFn} />);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it("renders a BACK TO DASHBOARD link pointing to /dashboard", () => {
    render(<MarketplaceError error={makeError("boom")} reset={jest.fn()} />);
    const link = screen.getByRole("link", { name: /back to dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("logs the error to console.error with the 'Marketplace Error' title", () => {
    const error = makeError("marketplace failure");
    render(<MarketplaceError error={error} reset={jest.fn()} />);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Marketplace Error:", error);
  });

  it("handles an error carrying a digest without crashing", () => {
    expect(() => {
      render(<MarketplaceError error={makeError("digest error", "digest-789")} reset={jest.fn()} />);
    }).not.toThrow();
  });
});