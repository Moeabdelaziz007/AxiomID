/**
 * Tests for src/components/LanguageToggle.tsx
 *
 * PR change: Updated className to add min-h-[44px] min-w-[44px] justify-center
 * for improved mobile touch target compliance (WCAG 2.5.5 / iOS HIG).
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LanguageToggle from "@/components/LanguageToggle";

// useLanguage is globally mocked in jest.setup.js, but we need to control it per-test
jest.mock("@/app/context/language-context", () => ({
  useLanguage: jest.fn(),
}));

import { useLanguage } from "@/app/context/language-context";
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

function makeLanguageCtx(overrides: { language?: "en" | "ar" | "zh" | "hi"; setLanguage?: jest.Mock; t?: (key: string) => string } = {}) {
  return {
    language: "en" as "en" | "ar" | "zh" | "hi",
    setLanguage: jest.fn(),
    t: (key: string) => key,
    ...overrides,
  };
}

describe("LanguageToggle — rendering", () => {
  it("renders a button with aria-label 'Toggle language'", () => {
    mockUseLanguage.mockReturnValue(makeLanguageCtx());
    render(<LanguageToggle />);
    expect(screen.getByRole("button", { name: /toggle language/i })).toBeInTheDocument();
  });

  it("shows current language native name ('English') when language is 'en'", () => {
    mockUseLanguage.mockReturnValue(makeLanguageCtx({ language: "en" }));
    render(<LanguageToggle />);
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("renders the Globe icon", () => {
    mockUseLanguage.mockReturnValue(makeLanguageCtx());
    const { container } = render(<LanguageToggle />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

describe("LanguageToggle — interaction", () => {
  it("shows all four languages in the list when opened", () => {
    mockUseLanguage.mockReturnValue(makeLanguageCtx({ language: "en" }));
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button", { name: /toggle language/i }));
    expect(screen.getByText("العربية")).toBeInTheDocument();
    expect(screen.getByText("简体中文")).toBeInTheDocument();
    expect(screen.getByText("हिन्दी")).toBeInTheDocument();
  });

  it("calls setLanguage with 'hi' when 'हिन्दी' is clicked", () => {
    const setLanguage = jest.fn();
    mockUseLanguage.mockReturnValue(makeLanguageCtx({ language: "en", setLanguage }));
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button", { name: /toggle language/i }));
    fireEvent.click(screen.getByText("हिन्दी"));
    expect(setLanguage).toHaveBeenCalledWith("hi");
    expect(setLanguage).toHaveBeenCalledTimes(1);
  });

  it("calls setLanguage with 'zh' when '简体中文' is clicked", () => {
    const setLanguage = jest.fn();
    mockUseLanguage.mockReturnValue(makeLanguageCtx({ language: "en", setLanguage }));
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button", { name: /toggle language/i }));
    fireEvent.click(screen.getByText("简体中文"));
    expect(setLanguage).toHaveBeenCalledWith("zh");
  });
});

describe("LanguageToggle — touch target (PR change: min-h-[44px] min-w-[44px])", () => {
  it("button has min-h-[44px] class for touch target compliance", () => {
    mockUseLanguage.mockReturnValue(makeLanguageCtx());
    render(<LanguageToggle />);
    const btn = screen.getByRole("button", { name: /toggle language/i });
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("button has min-w-[44px] class for touch target compliance", () => {
    mockUseLanguage.mockReturnValue(makeLanguageCtx());
    render(<LanguageToggle />);
    const btn = screen.getByRole("button", { name: /toggle language/i });
    expect(btn.className).toContain("min-w-[44px]");
  });

  it("button has justify-center class (PR change: centering with explicit sizing)", () => {
    mockUseLanguage.mockReturnValue(makeLanguageCtx());
    render(<LanguageToggle />);
    const btn = screen.getByRole("button", { name: /toggle language/i });
    expect(btn.className).toContain("justify-center");
  });

  it("button has py-2 padding (PR change from py-1.5)", () => {
    mockUseLanguage.mockReturnValue(makeLanguageCtx());
    render(<LanguageToggle />);
    const btn = screen.getByRole("button", { name: /toggle language/i });
    expect(btn.className).toContain("py-2");
  });
});