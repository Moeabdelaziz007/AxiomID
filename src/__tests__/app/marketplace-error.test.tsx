/**
 * Tests for src/app/dashboard/marketplace/error.tsx
 * and src/app/dashboard/settings/error.tsx
 *
 * PR change: new error boundary components for marketplace and settings routes.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MarketplaceError from "@/app/dashboard/marketplace/error";
import SettingsError from "@/app/dashboard/settings/error";

// Mock RouteErrorPage to isolate the error boundary components
jest.mock("@/components/RouteErrorPage", () => ({
  RouteErrorPage: ({
    title,
    fallbackMessage,
    error,
    reset,
  }: {
    title: string;
    fallbackMessage: string;
    error: Error;
    reset: () => void;
  }) => (
    <div data-testid="route-error-page">
      <span data-testid="title">{title}</span>
      <span data-testid="fallback-message">{fallbackMessage}</span>
      <span data-testid="error-message">{error.message}</span>
      <button data-testid="reset-button" onClick={reset}>RETRY</button>
    </div>
  ),
}));

function makeError(message: string, digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string };
  if (digest) err.digest = digest;
  return err;
}

describe("MarketplaceError — rendering (PR change: new error boundary)", () => {
  it("renders RouteErrorPage component", () => {
    render(
      <MarketplaceError error={makeError("test")} reset={jest.fn()} />
    );
    expect(screen.getByTestId("route-error-page")).toBeInTheDocument();
  });

  it("passes 'Marketplace Error' as the title", () => {
    render(
      <MarketplaceError error={makeError("test")} reset={jest.fn()} />
    );
    expect(screen.getByTestId("title")).toHaveTextContent("Marketplace Error");
  });

  it("passes correct fallbackMessage", () => {
    render(
      <MarketplaceError error={makeError("test")} reset={jest.fn()} />
    );
    expect(screen.getByTestId("fallback-message")).toHaveTextContent(
      "Something went wrong loading the marketplace."
    );
  });

  it("passes the error object through to RouteErrorPage", () => {
    const error = makeError("marketplace fetch failed");
    render(<MarketplaceError error={error} reset={jest.fn()} />);
    expect(screen.getByTestId("error-message")).toHaveTextContent("marketplace fetch failed");
  });

  it("passes reset callback to RouteErrorPage", () => {
    const resetFn = jest.fn();
    render(<MarketplaceError error={makeError("test")} reset={resetFn} />);

    fireEvent.click(screen.getByTestId("reset-button"));

    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it("passes error with digest property without crashing", () => {
    const error = makeError("Error", "digest-abc");
    expect(() => {
      render(<MarketplaceError error={error} reset={jest.fn()} />);
    }).not.toThrow();
  });
});

describe("SettingsError — rendering (PR change: new error boundary)", () => {
  it("renders RouteErrorPage component", () => {
    render(
      <SettingsError error={makeError("test")} reset={jest.fn()} />
    );
    expect(screen.getByTestId("route-error-page")).toBeInTheDocument();
  });

  it("passes 'Settings Error' as the title", () => {
    render(
      <SettingsError error={makeError("test")} reset={jest.fn()} />
    );
    expect(screen.getByTestId("title")).toHaveTextContent("Settings Error");
  });

  it("passes correct fallbackMessage for settings", () => {
    render(
      <SettingsError error={makeError("test")} reset={jest.fn()} />
    );
    expect(screen.getByTestId("fallback-message")).toHaveTextContent(
      "Something went wrong loading settings."
    );
  });

  it("passes the error object through to RouteErrorPage", () => {
    const error = makeError("settings load failed");
    render(<SettingsError error={error} reset={jest.fn()} />);
    expect(screen.getByTestId("error-message")).toHaveTextContent("settings load failed");
  });

  it("passes reset callback to RouteErrorPage", () => {
    const resetFn = jest.fn();
    render(<SettingsError error={makeError("test")} reset={resetFn} />);

    fireEvent.click(screen.getByTestId("reset-button"));

    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it("settings and marketplace errors have different titles", () => {
    const { unmount: unmountMarketplace } = render(
      <MarketplaceError error={makeError("test")} reset={jest.fn()} />
    );
    const marketplaceTitle = screen.getByTestId("title").textContent;
    unmountMarketplace();

    render(<SettingsError error={makeError("test")} reset={jest.fn()} />);
    const settingsTitle = screen.getByTestId("title").textContent;

    expect(marketplaceTitle).not.toBe(settingsTitle);
  });

  it("settings and marketplace errors have different fallback messages", () => {
    const { unmount: unmountMarketplace } = render(
      <MarketplaceError error={makeError("test")} reset={jest.fn()} />
    );
    const marketplaceFallback = screen.getByTestId("fallback-message").textContent;
    unmountMarketplace();

    render(<SettingsError error={makeError("test")} reset={jest.fn()} />);
    const settingsFallback = screen.getByTestId("fallback-message").textContent;

    expect(marketplaceFallback).not.toBe(settingsFallback);
  });
});