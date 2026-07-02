/**
 * Tests for src/app/about/error.tsx
 *
 * PR change: new route-level error boundary page for /about, wrapping the
 * shared RouteErrorPage component with a fixed "About Error" title.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AboutError from "@/app/about/error";

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

function makeError(message: string, digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string };
  if (digest) err.digest = digest;
  return err;
}

describe("about/error.tsx — AboutError page", () => {
  it("renders the 'About Error' title", () => {
    render(<AboutError error={makeError("boom")} reset={jest.fn()} />);
    expect(screen.getByText("About Error")).toBeInTheDocument();
  });

  it("renders a RETRY button that calls reset()", () => {
    const resetFn = jest.fn();
    render(<AboutError error={makeError("boom")} reset={resetFn} />);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it("renders a BACK TO DASHBOARD link pointing to /dashboard", () => {
    render(<AboutError error={makeError("boom")} reset={jest.fn()} />);
    const link = screen.getByRole("link", { name: /back to dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("passes the fixed fallback message through to RouteErrorPage", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });

    render(<AboutError error={makeError("internal detail")} reset={jest.fn()} />);

    expect(screen.getByText("Something went wrong loading this page.")).toBeInTheDocument();
    expect(screen.queryByText("internal detail")).not.toBeInTheDocument();

    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, writable: true });
  });

  it("handles an error carrying a digest without crashing", () => {
    expect(() => {
      render(<AboutError error={makeError("digest error", "digest-123")} reset={jest.fn()} />);
    }).not.toThrow();
  });
});