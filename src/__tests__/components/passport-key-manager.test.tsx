/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PassportKeyManager from "@/components/ui/PassportKeyManager";

const LONG_DID = "did:axiom:axiomid.app:pi:abc123"; // 32 chars > 30
const SHORT_DID = "did:axiom:short"; // 15 chars ≤ 30

describe("PassportKeyManager", () => {
  const mockProps = {
    did: LONG_DID,
    onSign: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders DID display", () => {
    render(<PassportKeyManager {...mockProps} />);
    expect(screen.getByText(/did:axiom:axiom\.\.\.pp:pi:abc123/)).toBeDefined();
  });

  it("renders copy button", () => {
    render(<PassportKeyManager {...mockProps} />);
    expect(screen.getByText(/Copy DID/)).toBeDefined();
  });

  it("renders sign section", () => {
    render(<PassportKeyManager {...mockProps} />);
    expect(screen.getByText(/Sign with DID key/)).toBeDefined();
  });

  it("renders Key Management heading", () => {
    render(<PassportKeyManager {...mockProps} />);
    expect(screen.getByText(/Key Management/i)).toBeDefined();
  });

  it("renders short DID without truncation", () => {
    render(<PassportKeyManager did={SHORT_DID} />);
    expect(screen.getByText(SHORT_DID)).toBeDefined();
  });

  it("truncates long DID correctly", () => {
    render(<PassportKeyManager did={LONG_DID} />);
    // slice(0, 15) = "did:axiom:axiom", slice(-12) = "pp:pi:abc123"
    const truncated = `${LONG_DID.slice(0, 15)}...${LONG_DID.slice(-12)}`;
    expect(screen.getByText(truncated)).toBeDefined();
  });

  it("renders payload input with placeholder", () => {
    render(<PassportKeyManager {...mockProps} />);
    const input = screen.getByPlaceholderText("Payload to sign...");
    expect(input).toBeDefined();
  });

  it("Sign button is initially disabled (empty payload)", () => {
    render(<PassportKeyManager {...mockProps} />);
    const signButton = screen.getByRole("button", { name: /^Sign$/ });
    expect(signButton).toBeDisabled();
  });

  it("Sign button is enabled after typing payload", () => {
    render(<PassportKeyManager {...mockProps} />);
    const input = screen.getByPlaceholderText("Payload to sign...");
    fireEvent.change(input, { target: { value: "test payload" } });

    const signButton = screen.getByRole("button", { name: /^Sign$/ });
    expect(signButton).not.toBeDisabled();
  });

  it("calls onSign with payload when Sign button clicked", async () => {
    const onSign = jest.fn().mockResolvedValue("mock-signature-result");
    render(<PassportKeyManager did={LONG_DID} onSign={onSign} />);

    const input = screen.getByPlaceholderText("Payload to sign...");
    fireEvent.change(input, { target: { value: "my-payload" } });

    const signButton = screen.getByRole("button", { name: /^Sign$/ });
    await act(async () => {
      fireEvent.click(signButton);
    });

    expect(onSign).toHaveBeenCalledWith("my-payload");
  });

  it("displays signature after successful signing", async () => {
    const onSign = jest.fn().mockResolvedValue("0xdeadbeef");
    render(<PassportKeyManager did={LONG_DID} onSign={onSign} />);

    const input = screen.getByPlaceholderText("Payload to sign...");
    fireEvent.change(input, { target: { value: "data-to-sign" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Sign$/ }));
    });

    expect(screen.getByText(/Signature: 0xdeadbeef/)).toBeDefined();
  });

  it("displays 'Signing failed' when onSign throws", async () => {
    const onSign = jest.fn().mockRejectedValue(new Error("Network error"));
    render(<PassportKeyManager did={LONG_DID} onSign={onSign} />);

    const input = screen.getByPlaceholderText("Payload to sign...");
    fireEvent.change(input, { target: { value: "data" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Sign$/ }));
    });

    expect(screen.getByText(/Signing failed/)).toBeDefined();
  });

  it("does not call onSign when payload is empty", async () => {
    const onSign = jest.fn();
    render(<PassportKeyManager did={LONG_DID} onSign={onSign} />);

    // Do not type anything; button should remain disabled
    const signButton = screen.getByRole("button", { name: /^Sign$/ });
    expect(signButton).toBeDisabled();
    expect(onSign).not.toHaveBeenCalled();
  });

  it("renders without onSign prop (no-op sign)", () => {
    // Should render without crashing even without onSign
    expect(() => render(<PassportKeyManager did={LONG_DID} />)).not.toThrow();
  });

  it("does not show signature section initially", () => {
    render(<PassportKeyManager {...mockProps} />);
    expect(screen.queryByText(/Signature:/)).toBeNull();
  });
});
