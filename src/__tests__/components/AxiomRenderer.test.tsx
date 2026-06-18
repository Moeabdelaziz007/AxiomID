import React from "react";
import { render, screen } from "@testing-library/react";
import { AxiomRenderer } from "@/components/ui/AxiomRenderer";

// Mock @json-render/react so we don't need the real ESM package in tests
jest.mock("@json-render/react", () => ({
  Renderer: ({ spec, registry }: { spec: unknown; registry: unknown }) => (
    <div data-testid="mock-renderer" data-spec={JSON.stringify(spec)} data-has-registry={String(!!registry)} />
  ),
}));

// Mock @/lib/registry so we can control the registry value passed in
jest.mock("@/lib/registry", () => ({
  registry: { __mock: true },
}));

describe("AxiomRenderer", () => {
  it("renders without crashing", () => {
    const spec = { root: "card", elements: {} };
    render(<AxiomRenderer spec={spec} />);
    expect(screen.getByTestId("mock-renderer")).toBeInTheDocument();
  });

  it("passes the spec to the underlying Renderer", () => {
    const spec = { root: "heading", elements: { heading: { type: "Heading", props: { text: "Hello" } } } };
    render(<AxiomRenderer spec={spec} />);
    const renderer = screen.getByTestId("mock-renderer");
    expect(renderer.getAttribute("data-spec")).toBe(JSON.stringify(spec));
  });

  it("passes a registry to the underlying Renderer", () => {
    const spec = { root: "card", elements: {} };
    render(<AxiomRenderer spec={spec} />);
    const renderer = screen.getByTestId("mock-renderer");
    expect(renderer.getAttribute("data-has-registry")).toBe("true");
  });

  it("accepts any spec shape (null elements)", () => {
    const spec = { root: "empty" };
    render(<AxiomRenderer spec={spec} />);
    expect(screen.getByTestId("mock-renderer")).toBeInTheDocument();
  });

  it("accepts a spec with multiple elements", () => {
    const spec = {
      root: "card",
      elements: {
        card: { type: "Card", props: { title: "My Card" }, children: ["link1"] },
        link1: { type: "LinkItem", props: { label: "Go", href: "/go" } },
      },
    };
    render(<AxiomRenderer spec={spec} />);
    const renderer = screen.getByTestId("mock-renderer");
    expect(renderer.getAttribute("data-spec")).toBe(JSON.stringify(spec));
  });

  it("renders a new spec when re-rendered with different props", () => {
    const spec1 = { root: "a", elements: {} };
    const spec2 = { root: "b", elements: {} };
    const { rerender } = render(<AxiomRenderer spec={spec1} />);
    expect(screen.getByTestId("mock-renderer").getAttribute("data-spec")).toBe(JSON.stringify(spec1));
    rerender(<AxiomRenderer spec={spec2} />);
    expect(screen.getByTestId("mock-renderer").getAttribute("data-spec")).toBe(JSON.stringify(spec2));
  });
});