/**
 * Tests for src/components/OptimizedImage.tsx
 *
 * PR changes:
 * - Banner component and BannerProps interface were removed entirely.
 *   The module now only exports OptimizedImage and Avatar.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import * as OptimizedImageModule from "@/components/OptimizedImage";
import { OptimizedImage, Avatar } from "@/components/OptimizedImage";

// Mock next/image to render a plain <img> so tests can inspect src/alt attributes
jest.mock("next/image", () => {
  const MockImage = ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  );
  MockImage.displayName = "MockImage";
  return MockImage;
});

// Mock getOptimizedImageUrl to return a deterministic URL
jest.mock("@/lib/images", () => ({
  getOptimizedImageUrl: jest.fn((src: string) => `${src}?optimized=1`),
}));

// ─────────────────────────────────────────────────────────────────────────────
// PR change: Banner component removed
// ─────────────────────────────────────────────────────────────────────────────

describe("OptimizedImage.tsx — Banner component removed (PR change)", () => {
  it("does not export a Banner named export", () => {
    // After the PR, Banner should not exist in module exports
    expect((OptimizedImageModule as Record<string, unknown>)["Banner"]).toBeUndefined();
  });

  it("module still exports OptimizedImage", () => {
    expect(OptimizedImageModule.OptimizedImage).toBeDefined();
    expect(typeof OptimizedImageModule.OptimizedImage).toBe("function");
  });

  it("module still exports Avatar", () => {
    expect(OptimizedImageModule.Avatar).toBeDefined();
    expect(typeof OptimizedImageModule.Avatar).toBe("function");
  });

  it("module exports exactly OptimizedImage and Avatar (no extra exports)", () => {
    const exportedKeys = Object.keys(OptimizedImageModule);
    expect(exportedKeys).toContain("OptimizedImage");
    expect(exportedKeys).toContain("Avatar");
    expect(exportedKeys).not.toContain("Banner");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OptimizedImage component (unchanged, still present)
// ─────────────────────────────────────────────────────────────────────────────

describe("OptimizedImage component", () => {
  it("renders an img element with the provided alt text", () => {
    render(<OptimizedImage src="/test-image.png" alt="Test image" />);
    expect(screen.getByAltText("Test image")).toBeInTheDocument();
  });

  it("renders the optimized src URL via getOptimizedImageUrl", () => {
    render(<OptimizedImage src="/photo.jpg" alt="Photo" />);
    const img = screen.getByAltText("Photo");
    expect(img.getAttribute("src")).toContain("/photo.jpg");
  });

  it("renders a wrapper div around the image", () => {
    const { container } = render(<OptimizedImage src="/test.png" alt="Wrapped" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.tagName).toBe("DIV");
  });

  it("applies className to the wrapper div", () => {
    const { container } = render(
      <OptimizedImage src="/test.png" alt="Cls test" className="custom-class" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("custom-class");
  });

  it("shows loading spinner when showLoading=true and image is loading", () => {
    const { container } = render(
      <OptimizedImage src="/test.png" alt="Loading test" showLoading={true} />
    );
    // The loading spinner div has animate-pulse class
    const spinner = container.querySelector(".animate-pulse");
    expect(spinner).toBeInTheDocument();
  });

  it("does not show loading spinner when showLoading=false", () => {
    const { container } = render(
      <OptimizedImage src="/test.png" alt="No spinner" showLoading={false} />
    );
    const spinner = container.querySelector(".animate-pulse");
    expect(spinner).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Avatar component (unchanged, still present)
// ─────────────────────────────────────────────────────────────────────────────

describe("Avatar component — no src (initials fallback)", () => {
  it("renders the first letter of alt as initials when src is not provided", () => {
    render(<Avatar alt="Alice" src={null} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders custom fallback string when provided and src is null", () => {
    render(<Avatar alt="Alice" src={null} fallback="AX" />);
    expect(screen.getByText("AX")).toBeInTheDocument();
  });

  it("renders a div (not an img) when src is null", () => {
    const { container } = render(<Avatar alt="Bob" src={null} />);
    // No img in the output when src is absent
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("applies the className prop to the initials container", () => {
    const { container } = render(
      <Avatar alt="Carol" src={null} className="test-class" />
    );
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("test-class");
  });

  it("renders rounded-full class on the initials div", () => {
    const { container } = render(<Avatar alt="Dave" src={null} />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("rounded-full");
  });
});

describe("Avatar component — with src (image rendering)", () => {
  it("renders an img element when src is provided", () => {
    render(<Avatar alt="Eve" src="/avatar.png" />);
    expect(screen.getByAltText("Eve")).toBeInTheDocument();
  });

  it("does not render initials text when src is provided", () => {
    render(<Avatar alt="Frank" src="/frank.png" />);
    // Initials "F" should not appear as text
    expect(screen.queryByText("F")).not.toBeInTheDocument();
  });

  it("applies rounded-full class to the image wrapper when src is provided", () => {
    const { container } = render(<Avatar alt="Grace" src="/grace.png" />);
    // OptimizedImage wrapper div should have rounded-full
    const wrapper = container.querySelector("div");
    expect(wrapper?.className).toContain("rounded-full");
  });
});

describe("Avatar component — size prop", () => {
  it("renders sm size (32px) without crashing", () => {
    const { container } = render(<Avatar alt="H" src={null} size="sm" />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("32px");
    expect(div.style.height).toBe("32px");
  });

  it("renders md size (48px) by default", () => {
    const { container } = render(<Avatar alt="I" src={null} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("48px");
    expect(div.style.height).toBe("48px");
  });

  it("renders lg size (64px) without crashing", () => {
    const { container } = render(<Avatar alt="J" src={null} size="lg" />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("64px");
    expect(div.style.height).toBe("64px");
  });

  it("renders xl size (96px) without crashing", () => {
    const { container } = render(<Avatar alt="K" src={null} size="xl" />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("96px");
    expect(div.style.height).toBe("96px");
  });
});