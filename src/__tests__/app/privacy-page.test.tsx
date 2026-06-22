/**
 * Tests for src/app/privacy/page.tsx
 *
 * PR change: The Privacy page now uses useLanguage() for all text content
 * instead of hardcoded English strings.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import Privacy from "@/app/privacy/page";

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

// The global jest.setup.js mock for language-context returns keys as text
// for any unknown key. The privacy_* keys are new in this PR, so the global
// mock returns the key string itself (e.g., "privacy_legal"), which allows us
// to verify that t() is called with the correct key.
// For the new keys added in this PR the mock dict does NOT have them, so the
// mock falls back to returning the key name as text.

describe("Privacy page — useLanguage() i18n (PR change)", () => {
  it("renders without crashing", () => {
    expect(() => render(<Privacy />)).not.toThrow();
  });

  it("renders the privacy_legal translation key", () => {
    render(<Privacy />);
    // The global mock returns "privacy_legal" for this key
    expect(screen.getByText("privacy_legal")).toBeInTheDocument();
  });

  it("renders the privacy_last_updated translation key", () => {
    render(<Privacy />);
    expect(screen.getByText("privacy_last_updated")).toBeInTheDocument();
  });

  it("renders the privacy_info_collect translation key (section heading)", () => {
    render(<Privacy />);
    expect(screen.getByText("privacy_info_collect")).toBeInTheDocument();
  });

  it("renders the privacy_info_collect_desc translation key", () => {
    render(<Privacy />);
    expect(screen.getByText("privacy_info_collect_desc")).toBeInTheDocument();
  });

  it("renders the privacy_how_use translation key (section heading)", () => {
    render(<Privacy />);
    expect(screen.getByText("privacy_how_use")).toBeInTheDocument();
  });

  it("renders the privacy_how_use_desc translation key", () => {
    render(<Privacy />);
    expect(screen.getByText("privacy_how_use_desc")).toBeInTheDocument();
  });

  it("renders the privacy_data_storage translation key (section heading)", () => {
    render(<Privacy />);
    expect(screen.getByText("privacy_data_storage")).toBeInTheDocument();
  });

  it("renders the privacy_data_storage_desc translation key", () => {
    render(<Privacy />);
    expect(screen.getByText("privacy_data_storage_desc")).toBeInTheDocument();
  });

  it("renders the privacy_rights translation key (section heading)", () => {
    render(<Privacy />);
    expect(screen.getByText("privacy_rights")).toBeInTheDocument();
  });

  it("renders the privacy_rights_desc translation key", () => {
    render(<Privacy />);
    expect(screen.getByText("privacy_rights_desc")).toBeInTheDocument();
  });

  it("renders the privacy_title translation key in the main heading", () => {
    render(<Privacy />);
    expect(screen.getByText("privacy_title")).toBeInTheDocument();
  });

  it("renders the privacy_subtitle translation key as subtitle text", () => {
    render(<Privacy />);
    // privacy_subtitle appears in two places (heading + subtitle paragraph)
    const subtitleEls = screen.getAllByText("privacy_subtitle");
    expect(subtitleEls.length).toBeGreaterThanOrEqual(1);
  });

  it("has four content sections (Info, How We Use, Data Storage, Your Rights)", () => {
    const { container } = render(<Privacy />);
    const sections = container.querySelectorAll("section");
    expect(sections).toHaveLength(4);
  });

  it("all section headings are rendered as h2 elements", () => {
    const { container } = render(<Privacy />);
    const h2s = container.querySelectorAll("h2");
    // Four section headings
    expect(h2s.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Privacy page — i18n rendering with real translations", () => {
  it("uses t() calls for all visible text (no hardcoded English strings)", () => {
    // With the default global mock that returns the key as text,
    // none of the original hardcoded strings should appear
    render(<Privacy />);

    // Old hardcoded strings from before the PR
    expect(screen.queryByText("LEGAL")).toBeNull();
    expect(screen.queryByText("Last updated: May 17, 2026")).toBeNull();
    expect(screen.queryByText("Information We Collect")).toBeNull();
    expect(screen.queryByText("How We Use Information")).toBeNull();
    expect(screen.queryByText("Data Storage & Security")).toBeNull();
    expect(screen.queryByText("Your Rights")).toBeNull();
  });
});

describe("Privacy page — real translation values (PR change)", () => {
  // Use jest.requireActual to access real translations without unmocking
  it("t('privacy_legal') in real translations.en is 'LEGAL'", () => {
    const { translations } = jest.requireActual("@/app/context/language-context") as {
      translations: Record<string, Record<string, string>>;
    };
    expect(translations.en["privacy_legal"]).toBe("LEGAL");
  });

  it("t('privacy_title') in real translations.en is 'Privacy'", () => {
    const { translations } = jest.requireActual("@/app/context/language-context") as {
      translations: Record<string, Record<string, string>>;
    };
    expect(translations.en["privacy_title"]).toBe("Privacy");
  });

  it("t('privacy_info_collect') in real translations.en is 'Information We Collect'", () => {
    const { translations } = jest.requireActual("@/app/context/language-context") as {
      translations: Record<string, Record<string, string>>;
    };
    expect(translations.en["privacy_info_collect"]).toBe("Information We Collect");
  });

  it("t('privacy_rights') in real translations.en is 'Your Rights'", () => {
    const { translations } = jest.requireActual("@/app/context/language-context") as {
      translations: Record<string, Record<string, string>>;
    };
    expect(translations.en["privacy_rights"]).toBe("Your Rights");
  });
});