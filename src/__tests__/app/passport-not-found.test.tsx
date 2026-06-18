/**
 * Tests for src/app/passport/[slug]/not-found.tsx
 *
 * PR changes:
 * - Added "use client" directive
 * - Uses useLanguage() for localized text instead of hardcoded English strings
 * - New translation key: passport_not_found_description
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import PassportNotFound from "@/app/passport/[slug]/not-found";

// useLanguage is globally mocked in jest.setup.js; the mock t() returns
// mockDict[key] || key, so for keys not in the dict the key name is returned.

describe("PassportNotFound — rendering (PR change: localized with useLanguage)", () => {
  it("renders without crashing", () => {
    expect(() => {
      render(<PassportNotFound />);
    }).not.toThrow();
  });

  it("renders the heading using t('passport_not_found')", () => {
    render(<PassportNotFound />);
    // 'passport_not_found' is not in mockDict -> returns key name
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByRole("heading").textContent).toBe("passport_not_found");
  });

  it("renders description using t('passport_not_found_description') (PR change: new key)", () => {
    render(<PassportNotFound />);
    // New key not in mockDict -> returns key name
    expect(screen.getByText("passport_not_found_description")).toBeInTheDocument();
  });

  it("renders Create Your Passport link using t('create_your_passport')", () => {
    render(<PassportNotFound />);
    // 'create_your_passport' IS in mockDict -> 'CREATE YOUR PASSPORT'
    expect(screen.getByRole("link", { name: "CREATE YOUR PASSPORT" })).toBeInTheDocument();
  });

  it("link points to home /", () => {
    render(<PassportNotFound />);
    const link = screen.getByRole("link", { name: "CREATE YOUR PASSPORT" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders exactly one link", () => {
    render(<PassportNotFound />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("renders exactly one heading", () => {
    render(<PassportNotFound />);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });
});

describe("PassportNotFound — accessibility", () => {
  it("heading is h1", () => {
    render(<PassportNotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("link is a valid anchor element", () => {
    render(<PassportNotFound />);
    const link = screen.getByRole("link");
    expect(link.tagName).toBe("A");
  });
});