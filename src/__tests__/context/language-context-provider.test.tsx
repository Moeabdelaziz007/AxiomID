/**
 * Tests for src/app/context/language-context.tsx — LanguageProvider / useLanguage
 *
 * PR change: the context was refactored from a ~1200-line inline translations
 * object to a thin provider that:
 * - Initializes language from localStorage("aix_language"), defaulting to "en"
 * - Persists language changes back to localStorage via setLanguage()
 * - Syncs document.documentElement.dir/lang on language change
 * - Delegates t(key) to getTranslation(language, key) from "@/i18n"
 * - Still throws when useLanguage() is used outside a LanguageProvider
 *
 * jest.setup.js globally mocks useLanguage for other test files, so this file
 * unmocks the module to exercise the real provider implementation.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";

jest.unmock("@/app/context/language-context");

import { LanguageProvider, useLanguage } from "@/app/context/language-context";

function Consumer() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="translated">{t("dashboard_title")}</span>
      <span data-testid="unknown-key">{t("this_key_does_not_exist_anywhere")}</span>
      <button onClick={() => setLanguage("ar")}>Switch to Arabic</button>
      <button onClick={() => setLanguage("en")}>Switch to English</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dir = "";
  document.documentElement.lang = "";
});

describe("LanguageProvider — initialization", () => {
  it("defaults to English when localStorage has no saved language", () => {
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("language")).toHaveTextContent("en");
  });

  it("initializes from a saved 'ar' value in localStorage", () => {
    localStorage.setItem("aix_language", "ar");
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("language")).toHaveTextContent("ar");
  });

  it("falls back to English when localStorage has an invalid language value", () => {
    localStorage.setItem("aix_language", "fr");
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("language")).toHaveTextContent("en");
  });

  it("sets document.documentElement.lang/dir to match the initial language", () => {
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });
});

describe("LanguageProvider — setLanguage", () => {
  it("updates the language state and persists it to localStorage", () => {
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    act(() => {
      screen.getByText("Switch to Arabic").click();
    });

    expect(screen.getByTestId("language")).toHaveTextContent("ar");
    expect(localStorage.getItem("aix_language")).toBe("ar");
  });

  it("updates document.documentElement.dir to 'rtl' and lang to 'ar' when switching to Arabic", () => {
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    act(() => {
      screen.getByText("Switch to Arabic").click();
    });

    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
  });

  it("switches back to 'ltr'/'en' when toggling back to English", () => {
    localStorage.setItem("aix_language", "ar");
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    act(() => {
      screen.getByText("Switch to English").click();
    });

    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("aix_language")).toBe("en");
  });
});

describe("LanguageProvider — t() translation delegation", () => {
  it("resolves a known key to its English translation via getTranslation", () => {
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("translated")).toHaveTextContent("AxiomID Dashboard");
  });

  it("resolves the same key to its Arabic translation after switching language", () => {
    localStorage.setItem("aix_language", "ar");
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );
    const arValue = screen.getByTestId("translated").textContent;
    expect(arValue).not.toBe("AxiomID Dashboard");
    expect(arValue?.length).toBeGreaterThan(0);
  });

  it("falls back to the key itself for an unknown translation key", () => {
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("unknown-key")).toHaveTextContent(
      "this_key_does_not_exist_anywhere"
    );
  });
});

describe("useLanguage — outside provider", () => {
  it("throws an error when used without a LanguageProvider ancestor", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow(
      "useLanguage must be used within a LanguageProvider"
    );

    consoleErrorSpy.mockRestore();
  });
});