/**
 * Tests for src/app/claim/loading.tsx
 *
 * PR change: new route-level loading UI for /claim, rendering the shared
 * RouteLoadingSkeleton component.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import ClaimLoading from "@/app/claim/loading";

describe("claim/loading.tsx — ClaimLoading page", () => {
  it("renders without crashing", () => {
    expect(() => render(<ClaimLoading />)).not.toThrow();
  });

  it("renders the shared loading skeleton with an accessible busy status", () => {
    render(<ClaimLoading />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
  });

  it("renders a status region with an accessible name for page loading", () => {
    render(<ClaimLoading />);
    expect(screen.getByRole("status", { name: /page loading/i })).toBeInTheDocument();
  });
});