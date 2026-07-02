/**
 * Tests for src/app/dashboard/marketplace/not-found.tsx
 *
 * PR change: new route-level 404 page for /dashboard/marketplace. Uses
 * useLanguage() (globally mocked to language: "en" in jest.setup.js) to select
 * English/Arabic text via an inline t(en, ar) helper, and links back home.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import MarketplaceNotFound from "@/app/dashboard/marketplace/not-found";

describe("dashboard/marketplace/not-found.tsx — MarketplaceNotFound page", () => {
  it("renders the 'Page Not Found' heading", () => {
    render(<MarketplaceNotFound />);
    expect(screen.getByRole("heading", { name: "Page Not Found" })).toBeInTheDocument();
  });

  it("renders the heading as an h2 element", () => {
    render(<MarketplaceNotFound />);
    const heading = screen.getByRole("heading", { name: "Page Not Found" });
    expect(heading.tagName).toBe("H2");
  });

  it("renders the descriptive not-found message", () => {
    render(<MarketplaceNotFound />);
    expect(
      screen.getByText("The page you are looking for does not exist or has been moved.")
    ).toBeInTheDocument();
  });

  it("renders a GO HOME link pointing to /", () => {
    render(<MarketplaceNotFound />);
    const link = screen.getByRole("link", { name: "GO HOME" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders exactly one heading and one link", () => {
    render(<MarketplaceNotFound />);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});