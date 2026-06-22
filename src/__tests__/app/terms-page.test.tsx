/**
 * Tests for src/app/terms/page.tsx
 *
 * PR change: The Terms page now uses useLanguage() for all text content
 * instead of hardcoded English strings.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import Terms from "@/app/terms/page";

// Mock Header and Footer to isolate page content
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

// The global mock returns the key string for any key not in the mockDict.
// All terms_* keys are new in this PR, so they'll be returned as their key names.

describe("Terms page — useLanguage() i18n (PR change)", () => {
  it("renders without crashing", () => {
    expect(() => render(<Terms />)).not.toThrow();
  });

  it("renders the terms_legal translation key (badge)", () => {
    render(<Terms />);
    expect(screen.getByText("terms_legal")).toBeInTheDocument();
  });

  it("renders the terms_last_updated translation key", () => {
    render(<Terms />);
    expect(screen.getByText("terms_last_updated")).toBeInTheDocument();
  });

  it("renders the terms_subtitle translation key as subtitle", () => {
    render(<Terms />);
    expect(screen.getByText("terms_subtitle")).toBeInTheDocument();
  });

  it("renders the terms_use translation key (Use of Service heading)", () => {
    render(<Terms />);
    expect(screen.getByText("terms_use")).toBeInTheDocument();
  });

  it("renders the terms_use_desc translation key", () => {
    render(<Terms />);
    expect(screen.getByText("terms_use_desc")).toBeInTheDocument();
  });

  it("renders the terms_wallet translation key (Wallet Connection heading)", () => {
    render(<Terms />);
    expect(screen.getByText("terms_wallet")).toBeInTheDocument();
  });

  it("renders the terms_wallet_desc translation key", () => {
    render(<Terms />);
    expect(screen.getByText("terms_wallet_desc")).toBeInTheDocument();
  });

  it("renders the terms_ai_agent translation key (AI Agent Verification heading)", () => {
    render(<Terms />);
    expect(screen.getByText("terms_ai_agent")).toBeInTheDocument();
  });

  it("renders the terms_ai_agent_desc translation key", () => {
    render(<Terms />);
    expect(screen.getByText("terms_ai_agent_desc")).toBeInTheDocument();
  });

  it("renders the terms_liability translation key (Limitation heading)", () => {
    render(<Terms />);
    expect(screen.getByText("terms_liability")).toBeInTheDocument();
  });

  it("renders the terms_liability_desc translation key", () => {
    render(<Terms />);
    expect(screen.getByText("terms_liability_desc")).toBeInTheDocument();
  });

  it("renders the terms_changes translation key (Changes heading)", () => {
    render(<Terms />);
    expect(screen.getByText("terms_changes")).toBeInTheDocument();
  });

  it("renders the terms_changes_desc translation key", () => {
    render(<Terms />);
    expect(screen.getByText("terms_changes_desc")).toBeInTheDocument();
  });

  it("has five content sections (Use, Wallet, AI Agent, Liability, Changes)", () => {
    const { container } = render(<Terms />);
    const sections = container.querySelectorAll("section");
    expect(sections).toHaveLength(5);
  });

  it("all section headings are rendered as h2 elements", () => {
    const { container } = render(<Terms />);
    const h2s = container.querySelectorAll("h2");
    expect(h2s.length).toBeGreaterThanOrEqual(5);
  });

  it("terms_title is rendered and split for the gradient heading", () => {
    render(<Terms />);
    // terms_title = "terms_title" (key returned by global mock)
    // The component splits it: slice(0, -1).join(" ") and slice(-1)[0]
    // So "terms_title" → slice(0,-1) = [] → "" and slice(-1) = ["terms_title"]
    // The last word is rendered in a styled span
    const titleEl = document.querySelector("h1");
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toContain("terms_title");
  });
});

describe("Terms page — no hardcoded strings (PR change)", () => {
  it("does not render old hardcoded heading 'Use of Service'", () => {
    render(<Terms />);
    expect(screen.queryByText("Use of Service")).toBeNull();
  });

  it("does not render old hardcoded heading 'Wallet Connection'", () => {
    render(<Terms />);
    expect(screen.queryByText("Wallet Connection")).toBeNull();
  });

  it("does not render old hardcoded heading 'AI Agent Verification'", () => {
    render(<Terms />);
    expect(screen.queryByText("AI Agent Verification")).toBeNull();
  });

  it("does not render old hardcoded heading 'Limitation of Liability'", () => {
    render(<Terms />);
    expect(screen.queryByText("Limitation of Liability")).toBeNull();
  });

  it("does not render old hardcoded heading 'Changes to Terms'", () => {
    render(<Terms />);
    expect(screen.queryByText("Changes to Terms")).toBeNull();
  });

  it("does not render old hardcoded 'LEGAL' badge text", () => {
    render(<Terms />);
    // Global mock returns "terms_legal" not "LEGAL", so "LEGAL" should not appear
    expect(screen.queryByText("LEGAL")).toBeNull();
  });

  it("does not render old hardcoded subtitle text", () => {
    render(<Terms />);
    expect(
      screen.queryByText("By using AxiomID, you agree to these terms.")
    ).toBeNull();
  });
});

describe("Terms page — real translation values (PR change)", () => {
  // Use jest.requireActual to access real translations without affecting the mock
  it("t('terms_title') in real translations.en is 'Terms of Service'", () => {
    const { translations } = jest.requireActual("@/app/context/language-context") as {
      translations: Record<string, Record<string, string>>;
    };
    expect(translations.en["terms_title"]).toBe("Terms of Service");
  });

  it("t('terms_subtitle') in real translations.en mentions AxiomID", () => {
    const { translations } = jest.requireActual("@/app/context/language-context") as {
      translations: Record<string, Record<string, string>>;
    };
    expect(translations.en["terms_subtitle"]).toContain("AxiomID");
  });

  it("t('terms_use') in real translations.en is 'Use of Service'", () => {
    const { translations } = jest.requireActual("@/app/context/language-context") as {
      translations: Record<string, Record<string, string>>;
    };
    expect(translations.en["terms_use"]).toBe("Use of Service");
  });

  it("t('terms_wallet') in real translations.en is 'Wallet Connection'", () => {
    const { translations } = jest.requireActual("@/app/context/language-context") as {
      translations: Record<string, Record<string, string>>;
    };
    expect(translations.en["terms_wallet"]).toBe("Wallet Connection");
  });
});