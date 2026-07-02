/**
 * Tests for src/app/about/loading.tsx
 *
 * PR change: new route-level loading UI for /about, rendering the shared
 * RouteLoadingSkeleton component.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import AboutLoading from "@/app/about/loading";

describe("about/loading.tsx — AboutLoading page", () => {
  it("renders without crashing", () => {
    expect(() => render(<AboutLoading />)).not.toThrow();
  });

  it("renders the shared loading skeleton with an accessible busy status", () => {
    render(<AboutLoading />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
  });

  it("renders a status region with an accessible name for page loading", () => {
    render(<AboutLoading />);
    expect(screen.getByRole("status", { name: /page loading/i })).toBeInTheDocument();
  });
});