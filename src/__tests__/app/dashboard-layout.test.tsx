/**
 * Tests for src/app/dashboard/layout.tsx
 *
 * PR change: wrapped the page content in a <Suspense> boundary (inside the
 * existing ErrorBoundary) with a pulse-skeleton fallback, and added the
 * "animate-in" class to the content wrapper.
 */

import React, { Suspense } from "react";
import { render, screen, act } from "@testing-library/react";
import DashboardLayout from "@/app/dashboard/layout";
import { useWallet } from "@/app/context/wallet-context";
import { defaultWalletCtx } from "./wallet-test-helpers";

jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

jest.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle" />,
}));

jest.mock("@/components/LanguageToggle", () => ({
  __esModule: true,
  default: () => <button data-testid="language-toggle" />,
}));

jest.mock("lucide-react", () => ({
  Fingerprint: () => <svg data-testid="icon-fingerprint" />,
  Store: () => <svg data-testid="icon-store" />,
  Cpu: () => <svg data-testid="icon-cpu" />,
  Settings: () => <svg data-testid="icon-settings" />,
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseWallet.mockReturnValue(defaultWalletCtx());
});

describe("dashboard/layout.tsx — normal rendering", () => {
  it("renders children when they are not suspended", () => {
    render(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>
    );
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("does not show the Suspense fallback skeleton for non-suspending children", () => {
    const { container } = render(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBe(0);
  });

  it("renders the desktop navigation links for all four dashboard sections", () => {
    render(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>
    );
    // Mobile + desktop nav each render 4 links per labelKey; assert at least one of each icon
    expect(screen.getAllByTestId("icon-fingerprint").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-store").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-cpu").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-settings").length).toBeGreaterThan(0);
  });

  it("does not render the ErrorBanner when there is no wallet error", () => {
    render(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the ErrorBanner with the wallet error message when present", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ error: "Connection failed" }));
    render(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Connection failed");
  });
});

describe("dashboard/layout.tsx — Suspense fallback (PR change)", () => {
  it("shows the pulse-skeleton fallback while a lazy child is suspended", () => {
    const NeverResolves = React.lazy(() => new Promise<{ default: React.ComponentType }>(() => {}));

    const { container } = render(
      <DashboardLayout>
        <NeverResolves />
      </DashboardLayout>
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders the resolved child content once the suspended promise resolves", async () => {
    let resolveImport: (mod: { default: React.ComponentType }) => void;
    const importPromise = new Promise<{ default: React.ComponentType }>((resolve) => {
      resolveImport = resolve;
    });
    const LazyChild = React.lazy(() => importPromise);

    render(
      <DashboardLayout>
        <LazyChild />
      </DashboardLayout>
    );

    expect(screen.queryByText("Loaded Content")).not.toBeInTheDocument();

    await act(async () => {
      resolveImport({ default: () => <div>Loaded Content</div> });
      await importPromise;
    });

    expect(await screen.findByText("Loaded Content")).toBeInTheDocument();
  });
});

describe("dashboard/layout.tsx — regression", () => {
  it("still renders content when wrapped children throw no errors (ErrorBoundary passthrough)", () => {
    expect(() =>
      render(
        <DashboardLayout>
          <Suspense fallback={<div>inner fallback</div>}>
            <div>Nested content</div>
          </Suspense>
        </DashboardLayout>
      )
    ).not.toThrow();
  });
});