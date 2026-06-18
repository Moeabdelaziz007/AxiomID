import React from "react";
import { render, screen } from "@testing-library/react";
import { QuickLinksCard } from "@/components/dashboard/QuickLinksCard";

// Capture the spec passed to AxiomRenderer so we can assert on it
let capturedSpec: unknown = null;

jest.mock("@/components/ui/AxiomRenderer", () => ({
  AxiomRenderer: ({ spec }: { spec: unknown }) => {
    capturedSpec = spec;
    return <div data-testid="axiom-renderer" data-spec={JSON.stringify(spec)} />;
  },
}));

// useLanguage is globally mocked in jest.setup.js, no override needed here.
// t("view_passport") -> "View Passport"
// t("did_document")  -> "DID Document"
// t("quick_links")   -> "quick_links" (key not in mock dict, falls back to key)

beforeEach(() => {
  capturedSpec = null;
});

describe("QuickLinksCard — spec structure", () => {
  it("renders the AxiomRenderer component", () => {
    render(<QuickLinksCard passportSlug="my-passport" />);
    expect(screen.getByTestId("axiom-renderer")).toBeInTheDocument();
  });

  it("spec root is 'card'", () => {
    render(<QuickLinksCard passportSlug="my-passport" />);
    const spec = capturedSpec as any;
    expect(spec.root).toBe("card");
  });

  it("spec card element type is 'Card'", () => {
    render(<QuickLinksCard passportSlug="my-passport" />);
    const spec = capturedSpec as any;
    expect(spec.elements.card.type).toBe("Card");
  });

  it("card title is the translated 'quick_links' key", () => {
    render(<QuickLinksCard passportSlug="my-passport" />);
    const spec = capturedSpec as any;
    // The mock dict doesn't have "quick_links", so t returns the key itself
    expect(spec.elements.card.props.title).toBe("quick_links");
  });

  it("card children reference link1 and link2", () => {
    render(<QuickLinksCard passportSlug="my-passport" />);
    const spec = capturedSpec as any;
    expect(spec.elements.card.children).toEqual(["link1", "link2"]);
  });

  it("link1 is a 'LinkItem' type with view_passport label", () => {
    render(<QuickLinksCard passportSlug="my-passport" />);
    const spec = capturedSpec as any;
    expect(spec.elements.link1.type).toBe("LinkItem");
    expect(spec.elements.link1.props.label).toBe("View Passport");
  });

  it("link2 is a 'LinkItem' type with did_document label", () => {
    render(<QuickLinksCard passportSlug="my-passport" />);
    const spec = capturedSpec as any;
    expect(spec.elements.link2.type).toBe("LinkItem");
    expect(spec.elements.link2.props.label).toBe("DID Document");
  });
});

describe("QuickLinksCard — passport slug in link href", () => {
  it("link1 href includes the passportSlug", () => {
    render(<QuickLinksCard passportSlug="user-abc" />);
    const spec = capturedSpec as any;
    expect(spec.elements.link1.props.href).toBe("/passport/user-abc");
  });

  it("different slug produces correct href", () => {
    render(<QuickLinksCard passportSlug="another-user" />);
    const spec = capturedSpec as any;
    expect(spec.elements.link1.props.href).toBe("/passport/another-user");
  });

  it("link2 href is /api/did-document when did is not provided", () => {
    render(<QuickLinksCard passportSlug="my-passport" />);
    const spec = capturedSpec as any;
    expect(spec.elements.link2.props.href).toBe("/api/did-document");
  });
});

describe("QuickLinksCard — DID encoding in link href", () => {
  it("link2 href includes encoded DID when did prop is provided", () => {
    const did = "did:pi:testuser";
    render(<QuickLinksCard passportSlug="my-passport" did={did} />);
    const spec = capturedSpec as any;
    expect(spec.elements.link2.props.href).toBe(
      `/api/did-document?did=${encodeURIComponent(did)}`
    );
  });

  it("properly URL-encodes special characters in the DID", () => {
    const did = "did:example:123/abc?foo=bar&baz=qux";
    render(<QuickLinksCard passportSlug="my-passport" did={did} />);
    const spec = capturedSpec as any;
    expect(spec.elements.link2.props.href).toBe(
      `/api/did-document?did=${encodeURIComponent(did)}`
    );
  });

  it("link2 href omits did param when did is empty string (falsy)", () => {
    render(<QuickLinksCard passportSlug="my-passport" did="" />);
    const spec = capturedSpec as any;
    expect(spec.elements.link2.props.href).toBe("/api/did-document");
  });

  it("re-renders with updated passportSlug correctly", () => {
    const { rerender } = render(<QuickLinksCard passportSlug="old-slug" />);
    const spec1 = capturedSpec as any;
    expect(spec1.elements.link1.props.href).toBe("/passport/old-slug");

    rerender(<QuickLinksCard passportSlug="new-slug" />);
    const spec2 = capturedSpec as any;
    expect(spec2.elements.link1.props.href).toBe("/passport/new-slug");
  });
});