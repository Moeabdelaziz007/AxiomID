/**
 * Tests for src/app/about/not-found.tsx
 *
 * PR change: new route-level 404 page for /about. Uses useLanguage() (globally
 * mocked to language: "en" in jest.setup.js) to select English/Arabic text via
 * an inline t(en, ar) helper, and links back to the home page.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import AboutNotFound from "@/app/about/not-found";

describe("about/not-found.tsx — AboutNotFound page", () => {
  it("renders the 'Page Not Found' heading", () => {
    render(<AboutNotFound />);
    expect(screen.getByRole("heading", { name: "Page Not Found" })).toBeInTheDocument();
  });

  it("renders the heading as an h2 element", () => {
    render(<AboutNotFound />);
    const heading = screen.getByRole("heading", { name: "Page Not Found" });
    expect(heading.tagName).toBe("H2");
  });

  it("renders the descriptive not-found message", () => {
    render(<AboutNotFound />);
    expect(
      screen.getByText("The page you are looking for does not exist or has been moved.")
    ).toBeInTheDocument();
  });

  it("renders a GO HOME link pointing to /", () => {
    render(<AboutNotFound />);
    const link = screen.getByRole("link", { name: "GO HOME" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders exactly one heading and one link", () => {
    render(<AboutNotFound />);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});