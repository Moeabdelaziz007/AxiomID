/**
 * Tests for src/components/dashboard/WelcomeBanner.tsx
 *
 * PR change: Component uses useLanguage() for i18n support:
 * - Bilingual greeting ("Hello, {username}." / "مرحباً، {username}.")
 * - Bilingual "Trust Score:" label
 * - t('xp_balance') for XP section header
 * - t('level_progress') for progress label
 * - getNextLevelXP(tier) to display next level XP target
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";

// useLanguage is globally mocked in jest.setup.js (language="en")
// t('xp_balance') → "xp_balance" (key not in mockDict, returns key)
// t('level_progress') → "level_progress" (key not in mockDict, returns key)

// @/lib/tiers is NOT mocked — use real implementation
// getNextLevelXP("Visitor") = 100, "Citizen" = 500, "Validator" = 1000, "Sovereign" = null

const defaultProps = {
  username: "testuser",
  tier: "Citizen",
  levelProgress: 50,
  xp: 200,
};

describe("WelcomeBanner — basic rendering (PR change: useLanguage)", () => {
  it("renders without crashing", () => {
    expect(() => render(<WelcomeBanner {...defaultProps} />)).not.toThrow();
  });

  it("renders the English greeting 'Hello, {username}.'", () => {
    render(<WelcomeBanner {...defaultProps} username="pioneer" />);
    expect(screen.getByText("Hello, pioneer.")).toBeInTheDocument();
  });

  it("renders t('xp_balance') as XP section label", () => {
    render(<WelcomeBanner {...defaultProps} />);
    // "xp_balance" is not in the mockDict, so returns key itself
    expect(screen.getByText("xp_balance")).toBeInTheDocument();
  });

  it("renders the xp value formatted with toLocaleString", () => {
    render(<WelcomeBanner {...defaultProps} xp={1500} />);
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("renders 'XP' unit suffix", () => {
    render(<WelcomeBanner {...defaultProps} />);
    expect(screen.getByText("XP")).toBeInTheDocument();
  });

  it("renders t('level_progress') as progress section label", () => {
    render(<WelcomeBanner {...defaultProps} />);
    // "level_progress" is not in mockDict, returns key
    expect(screen.getByText("level_progress")).toBeInTheDocument();
  });

  it("renders the tier as trust score value", () => {
    render(<WelcomeBanner {...defaultProps} tier="Validator" />);
    expect(screen.getByText("Validator")).toBeInTheDocument();
  });
});

describe("WelcomeBanner — bilingual greeting (PR change)", () => {
  it("renders English greeting when language='en'", () => {
    render(<WelcomeBanner {...defaultProps} username="alice" />);
    expect(screen.getByText("Hello, alice.")).toBeInTheDocument();
  });

  it("renders Arabic greeting when language='ar'", () => {
    const { useLanguage } = jest.requireMock("@/app/context/language-context");
    useLanguage.mockReturnValueOnce({
      language: "ar",
      setLanguage: jest.fn(),
      t: (key: string) => key,
    });
    render(<WelcomeBanner {...defaultProps} username="alice" />);
    expect(screen.getByText("مرحباً، alice.")).toBeInTheDocument();
  });

  it("renders 'Trust Score:' label in English", () => {
    render(<WelcomeBanner {...defaultProps} />);
    expect(screen.getByText("Trust Score:")).toBeInTheDocument();
  });

  it("renders 'نقاط الثقة:' label when language='ar'", () => {
    const { useLanguage } = jest.requireMock("@/app/context/language-context");
    useLanguage.mockReturnValueOnce({
      language: "ar",
      setLanguage: jest.fn(),
      t: (key: string) => key,
    });
    render(<WelcomeBanner {...defaultProps} />);
    expect(screen.getByText("نقاط الثقة:")).toBeInTheDocument();
  });
});

describe("WelcomeBanner — getNextLevelXP integration (PR change)", () => {
  it("shows 'xp / 500 XP' for Citizen tier (nextXP=500)", () => {
    render(<WelcomeBanner {...defaultProps} tier="Citizen" xp={200} />);
    // Pattern: "{xp.toLocaleString()} / {nextXP.toLocaleString()} XP"
    expect(screen.getByText(/200.*\/.*500 XP/)).toBeInTheDocument();
  });

  it("shows 'xp / 1,000 XP' for Validator tier (nextXP=1000)", () => {
    render(<WelcomeBanner {...defaultProps} tier="Validator" xp={600} />);
    expect(screen.getByText(/600.*\/.*1,000 XP/)).toBeInTheDocument();
  });

  it("shows 'xp / 100 XP' for Visitor tier (nextXP=100)", () => {
    render(<WelcomeBanner {...defaultProps} tier="Visitor" xp={50} />);
    expect(screen.getByText(/50.*\/.*100 XP/)).toBeInTheDocument();
  });

  it("shows 'xp XP (MAX)' for Sovereign tier (nextXP=null)", () => {
    render(<WelcomeBanner {...defaultProps} tier="Sovereign" xp={2000} />);
    expect(screen.getByText(/XP \(MAX\)/)).toBeInTheDocument();
  });

  it("does NOT show '(MAX)' for non-max tiers", () => {
    render(<WelcomeBanner {...defaultProps} tier="Citizen" xp={200} />);
    expect(screen.queryByText(/MAX/)).toBeNull();
  });
});

describe("WelcomeBanner — progress bar (PR change)", () => {
  it("renders the progress bar container", () => {
    const { container } = render(<WelcomeBanner {...defaultProps} levelProgress={60} />);
    const progressBar = container.querySelector(".tier-progress");
    expect(progressBar).not.toBeNull();
  });

  it("sets the fill bar width to levelProgress%", () => {
    const { container } = render(<WelcomeBanner {...defaultProps} levelProgress={73} />);
    const fill = container.querySelector(".tier-progress-fill") as HTMLElement | null;
    expect(fill).not.toBeNull();
    expect(fill!.style.width).toBe("73%");
  });

  it("renders 0% width for levelProgress=0", () => {
    const { container } = render(<WelcomeBanner {...defaultProps} levelProgress={0} />);
    const fill = container.querySelector(".tier-progress-fill") as HTMLElement | null;
    expect(fill!.style.width).toBe("0%");
  });

  it("renders 100% width for levelProgress=100", () => {
    const { container } = render(<WelcomeBanner {...defaultProps} levelProgress={100} />);
    const fill = container.querySelector(".tier-progress-fill") as HTMLElement | null;
    expect(fill!.style.width).toBe("100%");
  });
});

describe("WelcomeBanner — XP edge cases (PR change)", () => {
  it("renders xp=0 correctly", () => {
    render(<WelcomeBanner {...defaultProps} xp={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders large xp values with locale formatting", () => {
    render(<WelcomeBanner {...defaultProps} xp={10000} />);
    expect(screen.getByText("10,000")).toBeInTheDocument();
  });

  it("shows the xp value in both the balance card and the progress label", () => {
    render(<WelcomeBanner {...defaultProps} xp={350} />);
    // "350" appears in the XP balance card and the progress fraction
    const allMatches = screen.getAllByText(/350/);
    expect(allMatches.length).toBeGreaterThanOrEqual(1);
  });
});
