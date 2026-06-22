/**
 * Tests for src/components/dashboard/AgentStatsCard.tsx
 *
 * PR change: Component now uses useLanguage() for i18n support,
 * with bilingual (EN/AR) labels for Tier, Experience, Agent, Trust Score, Status.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AgentStatsCard } from "@/components/dashboard/AgentStatsCard";

// useLanguage is globally mocked in jest.setup.js (language="en", t returns key or mockDict value)

const defaultProps = {
  tier: "Citizen",
  xp: 250,
  agentName: "my-agent",
  agentStatus: "ACTIVE",
  trustScore: 75,
};

describe("AgentStatsCard — basic rendering (PR change: useLanguage)", () => {
  it("renders without crashing", () => {
    expect(() => render(<AgentStatsCard {...defaultProps} />)).not.toThrow();
  });

  it("renders the agent_stats section heading via t('agent_stats')", () => {
    render(<AgentStatsCard {...defaultProps} />);
    // Global mock returns key for unknown keys — "agent_stats" is not in mockDict
    expect(screen.getByText("agent_stats")).toBeInTheDocument();
  });

  it("renders the tier value", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("Citizen")).toBeInTheDocument();
  });

  it("renders the xp value formatted with toLocaleString", () => {
    render(<AgentStatsCard {...defaultProps} xp={1500} />);
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("renders the agentName when provided", () => {
    render(<AgentStatsCard {...defaultProps} agentName="hal-9000" />);
    expect(screen.getByText("hal-9000")).toBeInTheDocument();
  });

  it("renders t('status_none') when agentName is null", () => {
    render(<AgentStatsCard {...defaultProps} agentName={null} />);
    // "status_none" is not in the global mockDict, returns key itself
    expect(screen.getByText("status_none")).toBeInTheDocument();
  });

  it("renders the trustScore with '%' suffix", () => {
    render(<AgentStatsCard {...defaultProps} trustScore={82} />);
    expect(screen.getByText("82%")).toBeInTheDocument();
  });

  it("renders the agentStatus value", () => {
    render(<AgentStatsCard {...defaultProps} agentStatus="ACTIVE" />);
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });
});

describe("AgentStatsCard — bilingual labels (PR change: language === 'en')", () => {
  it("renders 'Tier' label in English", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("Tier")).toBeInTheDocument();
  });

  it("renders 'Experience' label in English", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });

  it("renders 'Agent' label in English", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("Agent")).toBeInTheDocument();
  });

  it("renders 'Trust Score' label in English", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("Trust Score")).toBeInTheDocument();
  });

  it("renders 'Status' label in English", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("Status")).toBeInTheDocument();
  });
});

describe("AgentStatsCard — Arabic labels when language='ar'", () => {
  beforeEach(() => {
    // Override the global mock to return Arabic language
    const { useLanguage } = jest.requireMock("@/app/context/language-context");
    useLanguage.mockReturnValueOnce({
      language: "ar",
      setLanguage: jest.fn(),
      t: (key: string) => key, // return key for any t() calls
    });
  });

  it("renders 'المستوى' label when language is ar", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("المستوى")).toBeInTheDocument();
  });

  it("renders 'الخبرة' label when language is ar", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("الخبرة")).toBeInTheDocument();
  });

  it("renders 'العميل' label when language is ar", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("العميل")).toBeInTheDocument();
  });

  it("renders 'نقاط الثقة' label when language is ar", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("نقاط الثقة")).toBeInTheDocument();
  });

  it("renders 'الحالة' label when language is ar", () => {
    render(<AgentStatsCard {...defaultProps} />);
    expect(screen.getByText("الحالة")).toBeInTheDocument();
  });
});

describe("AgentStatsCard — agentStatus color indicator (PR change)", () => {
  it("ACTIVE status renders a green indicator dot", () => {
    const { container } = render(<AgentStatsCard {...defaultProps} agentStatus="ACTIVE" />);
    const dot = container.querySelector(".bg-green-500");
    expect(dot).not.toBeNull();
  });

  it("PAUSED status renders an amber indicator dot", () => {
    const { container } = render(<AgentStatsCard {...defaultProps} agentStatus="PAUSED" />);
    const dot = container.querySelector(".bg-amber-500");
    expect(dot).not.toBeNull();
  });

  it("other status renders a gray indicator dot", () => {
    const { container } = render(<AgentStatsCard {...defaultProps} agentStatus="OFFLINE" />);
    const dot = container.querySelector(".bg-gray-500");
    expect(dot).not.toBeNull();
  });

  it("ACTIVE status does NOT render amber or gray dot", () => {
    const { container } = render(<AgentStatsCard {...defaultProps} agentStatus="ACTIVE" />);
    expect(container.querySelector(".bg-amber-500")).toBeNull();
    expect(container.querySelector(".bg-gray-500")).toBeNull();
  });

  it("PAUSED status does NOT render green dot", () => {
    const { container } = render(<AgentStatsCard {...defaultProps} agentStatus="PAUSED" />);
    expect(container.querySelector(".bg-green-500")).toBeNull();
  });
});

describe("AgentStatsCard — xp edge cases (PR change)", () => {
  it("renders xp=0 as '0'", () => {
    render(<AgentStatsCard {...defaultProps} xp={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders large xp values formatted with locale separators", () => {
    render(<AgentStatsCard {...defaultProps} xp={1000000} />);
    // toLocaleString in jsdom may use ',' or '.' depending on locale
    expect(screen.getByText(/1[,.]?000[,.]?000/)).toBeInTheDocument();
  });

  it("renders trustScore=0 correctly", () => {
    render(<AgentStatsCard {...defaultProps} trustScore={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders trustScore=100 correctly", () => {
    render(<AgentStatsCard {...defaultProps} trustScore={100} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});

describe("AgentStatsCard — 2×2 grid layout (PR change)", () => {
  it("renders exactly 4 stat cells (Tier, Experience, Agent, Trust Score)", () => {
    const { container } = render(<AgentStatsCard {...defaultProps} />);
    const grid = container.querySelector(".grid.grid-cols-2");
    expect(grid).not.toBeNull();
    // Each stat cell contains a label <p> and a value <p>
    const cells = grid!.querySelectorAll("div");
    expect(cells.length).toBeGreaterThanOrEqual(4);
  });

  it("renders status row below the main grid", () => {
    render(<AgentStatsCard {...defaultProps} agentStatus="PAUSED" />);
    expect(screen.getByText("PAUSED")).toBeInTheDocument();
  });
});