/**
 * Tests for src/app/docs/error.tsx
 *
 * PR change: new route-level error boundary page for /docs, wrapping the
 * shared RouteErrorPage component with a fixed "Docs Error" title.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DocsError from "@/app/docs/error";

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

function makeError(message: string, digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string };
  if (digest) err.digest = digest;
  return err;
}

describe("docs/error.tsx — DocsError page", () => {
  it("renders the 'Docs Error' title", () => {
    render(<DocsError error={makeError("boom")} reset={jest.fn()} />);
    expect(screen.getByText("Docs Error")).toBeInTheDocument();
  });

  it("renders a RETRY button that calls reset()", () => {
    const resetFn = jest.fn();
    render(<DocsError error={makeError("boom")} reset={resetFn} />);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it("renders a BACK TO DASHBOARD link pointing to /dashboard", () => {
    render(<DocsError error={makeError("boom")} reset={jest.fn()} />);
    const link = screen.getByRole("link", { name: /back to dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("logs the error to console.error with the 'Docs Error' title", () => {
    const error = makeError("docs failure");
    render(<DocsError error={error} reset={jest.fn()} />);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Docs Error:", error);
  });

  it("handles an error carrying a digest without crashing", () => {
    expect(() => {
      render(<DocsError error={makeError("digest error", "digest-ghi")} reset={jest.fn()} />);
    }).not.toThrow();
  });
});