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

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

// The Agent Control Center landing is a "use client" composition of live
// agent/intent/memory sections (covered by their own component suites). It
// is stubbed here so this suite only asserts that page.tsx wires it in.
jest.mock("@/components/landing/LazyControlCenter", () => ({
  __esModule: true,
  LazyControlCenter: () => <div data-testid="lazy-control-center-stub" />,
}));

const mockHeaders = headers as unknown as jest.Mock;

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
    expect(metadata.title).toBe("AxiomID — Agent Control Center");
  });

  it("builds English metadata when accept-language does not start with 'ar'", async () => {
    mockAcceptLanguage("en-US,en;q=0.9");
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("AxiomID — Agent Control Center");
  });

  it("builds Arabic metadata when accept-language starts with 'ar'", async () => {
    mockAcceptLanguage("ar-EG,ar;q=0.9");
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("مجمّع النوايا — مركز التحكم في العملاء");
  });

  it("includes the tagline in the description", async () => {
    mockAcceptLanguage("en-US");
    const metadata = await generateMetadata();
    expect(metadata.description).toBe(
      "Prove human intent behind AI actions. One DID, infinite agents, cryptographic proof — live network state."
    );
  });

  it("uses the Arabic tagline as description when language is Arabic", async () => {
    mockAcceptLanguage("ar");
    const metadata = await generateMetadata();
    expect(metadata.description).toBe(
      "أثبت النية الإنسانية خلف إجراءات الذكاء الاصطناعي. هوية واحدة، عملاء بلا حدود، إثبات تشفيري — حالة شبكة حية."
    );
  });
});

describe("Home — rendering with English (default) language", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockAcceptLanguage("en-US,en;q=0.9");
  });

  it("wires the LazyControlCenter Agent Control Center into the page", async () => {
    render(await Home());
    expect(screen.getByTestId("lazy-control-center-stub")).toBeInTheDocument();
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
  });

  it("wires the Agent Control Center into the Arabic-rendered page", async () => {
    render(await Home());
    expect(screen.getByTestId("lazy-control-center-stub")).toBeInTheDocument();
  });
});