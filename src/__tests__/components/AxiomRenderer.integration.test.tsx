/**
 * Integration test for AxiomRenderer — uses the REAL @json-render/react
 * Renderer + registry to verify end-to-end rendering of JSON specs.
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { AxiomRenderer } from "@/components/ui/AxiomRenderer";

// Do NOT mock @json-render/react — we want the real Renderer.
// The moduleNameMapper in jest.config.js resolves to the CJS build.

// Do NOT mock @/lib/registry — we want the real registry with real components.

// Only mock framer-motion (already in jest.setup.js) and next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("AxiomRenderer — real integration", () => {
  it("renders a Heading component from a JSON spec", () => {
    const spec = {
      root: "heading1",
      elements: {
        heading1: {
          type: "Heading",
          props: { text: "Hello AxiomID", level: "h2" },
        },
      },
    };
    render(<AxiomRenderer spec={spec} />);
    expect(screen.getByText("Hello AxiomID")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("renders a Card component with title", () => {
    const spec = {
      root: "card1",
      elements: {
        card1: {
          type: "Card",
          props: { title: "My Dashboard Card" },
          children: [],
        },
      },
    };
    render(<AxiomRenderer spec={spec} />);
    expect(screen.getByText("My Dashboard Card")).toBeInTheDocument();
  });

  it("renders a Metric component", () => {
    const spec = {
      root: "metric1",
      elements: {
        metric1: {
          type: "Metric",
          props: { label: "Trust Score", value: "92" },
        },
      },
    };
    render(<AxiomRenderer spec={spec} />);
    expect(screen.getByText("Trust Score")).toBeInTheDocument();
    expect(screen.getByText("92")).toBeInTheDocument();
  });

  it("renders a Button component", () => {
    const spec = {
      root: "btn1",
      elements: {
        btn1: {
          type: "Button",
          props: { label: "Activate Agent" },
        },
      },
    };
    render(<AxiomRenderer spec={spec} />);
    expect(
      screen.getByRole("button", { name: "Activate Agent" })
    ).toBeInTheDocument();
  });

  it("renders a LinkItem component", () => {
    const spec = {
      root: "link1",
      elements: {
        link1: {
          type: "LinkItem",
          props: { label: "View Passport", href: "/passport/test-user" },
        },
      },
    };
    render(<AxiomRenderer spec={spec} />);
    const link = screen.getByRole("link", { name: "View Passport" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/passport/test-user");
  });

  it("renders nested components inside a Card", () => {
    const spec = {
      root: "card1",
      elements: {
        card1: {
          type: "Card",
          props: { title: "Agent Overview" },
          children: ["heading1", "metric1"],
        },
        heading1: {
          type: "Heading",
          props: { text: "Agent Stats", level: "h3" },
        },
        metric1: {
          type: "Metric",
          props: { label: "XP", value: "1,250" },
        },
      },
    };
    render(<AxiomRenderer spec={spec} />);
    expect(screen.getByText("Agent Overview")).toBeInTheDocument();
    expect(screen.getByText("Agent Stats")).toBeInTheDocument();
    expect(screen.getByText("1,250")).toBeInTheDocument();
  });

  it("renders empty spec without crashing", () => {
    const spec = { root: "empty", elements: {} };
    render(<AxiomRenderer spec={spec} />);
    // Should not throw — just renders nothing visible
  });

  it("handles multiple Heading levels inside a Card", () => {
    const spec = {
      root: "card1",
      elements: {
        card1: {
          type: "Card",
          props: {},
          children: ["h1", "h2"],
        },
        h1: { type: "Heading", props: { text: "Title", level: "h1" } },
        h2: { type: "Heading", props: { text: "Subtitle", level: "h2" } },
      },
    };
    render(<AxiomRenderer spec={spec} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});
