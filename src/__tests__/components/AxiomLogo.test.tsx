import React from "react";
import { render, screen } from "@testing-library/react";
import { AxiomLogo } from "@/components/AxiomLogo";

describe("AxiomLogo — rendering", () => {
  it("renders without crashing", () => {
    render(<AxiomLogo />);
  });

  it("renders the AXIOMID wordmark by default", () => {
    render(<AxiomLogo />);
    expect(screen.getByText(/AXIOM/)).toBeInTheDocument();
    expect(screen.getByText("ID")).toBeInTheDocument();
  });

  it("hides the wordmark when showWordmark is false", () => {
    render(<AxiomLogo showWordmark={false} />);
    expect(screen.queryByText(/AXIOM/)).not.toBeInTheDocument();
  });

  it("renders the SVG logo icon regardless of wordmark setting", () => {
    const { container } = render(<AxiomLogo showWordmark={false} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("applies the sm size box classes", () => {
    const { container } = render(<AxiomLogo size="sm" showWordmark={false} />);
    const logoBox = container.querySelector(".w-7.h-7.rounded-lg");
    expect(logoBox).toBeInTheDocument();
  });

  it("applies the md size box classes (default)", () => {
    const { container } = render(<AxiomLogo showWordmark={false} />);
    const logoBox = container.querySelector(".w-9.h-9.rounded-xl");
    expect(logoBox).toBeInTheDocument();
  });

  it("applies the lg size box classes", () => {
    const { container } = render(<AxiomLogo size="lg" showWordmark={false} />);
    const logoBox = container.querySelector(".w-12.h-12.rounded-xl");
    expect(logoBox).toBeInTheDocument();
  });

  it("passes through a custom className to the outer wrapper", () => {
    const { container } = render(<AxiomLogo className="my-custom-class" />);
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  it("renders a linearGradient for the logo SVG circle stroke", () => {
    const { container } = render(<AxiomLogo />);
    const gradient = container.querySelector("defs > linearGradient");
    expect(gradient).toBeInTheDocument();
  });

  it("uses a unique gradient id per instance to avoid collisions", () => {
    const { container } = render(
      <>
        <AxiomLogo />
        <AxiomLogo />
      </>
    );
    const gradients = Array.from(
      container.querySelectorAll("defs > linearGradient")
    ).filter((g) => g.querySelectorAll("stop").length === 4);
    expect(gradients).toHaveLength(2);
    expect(gradients[0].getAttribute("id")).not.toEqual(gradients[1].getAttribute("id"));
  });

  it("renders the 'A' letter path in the SVG", () => {
    const { container } = render(<AxiomLogo />);
    const paths = container.querySelectorAll("path");
    // The logo has two path elements: the A shape and the accent bar
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });
});

describe("AxiomLogo — size variations", () => {
  it.each([
    ["sm", "w-3.5", "h-3.5"],
    ["md", "w-5", "h-5"],
    ["lg", "w-7", "h-7"],
  ] as const)("size=%s renders SVG with correct CSS classes", (size, w, h) => {
    const { container } = render(<AxiomLogo size={size} showWordmark={false} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass(w);
    expect(svg).toHaveClass(h);
  });
});

describe("AxiomLogo — SVG structure and attributes", () => {
  it("SVG has viewBox '0 0 100 100'", () => {
    const { container } = render(<AxiomLogo />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 100 100");
  });

  it("outer ring circle has the animate-spin-slow class", () => {
    const { container } = render(<AxiomLogo />);
    const circle = container.querySelector("circle.animate-spin-slow");
    expect(circle).toBeInTheDocument();
  });

  it("logo gradient has four stop elements", () => {
    const { container } = render(<AxiomLogo />);
    const firstGradient = container.querySelector("defs > linearGradient");
    expect(firstGradient?.querySelectorAll("stop")).toHaveLength(4);
  });

  it("linearGradient first stop is neon-green (#39FF14)", () => {
    const { container } = render(<AxiomLogo />);
    const stops = container.querySelectorAll("defs > linearGradient > stop");
    expect(stops[0].getAttribute("stop-color")).toBe("#39FF14");
  });

  it("linearGradient second stop is electric-blue (#00d4ff)", () => {
    const { container } = render(<AxiomLogo />);
    const stops = container.querySelectorAll("defs > linearGradient > stop");
    expect(stops[1].getAttribute("stop-color")).toBe("#00d4ff");
  });

  it("linearGradient third stop is axiom-purple (#a855f7)", () => {
    const { container } = render(<AxiomLogo />);
    const stops = container.querySelectorAll("defs > linearGradient > stop");
    expect(stops[2].getAttribute("stop-color")).toBe("#a855f7");
  });

  it("outer wrapper has 'flex' and 'items-center' classes", () => {
    const { container } = render(<AxiomLogo />);
    expect(container.firstChild).toHaveClass("flex");
    expect(container.firstChild).toHaveClass("items-center");
  });

  it("logo box has 'group' class", () => {
    const { container } = render(<AxiomLogo />);
    const box = container.querySelector(".box");  // noop
    const inner = container.querySelector("div.group");
    expect(inner).not.toBeNull();
  });

  it("SVG circle has strokeDasharray attribute set", () => {
    const { container } = render(<AxiomLogo />);
    const circle = container.querySelector("circle");
    expect(circle?.getAttribute("stroke-dasharray")).toBeTruthy();
  });

  it("circle has strokeWidth of '2'", () => {
    const { container } = render(<AxiomLogo />);
    const circle = container.querySelector("circle");
    expect(circle?.getAttribute("stroke-width")).toBe("2");
  });
});

describe("AxiomLogo — wordmark content", () => {
  it("AXIOM text is in a span with font-mono class", () => {
    const { container } = render(<AxiomLogo />);
    const spans = container.querySelectorAll("span");
    const wordmarkSpan = Array.from(spans).find((s) => s.textContent?.includes("AXIOM"));
    expect(wordmarkSpan).toHaveClass("font-mono");
  });

  it("'ID' text has text-electric-blue class", () => {
    const { container } = render(<AxiomLogo />);
    const idSpan = Array.from(container.querySelectorAll("span")).find(
      (s) => s.textContent === "ID"
    );
    expect(idSpan).toHaveClass("text-electric-blue");
  });
});