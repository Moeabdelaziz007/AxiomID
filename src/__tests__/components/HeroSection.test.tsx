/**
 * Tests for src/components/landing/HeroSection.tsx
 *
 * PR change: the secondary "Explore the Protocol" CTA link was restyled
 * from plain zinc/rounded classes to the theme-aware `text-subtle` /
 * `text-surface` utilities with a visible `border-glass` pill treatment
 * (`border border-glass hover:border-glass-hover rounded-xl`).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import HeroSection from "@/components/landing/HeroSection";

jest.mock("@/components/landing/HeroFlow", () => ({
  __esModule: true,
  default: () => <div data-testid="hero-flow-stub" />,
}));

function makeT(overrides: Record<string, string> = {}) {
  return (key: string) => overrides[key] ?? key;
}

describe("HeroSection — rendering", () => {
  it("renders without crashing", () => {
    expect(() => render(<HeroSection t={makeT()} />)).not.toThrow();
  });

  it("renders the badge text using the provided t() function", () => {
    render(<HeroSection t={makeT({ landing_pi_badge: "Live on Pi Network" })} />);
    expect(screen.getByText("Live on Pi Network")).toBeInTheDocument();
  });

  it("falls back to the raw key when the translation is missing", () => {
    render(<HeroSection t={makeT()} />);
    expect(screen.getByText("landing_pi_badge")).toBeInTheDocument();
  });

  it("renders the static hero headline", () => {
    render(<HeroSection t={makeT()} />);
    expect(screen.getByText("landing_headline_en")).toBeInTheDocument();
    expect(screen.getByText("landing_headline_rules_en")).toBeInTheDocument();
  });

  it("renders the HeroFlow child component", () => {
    render(<HeroSection t={makeT()} />);
    expect(screen.getByTestId("hero-flow-stub")).toBeInTheDocument();
  });
});

describe("HeroSection — primary CTA", () => {
  it("renders a link to /claim with the expected label", () => {
    render(<HeroSection t={makeT()} />);
    const cta = screen.getByRole("link", { name: /hero_cta_create/i });
    expect(cta).toHaveAttribute("href", "/claim");
  });
});

describe("HeroSection — secondary CTA (PR change)", () => {
  it("renders a link to /docs with the expected label", () => {
    render(<HeroSection t={makeT()} />);
    const link = screen.getByRole("link", { name: /hero_cta_explore/i });
    expect(link).toHaveAttribute("href", "/docs");
  });

  it("applies the theme-aware text-subtle / text-surface hover classes", () => {
    render(<HeroSection t={makeT()} />);
    const link = screen.getByRole("link", { name: /hero_cta_explore/i });
    expect(link).toHaveClass("text-subtle", "hover:text-surface");
  });

  it("applies the border-glass pill treatment with rounded-xl corners", () => {
    render(<HeroSection t={makeT()} />);
    const link = screen.getByRole("link", { name: /hero_cta_explore/i });
    expect(link).toHaveClass("border", "border-glass", "hover:border-glass-hover", "rounded-xl");
  });

  it("no longer uses the old plain zinc text color or bare rounded class", () => {
    render(<HeroSection t={makeT()} />);
    const link = screen.getByRole("link", { name: /hero_cta_explore/i });
    expect(link.className).not.toContain("text-zinc-300");
    expect(link.className.split(/\s+/)).not.toContain("rounded");
  });

  it("keeps the focus-visible ring classes for accessibility", () => {
    render(<HeroSection t={makeT()} />);
    const link = screen.getByRole("link", { name: /hero_cta_explore/i });
    expect(link).toHaveClass("focus-visible:ring-2", "focus-visible:ring-electric-blue", "focus-visible:outline-none");
  });

  it("renders the Shield icon inside the secondary CTA", () => {
    render(<HeroSection t={makeT()} />);
    const link = screen.getByRole("link", { name: /hero_cta_explore/i });
    expect(link.querySelector("svg")).not.toBeNull();
  });
});