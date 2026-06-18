/**
 * Tests for src/app/passport/[slug]/error.tsx
 *
 * PR change: component now uses useLanguage() for localized text
 * instead of hardcoded English strings.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PassportError from "@/app/passport/[slug]/error";

// useLanguage is globally mocked in jest.setup.js; the mock t() returns
// mockDict[key] || key, so for keys not in the dict the key name is returned.

function makeError(message: string, digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string };
  if (digest) err.digest = digest;
  return err;
}

describe("PassportError — rendering (PR change: localized with useLanguage)", () => {
  it("renders without crashing", () => {
    expect(() => {
      render(<PassportError error={makeError("test error")} reset={jest.fn()} />);
    }).not.toThrow();
  });

  it("renders the heading using t('something_went_wrong')", () => {
    render(<PassportError error={makeError("test")} reset={jest.fn()} />);
    // Mock returns the key string for unknown keys
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByRole("heading").textContent).toBe("something_went_wrong");
  });

  it("renders error.message when provided", () => {
    render(<PassportError error={makeError("Specific error message")} reset={jest.fn()} />);
    expect(screen.getByText("Specific error message")).toBeInTheDocument();
  });

  it("falls back to t('passport_load_error') when error has no message", () => {
    const error = makeError("") as Error & { digest?: string };
    render(<PassportError error={error} reset={jest.fn()} />);
    // t('passport_load_error') = 'Failed to load passport' from mockDict
    expect(screen.getByText("Failed to load passport")).toBeInTheDocument();
  });

  it("renders Try Again button using t('try_again')", () => {
    render(<PassportError error={makeError("test")} reset={jest.fn()} />);
    // Mock returns key string: 'try_again'
    expect(screen.getByRole("button", { name: "try_again" })).toBeInTheDocument();
  });

  it("renders Create Your Passport link using t('create_your_passport')", () => {
    render(<PassportError error={makeError("test")} reset={jest.fn()} />);
    // 'create_your_passport' is in mockDict -> 'CREATE YOUR PASSPORT'
    expect(screen.getByRole("link", { name: "CREATE YOUR PASSPORT" })).toBeInTheDocument();
  });

  it("link points to home /", () => {
    render(<PassportError error={makeError("test")} reset={jest.fn()} />);
    const link = screen.getByRole("link", { name: "CREATE YOUR PASSPORT" });
    expect(link).toHaveAttribute("href", "/");
  });
});

describe("PassportError — interactions", () => {
  it("calls reset() when Try Again button is clicked", () => {
    const resetFn = jest.fn();
    render(<PassportError error={makeError("test")} reset={resetFn} />);

    fireEvent.click(screen.getByRole("button", { name: "try_again" }));

    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it("does not call reset() when link is clicked", () => {
    const resetFn = jest.fn();
    render(<PassportError error={makeError("test")} reset={resetFn} />);

    fireEvent.click(screen.getByRole("link", { name: "CREATE YOUR PASSPORT" }));

    expect(resetFn).not.toHaveBeenCalled();
  });
});

describe("PassportError — error with digest", () => {
  it("renders without crashing when digest is provided", () => {
    const error = makeError("Digest error", "digest-abc-123");
    expect(() => {
      render(<PassportError error={error} reset={jest.fn()} />);
    }).not.toThrow();
  });

  it("does not display the digest in the UI", () => {
    const error = makeError("Error message", "digest-abc-123");
    render(<PassportError error={error} reset={jest.fn()} />);
    expect(screen.queryByText("digest-abc-123")).not.toBeInTheDocument();
  });
});