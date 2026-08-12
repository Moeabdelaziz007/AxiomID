import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CheckoutButton } from "@/components/plans/CheckoutButton";
import { useLanguage } from "@/app/context/language-context";

jest.mock("@/app/context/language-context", () => ({
  useLanguage: jest.fn(),
}));

const mockUseLanguage = useLanguage as unknown as jest.Mock;
mockUseLanguage.mockReturnValue({
  language: "en",
  setLanguage: jest.fn(),
  t: (key: string) => key,
});

describe("CheckoutButton — plan provisioning flow", () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the select label in its idle state", () => {
    render(<CheckoutButton plan="creator" />);
    expect(screen.getByRole("button", { name: "cta_select" })).toBeInTheDocument();
  });

  it("posts to checkout, then reports the provisioning status", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Provisioning started" }),
    });
    const view = render(<CheckoutButton plan="creator" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button", { name: "plan_provisioning" })).toBeDisabled();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Provisioning started")).toBeInTheDocument();
    view.unmount();
  });

  it("passes the selected plan tier to the checkout route", async () => {
    const fetchMock = (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    });
    render(<CheckoutButton plan="power" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/plans/checkout?plan=power", { method: "POST" });
  });

  it("surfaces the retry state when provisioning fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: "provision failed" }),
    });
    render(<CheckoutButton plan="creator" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "plan_retry" })).toBeInTheDocument();
    expect(screen.getByText("provision failed")).toBeInTheDocument();
  });

  it("surfaces a retry state when the request itself throws", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("network down"));
    render(<CheckoutButton plan="creator" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "plan_retry" })).toBeInTheDocument();
    expect(screen.getByText("network down")).toBeInTheDocument();
  });
});