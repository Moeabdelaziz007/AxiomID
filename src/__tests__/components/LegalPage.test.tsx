import React from "react";
import { render, screen } from "@testing-library/react";
import { LegalPage } from "@/components/LegalPage";

// Header and Footer are mocked so we can focus on LegalPage logic
jest.mock("@/components/Header", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-header" />,
}));

jest.mock("@/components/Footer", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-footer" />,
}));

const privacySections = [
  { titleKey: "privacy_info_collect", descKey: "privacy_info_collect_desc", color: "green" },
  { titleKey: "privacy_how_use", descKey: "privacy_how_use_desc", color: "blue" },
  { titleKey: "privacy_data_storage", descKey: "privacy_data_storage_desc", color: "purple" },
  { titleKey: "privacy_rights", descKey: "privacy_rights_desc", color: "green" },
];

const defaultProps = {
  badgeKey: "privacy_legal",
  dateKey: "privacy_last_updated",
  titleMainKey: "privacy_title",
  titleHighlightKey: "privacy_title_gradient",
  subtitleKey: "privacy_subtitle",
  sections: privacySections,
};

describe("LegalPage — rendering", () => {
  it("renders without crashing", () => {
    render(<LegalPage {...defaultProps} />);
  });

  it("renders the badge key text", () => {
    render(<LegalPage {...defaultProps} />);
    // t() returns the key itself for unmapped keys
    expect(screen.getByText("privacy_legal")).toBeInTheDocument();
  });

  it("renders the date key text", () => {
    render(<LegalPage {...defaultProps} />);
    expect(screen.getByText("privacy_last_updated")).toBeInTheDocument();
  });

  it("renders the title main key text", () => {
    render(<LegalPage {...defaultProps} />);
    expect(screen.getByText("privacy_title")).toBeInTheDocument();
  });

  it("renders the title highlight key text", () => {
    render(<LegalPage {...defaultProps} />);
    expect(screen.getByText("privacy_title_gradient")).toBeInTheDocument();
  });

  it("renders the subtitle key text", () => {
    render(<LegalPage {...defaultProps} />);
    expect(screen.getByText("privacy_subtitle")).toBeInTheDocument();
  });

  it("renders all section titles", () => {
    render(<LegalPage {...defaultProps} />);
    for (const section of privacySections) {
      expect(screen.getByText(section.titleKey)).toBeInTheDocument();
    }
  });

  it("renders all section descriptions", () => {
    render(<LegalPage {...defaultProps} />);
    for (const section of privacySections) {
      expect(screen.getByText(section.descKey)).toBeInTheDocument();
    }
  });

  it("renders the correct number of sections", () => {
    render(<LegalPage {...defaultProps} />);
    // Each section renders as a <section> element
    const sections = document.querySelectorAll("section");
    expect(sections.length).toBe(privacySections.length);
  });

  it("renders Header and Footer components", () => {
    render(<LegalPage {...defaultProps} />);
    expect(screen.getByTestId("mock-header")).toBeInTheDocument();
    expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
  });
});

describe("LegalPage — color mapping", () => {
  it("applies bg-neon-green class for color='green'", () => {
    const { container } = render(
      <LegalPage
        {...defaultProps}
        sections={[{ titleKey: "section_title", descKey: "section_desc", color: "green" }]}
      />
    );
    expect(container.querySelector(".bg-neon-green")).toBeInTheDocument();
  });

  it("applies bg-electric-blue class for color='blue'", () => {
    const { container } = render(
      <LegalPage
        {...defaultProps}
        sections={[{ titleKey: "section_title", descKey: "section_desc", color: "blue" }]}
      />
    );
    expect(container.querySelector(".bg-electric-blue")).toBeInTheDocument();
  });

  it("applies bg-axiom-purple class for color='purple'", () => {
    const { container } = render(
      <LegalPage
        {...defaultProps}
        sections={[{ titleKey: "section_title", descKey: "section_desc", color: "purple" }]}
      />
    );
    expect(container.querySelector(".bg-axiom-purple")).toBeInTheDocument();
  });

  it("falls back to bg-neon-green for an unknown color", () => {
    const { container } = render(
      <LegalPage
        {...defaultProps}
        sections={[{ titleKey: "section_title", descKey: "section_desc", color: "unknown-color" }]}
      />
    );
    expect(container.querySelector(".bg-neon-green")).toBeInTheDocument();
  });
});

describe("LegalPage — terms page props", () => {
  const termsSections = [
    { titleKey: "terms_use", descKey: "terms_use_desc", color: "green" },
    { titleKey: "terms_wallet", descKey: "terms_wallet_desc", color: "blue" },
    { titleKey: "terms_ai_agent", descKey: "terms_ai_agent_desc", color: "purple" },
    { titleKey: "terms_liability", descKey: "terms_liability_desc", color: "green" },
    { titleKey: "terms_changes", descKey: "terms_changes_desc", color: "green" },
  ];

  it("renders all 5 terms sections", () => {
    render(
      <LegalPage
        badgeKey="terms_legal"
        dateKey="terms_last_updated"
        titleMainKey="terms_title_main"
        titleHighlightKey="terms_title_highlight"
        subtitleKey="terms_subtitle"
        sections={termsSections}
      />
    );
    for (const section of termsSections) {
      expect(screen.getByText(section.titleKey)).toBeInTheDocument();
    }
  });
});

describe("LegalPage — empty sections", () => {
  it("renders with no sections without crashing", () => {
    render(<LegalPage {...defaultProps} sections={[]} />);
    const sections = document.querySelectorAll("section");
    expect(sections.length).toBe(0);
  });
});

describe("LegalPage — section structure", () => {
  it("each section renders an h2 heading element", () => {
    render(<LegalPage {...defaultProps} />);
    const headings = document.querySelectorAll("h2");
    expect(headings.length).toBe(privacySections.length);
  });

  it("each section indicator dot is a span with rounded-full class", () => {
    const { container } = render(<LegalPage {...defaultProps} />);
    const dots = container.querySelectorAll("h2 > span.rounded-full");
    expect(dots.length).toBe(privacySections.length);
  });

  it("indicator dot for color='green' has w-1.5 h-1.5 dimensions", () => {
    const { container } = render(
      <LegalPage
        {...defaultProps}
        sections={[{ titleKey: "test_title", descKey: "test_desc", color: "green" }]}
      />
    );
    const dot = container.querySelector("h2 > span.rounded-full");
    expect(dot).toHaveClass("w-1.5");
    expect(dot).toHaveClass("h-1.5");
  });

  it("renders title highlight in a gradient span", () => {
    const { container } = render(<LegalPage {...defaultProps} />);
    const gradientSpan = container.querySelector("span.text-transparent.bg-clip-text");
    expect(gradientSpan).toBeInTheDocument();
    expect(gradientSpan?.textContent).toBe("privacy_title_gradient");
  });

  it("badge has border border-neon-green/20 styling class", () => {
    const { container } = render(<LegalPage {...defaultProps} />);
    const badge = container.querySelector("span.border-neon-green\\/20");
    expect(badge).toBeInTheDocument();
  });

  it("renders a single h1 heading with the title text", () => {
    render(<LegalPage {...defaultProps} />);
    const h1 = document.querySelector("h1");
    expect(h1).toBeInTheDocument();
    expect(h1?.textContent).toContain("privacy_title");
    expect(h1?.textContent).toContain("privacy_title_gradient");
  });

  it("single section renders exactly one section element", () => {
    render(
      <LegalPage
        {...defaultProps}
        sections={[{ titleKey: "single_title", descKey: "single_desc", color: "blue" }]}
      />
    );
    const sections = document.querySelectorAll("section");
    expect(sections.length).toBe(1);
  });
});