/**
 * Tests for src/app/page.tsx (Aura OS Desktop rebuild)
 *
 * The landing is now a full-viewport desktop:
 * - ambient particle canvas (DesktopCanvas) + blurred orbs + cyan grid
 * - desktop icon grid (DesktopIcons): AI Agents -> /dashboard,
 *   AI Notes -> memory.axiomid.app, AI Terminal -> harness.axiomid.app,
 *   Settings -> /dashboard/settings; the remaining five tiles render
 *   dimmed with a "Soon" badge
 * - taskbar (DesktopTaskbar) with logo, status pill and live clock
 * - brand strip removed from the desktop (taskbar owns the bottom chrome)
 */

import React from "react";
import { act, render, screen } from "@testing-library/react";
import { headers } from "next/headers";
import Home, { generateMetadata } from "@/app/page";
import { useLanguage } from "@/app/context/language-context";
import { getTranslation } from "@/i18n";

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

const mockHeaders = headers as unknown as jest.Mock;

// The global jest.setup.js mock's t() only knows a hardcoded whitelist and
// returns raw keys for everything else. Scope a real-translation override to
// THIS suite so desktop keys render actual strings here.
function mockUseLanguage(lang: "en" | "ar" | "zh") {
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

// The taskbar fetches live telemetry; keep tests offline and deterministic.
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ globalWorkspace: { attention: 42 } }),
  }) as unknown as typeof fetch;
});

// Flush the taskbar's async telemetry state update inside act so no
// setState lands outside a React act() boundary.
async function renderHome() {
  const view = render(await Home());
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return view;
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
      "Your sovereign AI desktop on the Pi Network. Launch agents, manage identity, explore memory — all from one shell.",
    );
  });

  it("uses the Arabic tagline as description when language is Arabic", async () => {
    mockAcceptLanguage("ar");
    const metadata = await generateMetadata();
    expect(metadata.description).toBe(
      "سطح المكتب السيادي الخاص بك على شبكة باي. أطلق الوكلاء، أدر الهوية، استكشف الذاكرة — كل ذلك من واجهة واحدة.",
    );
  });
});

describe("Home — Aura OS Desktop (English)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockAcceptLanguage("en-US,en;q=0.9");
    mockUseLanguage("en");
  });

  it("renders the ambient particle canvas", async () => {
    await renderHome();
    expect(document.querySelector("canvas[aria-hidden='true']")).not.toBeNull();
  });

  it("renders the taskbar with the Aura OS navigation label", async () => {
    await renderHome();
    expect(screen.getByRole("navigation", { name: /aura os/i })).toBeInTheDocument();
  });

  it("wires AI Agents to the control center", async () => {
    await renderHome();
    expect(screen.getByRole("link", { name: "AI Agents" })).toHaveAttribute("href", "/dashboard");
  });

  it("wires AI Notes to the memory engine", async () => {
    await renderHome();
    expect(screen.getByRole("link", { name: "AI Notes" })).toHaveAttribute("href", "https://memory.axiomid.app");
  });

  it("wires AI Terminal to the harness forge", async () => {
    await renderHome();
    expect(screen.getByRole("link", { name: "AI Terminal" })).toHaveAttribute("href", "https://harness.axiomid.app");
  });

  it("wires Settings to the dashboard settings", async () => {
    await renderHome();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/dashboard/settings");
  });

  it("renders the not-yet-live apps dimmed with a Soon badge", async () => {
    await renderHome();
    expect(screen.getByText(/AI Code Editor/)).toHaveTextContent("Soon");
    expect(screen.getByText(/AI File Manager/)).toHaveTextContent("Soon");
    expect(screen.getByText(/AI Automation/)).toHaveTextContent("Soon");
    expect(screen.getByText(/AI Autopilot/)).toHaveTextContent("Soon");
    expect(screen.getByText(/AI Assistant/)).toHaveTextContent("Soon");
  });

  it("renders the brand strip credit overlay", async () => {
    await renderHome();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});

describe("Home — rendering with Arabic language", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAcceptLanguage("ar-EG,ar;q=0.9");
    mockUseLanguage("ar");
  });

  it("localizes the desktop app labels", async () => {
    await renderHome();
    expect(screen.getByRole("link", { name: "وكلاء الذكاء الاصطناعي" })).toHaveAttribute("href", "/dashboard");
  });
});

describe("Home — rendering with Chinese language", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAcceptLanguage("zh-CN,zh;q=0.9");
    mockUseLanguage("zh");
  });

  it("localizes the desktop app labels to Chinese", async () => {
    await renderHome();
    expect(screen.getByRole("link", { name: "AI 智能体" })).toHaveAttribute("href", "/dashboard");
  });
});
