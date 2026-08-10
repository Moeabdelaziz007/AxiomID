/**
 * Tests for src/app/page.tsx (PR rewrite)
 *
 * The landing page was converted from a "use client" component driven by
 * wallet/language contexts into an async Server Component that:
 * - derives the active language from the `accept-language` request header
 *   (via `headers()` from "next/headers"), defaulting to "en" unless the
 *   header starts with "ar"
 * - exports `generateMetadata()` using the same header-derived language to
 *   build the page title/description via `getTranslation`
 * - delegates header/nav UI to a new `<Header />` component
 * - drops the old "Why AxiomID?" comparison section and inline JSON-LD script
 * - changes hero copy/CTAs to "Create your AI Identity" / "Create My AI Agent"
 *   linking to "/claim"
 *
 * Since `Home` is an async Server Component, it cannot be rendered directly
 * via JSX in a browser-like test — but because it is just an async function
 * returning a React element tree, we can `await` it and pass the resolved
 * element into React Testing Library's `render()`.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { headers } from "next/headers";
import Home, { generateMetadata } from "@/app/page";
import { useLanguage } from "@/app/context/language-context";
import { getTranslation } from "@/i18n";

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

const mockHeaders = headers as unknown as jest.Mock;

// The global jest.setup.js mock's t() only knows a hardcoded whitelist and
// returns raw keys for everything else (other suites rely on that). Scope a
// real-translation override to THIS suite so Aura OS keys ("aura_os", "live")
// render actual strings here without touching the global mock.
function mockUseLanguage(lang: "en" | "ar") {
  (useLanguage as jest.Mock).mockReturnValue({
    language: lang,
    setLanguage: jest.fn(),
    t: (key: string) => getTranslation(lang, key),
  });
}

function mockAcceptLanguage(value: string | null) {
  mockHeaders.mockResolvedValue({
    get: (name: string) => (name === "accept-language" ? value : null),
  });
}

describe("generateMetadata — language detection from accept-language header", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds English metadata when accept-language is absent", async () => {
    mockAcceptLanguage(null);
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("Aura OS — Sovereign AI Desktop");
  });

  it("builds English metadata when accept-language does not start with 'ar'", async () => {
    mockAcceptLanguage("en-US,en;q=0.9");
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("Aura OS — Sovereign AI Desktop");
  });

  it("builds Arabic metadata when accept-language starts with 'ar'", async () => {
    mockAcceptLanguage("ar-EG,ar;q=0.9");
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("أورا أو إس — سطح المكتب السيادي للذكاء الاصطناعي");
  });

  it("includes the tagline in the description", async () => {
    mockAcceptLanguage("en-US");
    const metadata = await generateMetadata();
    expect(metadata.description).toBe(
      "Your sovereign AI desktop on the Pi Network. Launch agents, manage identity, explore memory — all from one shell."
    );
  });

  it("uses the Arabic tagline as description when language is Arabic", async () => {
    mockAcceptLanguage("ar");
    const metadata = await generateMetadata();
    expect(metadata.description).toBe(
      "سطح المكتب السيادي الخاص بك على شبكة باي. أطلق الوكلاء، أدر الهوية، استكشف الذاكرة — كل ذلك من واجهة واحدة."
    );
  });
});

describe("Home — rendering with English (default) language", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockAcceptLanguage("en-US,en;q=0.9");
    mockUseLanguage("en");
  });

  it("wires the WorkspaceGrid icon grid into the page", async () => {
    render(await Home());
    expect(screen.getByText(/workspace — capabilities/i)).toBeInTheDocument();
  });

  it("wires the Aura OS dock into the page", async () => {
    render(await Home());
    expect(screen.getByRole("navigation", { name: /aura os/i })).toBeInTheDocument();
  });

  it("renders the ambient dataflow animation canvas", async () => {
    render(await Home());
    const iframe = document.querySelector("iframe[src='/dataflow/dataflow-animation.html']");
    expect(iframe).not.toBeNull();
    expect(iframe).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Home — rendering with Arabic language", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAcceptLanguage("ar-EG,ar;q=0.9");
    mockUseLanguage("ar");
  });

  it("wires the WorkspaceGrid into the Arabic-rendered page", async () => {
    render(await Home());
    expect(screen.getByText(/مساحة العمل — القدرات/i)).toBeInTheDocument();
  });
});