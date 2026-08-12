import React from "react";
import { render, screen } from "@testing-library/react";
import PlansPage from "@/app/plans/page";

jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue({
    get: (name: string) => (name === "accept-language" ? "en-US,en;q=0.9" : null),
  }),
}));

jest.mock("@/components/os/StatusBar", () => ({
  StatusBar: () => null,
}));

jest.mock("@/components/os/AuraDock", () => ({
  AuraDock: () => null,
}));

jest.mock("@/components/plans/CheckoutButton", () => ({
  CheckoutButton: ({ plan }: { plan: string }) => <a href={`/checkout/${plan}`}>{`checkout-${plan}`}</a>,
}));

describe("PlansPage — tier comparison and provisioning call-to-action", () => {
  it("renders all three tiers with English translations", async () => {
    const { container } = render(await PlansPage());
    expect(screen.getByRole("heading", { name: "P1 Hobby" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "P2 Creator" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "P3 Power" })).toBeInTheDocument();
    expect(container).toHaveTextContent(/Ghost invoices/);
  });

  it("gives the hobby tier a free CTA and paid tiers a checkout button", async () => {
    render(await PlansPage());
    expect(screen.getByRole("link", { name: "Start Free" })).toHaveAttribute("href", "/claim");
    expect(screen.getByRole("link", { name: "checkout-creator" })).toHaveAttribute(
      "href",
      "/checkout/creator",
    );
    expect(screen.getByRole("link", { name: "checkout-power" })).toHaveAttribute(
      "href",
      "/checkout/power",
    );
  });

  it("marks the creator tier as popular and shows per-tier allocation widths", async () => {
    const { container } = render(await PlansPage());
    const tiers = container.querySelectorAll('section[role="listitem"]');
    expect(tiers).toHaveLength(3);
    expect(tiers[1]).toHaveTextContent("P2");
    const bars = container.querySelectorAll('div[style*="width"]');
    expect(bars).toHaveLength(15);
    expect(bars[0].getAttribute("style")).toContain("25%");
    expect(bars[5].getAttribute("style")).toContain("60%");
    expect(bars[10].getAttribute("style")).toContain("100%");
  });
});