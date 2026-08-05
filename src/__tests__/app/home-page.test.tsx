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

jest.mock("@/components/Header", () => ({
  __esModule: true,
  default: () => <div data-testid="header-stub" />,
}));

jest.mock("@/components/Footer", () => ({
  __esModule: true,
  default: () => <div data-testid="footer-stub" />,
}));

jest.mock("@/components/TrustTiers", () => ({
  __esModule: true,
  default: () => <div data-testid="trust-tiers-stub" />,
}));

jest.mock("@/components/StatsBar", () => ({
  __esModule: true,
  default: () => <div data-testid="stats-bar-stub" />,
}));

jest.mock("@/components/landing/InteractiveShowcase", () => ({
  __esModule: true,
  default: () => <div data-testid="interactive-showcase-stub" />,
}));

// InteractiveCommandDemo (PR addition) is a "use client" component with its
// own internal state/animation logic, covered separately in
// InteractiveCommandDemo.test.tsx. It is stubbed here so this suite only
// asserts that page.tsx wires it into the page.
jest.mock("@/components/landing/InteractiveCommandDemo", () => ({
  __esModule: true,
  default: () => <div data-testid="interactive-command-demo-stub" />,
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
    expect(metadata.title).toBe("Your Identity. Your Rules.");
  });

  it("builds English metadata when accept-language does not start with 'ar'", async () => {
    mockAcceptLanguage("en-US,en;q=0.9");
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("Your Identity. Your Rules.");
  });

  it("builds Arabic metadata when accept-language starts with 'ar'", async () => {
    mockAcceptLanguage("ar-EG,ar;q=0.9");
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("هويتك. قوانينك.");
  });

  it("includes the tagline in the description", async () => {
    mockAcceptLanguage("en-US");
    const metadata = await generateMetadata();
    expect(metadata.description).toBe(
      "No permission needed. One DID. Infinite agents. Cryptographic proof of human intent."
    );
  });

  it("uses the Arabic tagline as description when language is Arabic", async () => {
    mockAcceptLanguage("ar");
    const metadata = await generateMetadata();
    expect(metadata.description).toBe(
      "بدون تصريح. هوية واحدة. عملاء لا نهائية. إثبات تشفيري لنية البشر."
    );
  });
});

describe("Home — rendering with English (default) language", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockAcceptLanguage("en-US,en;q=0.9");
  });

  it("renders the Header, Footer, and StatsBar stubs", async () => {
    render(await Home());
    expect(screen.getByTestId("header-stub")).toBeInTheDocument();
    expect(screen.getByTestId("footer-stub")).toBeInTheDocument();
    expect(screen.getByTestId("stats-bar-stub")).toBeInTheDocument();
  });

  it("renders the InteractiveShowcase and TrustTiers sections", async () => {
    render(await Home());
    expect(screen.getByTestId("interactive-showcase-stub")).toBeInTheDocument();
    expect(screen.getByTestId("trust-tiers-stub")).toBeInTheDocument();
  });

  it("renders the InteractiveCommandDemo section (PR addition)", async () => {
    render(await Home());
    expect(screen.getByTestId("interactive-command-demo-stub")).toBeInTheDocument();
  });

  it("renders InteractiveCommandDemo after InteractiveShowcase in document order", async () => {
    render(await Home());
    const showcase = screen.getByTestId("interactive-showcase-stub");
    const commandDemo = screen.getByTestId("interactive-command-demo-stub");
    // DOCUMENT_POSITION_FOLLOWING (4) means commandDemo comes after showcase
    expect(showcase.compareDocumentPosition(commandDemo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders the new hero headline", async () => {
    render(await Home());
    expect(screen.getByText("Your Identity.")).toBeInTheDocument();
    expect(screen.getByText("Your Rules.")).toBeInTheDocument();
  });

  it("renders the primary CTA linking to /claim", async () => {
    render(await Home());
    const cta = screen.getByText("Create My AI Agent").closest("a");
    expect(cta).toHaveAttribute("href", "/claim");
  });

  it("renders the secondary CTA linking to /docs", async () => {
    render(await Home());
    const secondaryCta = screen.getByText("Explore the Protocol").closest("a");
    expect(secondaryCta).toHaveAttribute("href", "/docs");
  });

  it("renders the translated pi badge text", async () => {
    render(await Home());
    expect(screen.getByText("Pi Network Mainnet Ready")).toBeInTheDocument();
  });

  it("renders the three-step 'How It Works' section using translated strings", async () => {
    render(await Home());
    expect(screen.getByText("Three Steps to Agent Identity")).toBeInTheDocument();
    expect(screen.getByText("Connect")).toBeInTheDocument();
    expect(screen.getByText("Verify")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
  });

  it("renders the trust tier section header", async () => {
    render(await Home());
    expect(screen.getByText("Level Up Your Identity")).toBeInTheDocument();
  });
});

describe("Home — rendering with Arabic language", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAcceptLanguage("ar-EG,ar;q=0.9");
  });

  it("renders the Arabic pi badge translation", async () => {
    render(await Home());
    expect(screen.getByText("جاهز لشبكة Pi الرئيسية")).toBeInTheDocument();
  });

  it("renders the Arabic 'How It Works' section title", async () => {
    render(await Home());
    expect(screen.getByText("ثلاث خطوات لبناء هوية العميل")).toBeInTheDocument();
  });
});