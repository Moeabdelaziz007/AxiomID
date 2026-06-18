import React from "react";
import { render, screen } from "@testing-library/react";

// Capture arguments passed to defineRegistry so we can test components/actions
let capturedComponents: Record<string, React.ComponentType<any>> = {};
let capturedActions: Record<string, () => void> = {};

jest.mock("@json-render/react", () => ({
  defineRegistry: jest.fn((_catalog: unknown, { components, actions }: { components: Record<string, React.ComponentType<any>>; actions: Record<string, () => void> }) => {
    capturedComponents = components;
    capturedActions = actions;
    return { registry: { __mock: true } };
  }),
  Renderer: jest.fn(() => null),
  JSONUIProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  VisibilityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/lib/catalog", () => ({
  axiomCatalog: { __mock: true },
}));

// next/link can render as an anchor in tests
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// Import registry AFTER all mocks are in place so defineRegistry is intercepted
import "@/lib/registry";

describe("registry — defineRegistry is called with correct catalog", () => {
  it("defineRegistry is called exactly once on module load", () => {
    const { defineRegistry } = require("@json-render/react");
    expect(defineRegistry).toHaveBeenCalledTimes(1);
  });

  it("defineRegistry receives axiomCatalog as first argument", () => {
    const { defineRegistry } = require("@json-render/react");
    const { axiomCatalog } = require("@/lib/catalog");
    expect(defineRegistry).toHaveBeenCalledWith(axiomCatalog, expect.any(Object));
  });

  it("all required component types are registered", () => {
    expect(capturedComponents).toHaveProperty("Card");
    expect(capturedComponents).toHaveProperty("LinkItem");
    expect(capturedComponents).toHaveProperty("Heading");
    expect(capturedComponents).toHaveProperty("Button");
    expect(capturedComponents).toHaveProperty("Metric");
  });

  it("refresh_data action is registered", () => {
    expect(capturedActions).toHaveProperty("refresh_data");
    expect(typeof capturedActions.refresh_data).toBe("function");
  });
});

describe("registry — Card component", () => {
  it("renders a div wrapper", () => {
    const Card = capturedComponents.Card;
    const { container } = render(<Card props={{}} />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    const Card = capturedComponents.Card;
    render(<Card props={{ title: "My Card Title" }} />);
    expect(screen.getByText("My Card Title")).toBeInTheDocument();
  });

  it("does not render a heading when title is omitted", () => {
    const Card = capturedComponents.Card;
    render(<Card props={{}} />);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders children when provided", () => {
    const Card = capturedComponents.Card;
    render(
      <Card props={{ title: "Test" }}>
        <span data-testid="child">child content</span>
      </Card>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("does not render children wrapper when no children passed", () => {
    const Card = capturedComponents.Card;
    const { container } = render(<Card props={{ title: "Title" }} />);
    // The space-y-2 div for children should not be rendered
    const divs = container.querySelectorAll("div");
    // Should only have the outer wrapper and title heading — no inner space-y-2 div
    expect(divs.length).toBe(1);
  });
});

describe("registry — LinkItem component", () => {
  it("renders a link element", () => {
    const LinkItem = capturedComponents.LinkItem;
    render(<LinkItem props={{ label: "Go Home", href: "/home" }} />);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("renders the label text", () => {
    const LinkItem = capturedComponents.LinkItem;
    render(<LinkItem props={{ label: "My Link", href: "/path" }} />);
    expect(screen.getByText("My Link")).toBeInTheDocument();
  });

  it("sets href on the link element", () => {
    const LinkItem = capturedComponents.LinkItem;
    render(<LinkItem props={{ label: "Profile", href: "/profile/user" }} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/profile/user");
  });

  it("handles external URLs in href", () => {
    const LinkItem = capturedComponents.LinkItem;
    render(<LinkItem props={{ label: "External", href: "/api/did-document?did=did%3Api%3Atest" }} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/api/did-document?did=did%3Api%3Atest");
  });
});

describe("registry — Heading component", () => {
  it("renders h2 by default when level is omitted", () => {
    const Heading = capturedComponents.Heading;
    render(<Heading props={{ text: "Default Heading" }} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Default Heading")).toBeInTheDocument();
  });

  it("renders h1 when level='h1'", () => {
    const Heading = capturedComponents.Heading;
    render(<Heading props={{ text: "Page Title", level: "h1" }} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders h3 when level='h3'", () => {
    const Heading = capturedComponents.Heading;
    render(<Heading props={{ text: "Subsection", level: "h3" }} />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("renders the heading text content", () => {
    const Heading = capturedComponents.Heading;
    render(<Heading props={{ text: "Hello World", level: "h2" }} />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});

describe("registry — Button component", () => {
  it("renders a button element", () => {
    const Button = capturedComponents.Button;
    render(<Button props={{ label: "Click Me" }} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders the button label text", () => {
    const Button = capturedComponents.Button;
    render(<Button props={{ label: "Submit" }} />);
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("renders different labels correctly", () => {
    const Button = capturedComponents.Button;
    render(<Button props={{ label: "Cancel" }} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});

describe("registry — Metric component", () => {
  it("renders the metric label", () => {
    const Metric = capturedComponents.Metric;
    render(<Metric props={{ label: "XP", value: "150" }} />);
    expect(screen.getByText("XP")).toBeInTheDocument();
  });

  it("renders the metric value", () => {
    const Metric = capturedComponents.Metric;
    render(<Metric props={{ label: "Tier", value: "Citizen" }} />);
    expect(screen.getByText("Citizen")).toBeInTheDocument();
  });

  it("renders both label and value together", () => {
    const Metric = capturedComponents.Metric;
    render(<Metric props={{ label: "Trust Score", value: "85" }} />);
    expect(screen.getByText("Trust Score")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
  });
});

describe("registry — refresh_data action", () => {
  let reloadMock: jest.SpyInstance;

  beforeEach(() => {
    reloadMock = jest.spyOn(window.location, "reload").mockImplementation(() => {});
  });

  afterEach(() => {
    reloadMock.mockRestore();
  });

  it("calls window.location.reload when invoked", async () => {
    await capturedActions.refresh_data();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
