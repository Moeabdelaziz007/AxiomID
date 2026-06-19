/**
 * Tests for src/app/dashboard/layout.tsx
 *
 * PR change: Added a new "Sandbox" navigation item to both the desktop header
 * nav and the mobile bottom nav, with:
 *   - href="/dashboard/sandbox"
 *   - labelKey="sandbox" (renders as "Sandbox" via t())
 *   - icon=Cpu (from lucide-react)
 *
 * Also added the NavItem interface and converted NAV_ITEMS to typed array.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import DashboardLayout from "@/app/dashboard/layout";

// Mock next/navigation so usePathname() is controllable
const mockUsePathname = jest.fn(() => "/dashboard");
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock next/link to render a plain <a> so href is inspectable
jest.mock("next/link", () => {
  return function MockLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
    return <a href={href} className={className}>{children}</a>;
  };
});

// Stub heavy components that are not relevant to nav tests
jest.mock("@/components/ErrorBanner", () => ({
  ErrorBanner: () => null,
}));

jest.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle" />,
}));

jest.mock("@/components/LanguageToggle", () => ({
  __esModule: true,
  default: () => <button data-testid="language-toggle" />,
}));

describe("DashboardLayout — sandbox nav item (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
  });

  it("renders a 'Sandbox' link in the desktop navigation", () => {
    render(<DashboardLayout><div /></DashboardLayout>);

    // The mock t() function in jest.setup.js returns "Sandbox" for the "sandbox" key
    const sandboxLinks = screen.getAllByRole("link", { name: /sandbox/i });
    expect(sandboxLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("sandbox nav link points to /dashboard/sandbox", () => {
    render(<DashboardLayout><div /></DashboardLayout>);

    const sandboxLinks = screen.getAllByRole("link", { name: /sandbox/i });
    const sandboxHrefs = sandboxLinks.map((el) => el.getAttribute("href"));
    expect(sandboxHrefs).toContain("/dashboard/sandbox");
  });

  it("renders exactly 4 navigation links in the desktop nav (dashboard, marketplace, sandbox, settings)", () => {
    render(<DashboardLayout><div /></DashboardLayout>);

    // The desktop nav has aria-label="Dashboard navigation"
    const desktopNav = document.querySelector('nav[aria-label="Dashboard navigation"]');
    expect(desktopNav).not.toBeNull();

    const navLinks = desktopNav!.querySelectorAll("a");
    expect(navLinks.length).toBe(4);
  });

  it("desktop nav contains links to all 4 expected routes", () => {
    render(<DashboardLayout><div /></DashboardLayout>);

    const desktopNav = document.querySelector('nav[aria-label="Dashboard navigation"]');
    const hrefs = Array.from(desktopNav!.querySelectorAll("a")).map((a) => a.getAttribute("href"));

    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/dashboard/marketplace");
    expect(hrefs).toContain("/dashboard/sandbox");
    expect(hrefs).toContain("/dashboard/settings");
  });

  it("sandbox link is marked active when pathname is /dashboard/sandbox", () => {
    mockUsePathname.mockReturnValue("/dashboard/sandbox");
    render(<DashboardLayout><div /></DashboardLayout>);

    // Active link gets text-neon-green class
    const sandboxLinks = screen.getAllByRole("link", { name: /sandbox/i });
    const activeLink = sandboxLinks.find((el) => el.className.includes("text-neon-green"));
    expect(activeLink).toBeTruthy();
  });

  it("other nav links are NOT marked active when pathname is /dashboard/sandbox", () => {
    mockUsePathname.mockReturnValue("/dashboard/sandbox");
    render(<DashboardLayout><div /></DashboardLayout>);

    const desktopNav = document.querySelector('nav[aria-label="Dashboard navigation"]');
    const allNavLinks = Array.from(desktopNav!.querySelectorAll("a"));
    const activeLinks = allNavLinks.filter((a) => a.className.includes("text-neon-green"));

    // Only sandbox link should be active
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0].getAttribute("href")).toBe("/dashboard/sandbox");
  });

  it("sandbox link is NOT marked active when pathname is /dashboard", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<DashboardLayout><div /></DashboardLayout>);

    const sandboxLinks = screen.getAllByRole("link", { name: /sandbox/i });
    // In the desktop nav, the sandbox link should NOT have active class
    const desktopNav = document.querySelector('nav[aria-label="Dashboard navigation"]');
    const desktopSandboxLink = Array.from(desktopNav!.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/dashboard/sandbox"
    );
    expect(desktopSandboxLink).toBeTruthy();
    expect(desktopSandboxLink!.className).not.toContain("text-neon-green");
  });

  it("renders children inside the layout content area", () => {
    render(
      <DashboardLayout>
        <div data-testid="child-content">Hello from child</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello from child")).toBeInTheDocument();
  });
});

describe("DashboardLayout — mobile bottom navigation (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
  });

  it("renders a sandbox link in the mobile bottom nav", () => {
    render(<DashboardLayout><div /></DashboardLayout>);

    // Mobile nav has md:hidden class — select it by checking for fixed bottom nav
    // Both desktop and mobile render the same NAV_ITEMS, so we just check all
    const allLinks = screen.getAllByRole("link", { name: /sandbox/i });
    // There should be at least 2: one desktop, one mobile
    expect(allLinks.length).toBeGreaterThanOrEqual(2);

    const hrefs = allLinks.map((el) => el.getAttribute("href"));
    // Both should point to /dashboard/sandbox
    expect(hrefs.every((h) => h === "/dashboard/sandbox")).toBe(true);
  });

  it("mobile nav has 4 items (same as desktop)", () => {
    const { container } = render(<DashboardLayout><div /></DashboardLayout>);

    // The mobile nav is the second <nav> in the DOM
    const navElements = container.querySelectorAll("nav");
    expect(navElements.length).toBeGreaterThanOrEqual(2);

    // The mobile nav is the last one (has md:hidden)
    const mobileNav = navElements[navElements.length - 1];
    const mobileNavLinks = mobileNav.querySelectorAll("a");
    expect(mobileNavLinks.length).toBe(4);
  });
});

describe("DashboardLayout — NAV_ITEMS structure (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
  });

  it("renders dashboard_title label for the dashboard link", () => {
    render(<DashboardLayout><div /></DashboardLayout>);

    // t("dashboard_title") returns "AxiomID Dashboard" in mock
    const dashboardLinks = screen.getAllByRole("link", { name: /axiomid dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders marketplace label for the marketplace link", () => {
    render(<DashboardLayout><div /></DashboardLayout>);

    // t("marketplace") returns "Marketplace" in mock
    const marketplaceLinks = screen.getAllByRole("link", { name: /marketplace/i });
    const sandboxLinks = screen.getAllByRole("link", { name: /sandbox/i });

    // marketplace should be separate from sandbox
    expect(marketplaceLinks.length).toBeGreaterThanOrEqual(1);
    const marketplaceHrefs = marketplaceLinks.map((el) => el.getAttribute("href"));
    expect(marketplaceHrefs).toContain("/dashboard/marketplace");
  });

  it("renders settings_page_title label for the settings link", () => {
    render(<DashboardLayout><div /></DashboardLayout>);

    // t("settings_page_title") returns "AxiomID Settings" in mock
    const settingsLinks = screen.getAllByRole("link", { name: /axiomid settings/i });
    expect(settingsLinks.length).toBeGreaterThanOrEqual(1);
    const hrefs = settingsLinks.map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/dashboard/settings");
  });
});