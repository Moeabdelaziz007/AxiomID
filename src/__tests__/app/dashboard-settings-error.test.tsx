/**
 * Tests for src/app/dashboard/settings/error.tsx
 *
 * PR change: new route-level error boundary page for /dashboard/settings,
 * wrapping the shared RouteErrorPage component with a fixed "Settings Error"
 * title.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsError from "@/app/dashboard/settings/error";

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

function makeError(message: string, digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string };
  if (digest) err.digest = digest;
  return err;
}

describe("dashboard/settings/error.tsx — SettingsError page", () => {
  it("renders the 'Settings Error' title", () => {
    render(<SettingsError error={makeError("boom")} reset={jest.fn()} />);
    expect(screen.getByText("Settings Error")).toBeInTheDocument();
  });

  it("renders a RETRY button that calls reset()", () => {
    const resetFn = jest.fn();
    render(<SettingsError error={makeError("boom")} reset={resetFn} />);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it("renders a BACK TO DASHBOARD link pointing to /dashboard", () => {
    render(<SettingsError error={makeError("boom")} reset={jest.fn()} />);
    const link = screen.getByRole("link", { name: /back to dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("logs the error to console.error with the 'Settings Error' title", () => {
    const error = makeError("settings failure");
    render(<SettingsError error={error} reset={jest.fn()} />);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Settings Error:", error);
  });

  it("handles an error carrying a digest without crashing", () => {
    expect(() => {
      render(<SettingsError error={makeError("digest error", "digest-def")} reset={jest.fn()} />);
    }).not.toThrow();
  });
});