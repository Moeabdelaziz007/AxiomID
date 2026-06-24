/**
 * Tests for src/app/docs/page.tsx
 *
 * PR change covered:
 * - SDK API reference entry renamed from searchAgents(query) → searchSkills(query)
 * - Return type changed from Promise<Agent[]> → Promise<Skill[]>
 * - English description updated: "Search agents by name..." → "Search skills by name..."
 * - Arabic description updated: "البحث عن عملاء..." → "البحث عن مهارات..."
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DocsPage from "@/app/docs/page";

// Mock Header and Footer to isolate page content tests
jest.mock("@/components/Header", () => {
  const Header = () => null;
  Header.displayName = "Header";
  return Header;
});
jest.mock("@/components/Footer", () => {
  const Footer = () => null;
  Footer.displayName = "Footer";
  return Footer;
});

// Mock CodeBlock to avoid syntax-highlighting dependencies
jest.mock("@/components/ui/CodeBlock", () => {
  const CodeBlock = ({ code }: { code: string }) => <pre>{code}</pre>;
  CodeBlock.displayName = "CodeBlock";
  return CodeBlock;
});

// Mock lucide-react icons used in the sidebar navigation
jest.mock("lucide-react", () => ({
  BookOpen: () => <svg data-testid="icon-book-open" />,
  Key: () => <svg data-testid="icon-key" />,
  Cpu: () => <svg data-testid="icon-cpu" />,
  HelpCircle: () => <svg data-testid="icon-help-circle" />,
  Search: () => <svg data-testid="icon-search" />,
}));

// The global jest.setup.js mock returns language: "en" by default.
// DocsPage checks `language === "en"` directly (not t()) for the SDK method
// descriptions, so the global mock's language:"en" is sufficient.

/** Navigate to the SDK section in the rendered docs page. */
function navigateToSdkSection() {
  // The SDK section button text depends on language; with language:"en" the global
  // mock returns "en", so the button shows sec.en = "3. SDK & Integration"
  const sdkButton = screen.getByRole("button", { name: /SDK/i });
  fireEvent.click(sdkButton);
}

describe("DocsPage — SDK section searchSkills rename (PR change)", () => {
  it("renders without crashing", () => {
    expect(() => render(<DocsPage />)).not.toThrow();
  });

  it("renders the SDK & Integration section when the SDK nav button is clicked", () => {
    render(<DocsPage />);
    navigateToSdkSection();
    expect(screen.getByText(/SDK & Integration/i)).toBeInTheDocument();
  });

  it("SDK section displays 'searchSkills(query)' method (PR change: renamed from searchAgents)", () => {
    render(<DocsPage />);
    navigateToSdkSection();
    expect(screen.getByText("searchSkills(query)")).toBeInTheDocument();
  });

  it("SDK section does NOT display the old 'searchAgents(query)' method name (PR change)", () => {
    render(<DocsPage />);
    navigateToSdkSection();
    expect(screen.queryByText("searchAgents(query)")).not.toBeInTheDocument();
  });

  it("SDK section displays 'Promise<Skill[]>' return type (PR change: was Promise<Agent[]>)", () => {
    render(<DocsPage />);
    navigateToSdkSection();
    expect(screen.getByText("Promise<Skill[]>")).toBeInTheDocument();
  });

  it("SDK section does NOT display old 'Promise<Agent[]>' return type (PR change)", () => {
    render(<DocsPage />);
    navigateToSdkSection();
    expect(screen.queryByText("Promise<Agent[]>")).not.toBeInTheDocument();
  });

  it("SDK section shows English description mentioning 'skills' for searchSkills (PR change)", () => {
    render(<DocsPage />);
    navigateToSdkSection();
    expect(
      screen.getByText("Search skills by name, description, or capabilities")
    ).toBeInTheDocument();
  });

  it("SDK section does NOT show old 'Search agents by name' description (PR change)", () => {
    render(<DocsPage />);
    navigateToSdkSection();
    expect(
      screen.queryByText("Search agents by name, description, or capabilities")
    ).not.toBeInTheDocument();
  });

  it("SDK section still contains the four unchanged API methods", () => {
    render(<DocsPage />);
    navigateToSdkSection();

    expect(screen.getByText("verifyPassport(slug)")).toBeInTheDocument();
    expect(screen.getByText("getStamps(slug)")).toBeInTheDocument();
    expect(screen.getByText("resolveDID(did)")).toBeInTheDocument();
    expect(screen.getByText("getTrustScore(did)")).toBeInTheDocument();
  });

  it("SDK section contains exactly five API method entries (no extras, no duplicates)", () => {
    const { container } = render(<DocsPage />);
    navigateToSdkSection();

    // Each method entry has a <code> element with text-neon-green class
    const methodCodes = container.querySelectorAll("code.text-neon-green");
    // Five methods: verifyPassport, getStamps, resolveDID, getTrustScore, searchSkills
    expect(methodCodes).toHaveLength(5);
  });
});

describe("DocsPage — SDK section Arabic language (PR change)", () => {
  it("shows Arabic description for searchSkills when language is Arabic", () => {
    // Override the global useLanguage mock for this test to use Arabic
    const { useLanguage } = jest.requireMock(
      "@/app/context/language-context"
    ) as { useLanguage: jest.Mock };
    useLanguage.mockReturnValueOnce({
      language: "ar",
      setLanguage: jest.fn(),
      t: (key: string) => key,
    });

    render(<DocsPage />);
    // Navigate: with language:"ar" the button shows sec.ar = "٣. مكتبة المطورين"
    const sdkButton = screen.getByRole("button", { name: /مكتبة/i });
    fireEvent.click(sdkButton);

    // Arabic description for searchSkills uses "مهارات" (skills)
    expect(
      screen.getByText("البحث عن مهارات بالاسم أو الوصف أو القدرات")
    ).toBeInTheDocument();
  });

  it("Arabic description does NOT contain 'عملاء' (agents) for searchSkills (PR change)", () => {
    const { useLanguage } = jest.requireMock(
      "@/app/context/language-context"
    ) as { useLanguage: jest.Mock };
    useLanguage.mockReturnValueOnce({
      language: "ar",
      setLanguage: jest.fn(),
      t: (key: string) => key,
    });

    render(<DocsPage />);
    const sdkButton = screen.getByRole("button", { name: /مكتبة/i });
    fireEvent.click(sdkButton);

    expect(
      screen.queryByText("البحث عن عملاء بالاسم أو الوصف أو القدرات")
    ).not.toBeInTheDocument();
  });
});

describe("DocsPage — SDK section does not appear in non-SDK sections (regression)", () => {
  it("searchSkills method is not visible in the intro section (default view)", () => {
    render(<DocsPage />);
    // Default section is "intro" — searchSkills method should not be rendered
    expect(screen.queryByText("searchSkills(query)")).not.toBeInTheDocument();
  });

  it("navigating away from SDK section hides searchSkills method", () => {
    render(<DocsPage />);
    navigateToSdkSection();
    expect(screen.getByText("searchSkills(query)")).toBeInTheDocument();

    // Navigate to a different section (stamps)
    const stampsButton = screen.getByRole("button", { name: /stamp/i });
    fireEvent.click(stampsButton);

    expect(screen.queryByText("searchSkills(query)")).not.toBeInTheDocument();
  });
});