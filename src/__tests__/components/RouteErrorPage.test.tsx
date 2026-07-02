/**
 * Tests for src/components/RouteErrorPage.tsx
 *
 * PR change: new reusable error page component used by error boundaries.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RouteErrorPage } from "@/components/RouteErrorPage";
import { logger } from "@/lib/logger";

// Suppress logger.error calls from the component
const loggerErrorSpy = jest.spyOn(logger, "error").mockImplementation(() => {});

afterAll(() => {
  loggerErrorSpy.mockRestore();
});

function makeError(message: string, digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string };
  if (digest) err.digest = digest;
  return err;
}

describe("RouteErrorPage — rendering", () => {
  it("renders the provided title", () => {
    render(
      <RouteErrorPage
        title="Test Error"
        fallbackMessage="Something went wrong."
        error={makeError("Dev error message")}
        reset={jest.fn()}
      />
    );
    expect(screen.getByText("Test Error")).toBeInTheDocument();
  });

  it("renders the RETRY button", () => {
    render(
      <RouteErrorPage
        title="Error"
        fallbackMessage="Fallback"
        error={makeError("msg")}
        reset={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders a BACK TO DASHBOARD link", () => {
    render(
      <RouteErrorPage
        title="Error"
        fallbackMessage="Fallback"
        error={makeError("msg")}
        reset={jest.fn()}
      />
    );
    const link = screen.getByRole("link", { name: /back to dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("shows error.message in development environment", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true });

    render(
      <RouteErrorPage
        title="Error"
        fallbackMessage="Fallback message"
        error={makeError("Specific dev error")}
        reset={jest.fn()}
      />
    );

    // In development NODE_ENV, show error.message
    expect(screen.getByText("Specific dev error")).toBeInTheDocument();

    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, writable: true });
  });

  it("shows fallbackMessage in production environment", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });

    render(
      <RouteErrorPage
        title="Error"
        fallbackMessage="Something went wrong in production."
        error={makeError("Internal detail")}
        reset={jest.fn()}
      />
    );

    expect(screen.getByText("Something went wrong in production.")).toBeInTheDocument();
    expect(screen.queryByText("Internal detail")).not.toBeInTheDocument();

    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, writable: true });
  });

  it("renders an SVG error icon", () => {
    const { container } = render(
      <RouteErrorPage
        title="Error"
        fallbackMessage="Fallback"
        error={makeError("msg")}
        reset={jest.fn()}
      />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

describe("RouteErrorPage — interaction", () => {
  it("calls reset() when RETRY button is clicked", () => {
    const resetFn = jest.fn();
    render(
      <RouteErrorPage
        title="Error"
        fallbackMessage="Fallback"
        error={makeError("msg")}
        reset={resetFn}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it("does not call reset() when BACK TO DASHBOARD link is clicked (it's a link, not a button)", () => {
    const resetFn = jest.fn();
    render(
      <RouteErrorPage
        title="Error"
        fallbackMessage="Fallback"
        error={makeError("msg")}
        reset={resetFn}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: /back to dashboard/i }));

    expect(resetFn).not.toHaveBeenCalled();
  });
});

describe("RouteErrorPage — logger.error logging", () => {
  it("logs the error to logger.error with the title", () => {
    const error = makeError("Test error message");

    render(
      <RouteErrorPage
        title="My Title"
        fallbackMessage="Fallback"
        error={error}
        reset={jest.fn()}
      />
    );

    expect(loggerErrorSpy).toHaveBeenCalledWith("My Title:", error);
  });
});

describe("RouteErrorPage — edge cases", () => {
  it("handles error with digest property without crashing", () => {
    const error = makeError("Error with digest", "abc123digest");

    expect(() => {
      render(
        <RouteErrorPage
          title="Error"
          fallbackMessage="Fallback"
          error={error}
          reset={jest.fn()}
        />
      );
    }).not.toThrow();
  });

  it("renders correctly with empty error message", () => {
    render(
      <RouteErrorPage
        title="Empty Error"
        fallbackMessage="Fallback text"
        error={makeError("")}
        reset={jest.fn()}
      />
    );

    expect(screen.getByText("Empty Error")).toBeInTheDocument();
  });
});