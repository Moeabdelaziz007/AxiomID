import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import Header from "@/components/Header";
import { useWallet } from "@/app/context/wallet-context";
import { useLanguage } from "@/app/context/language-context";
import { defaultWalletCtx } from "@/__tests__/app/wallet-test-helpers";

jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

jest.mock("@/app/context/language-context", () => ({
  useLanguage: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement("a", { href, ...props }, children),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

function makeCtx(overrides = {}) {
  return defaultWalletCtx(overrides) as ReturnType<typeof useWallet>;
}

function mockLanguage(tKey: string) {
  const dict: Record<string, string> = {
    header_back: "BACK",
    connect: "CONNECT",
    connecting: "CONNECTING...",
    dashboard: "AxiomID Dashboard",
    nav_dashboard: "AxiomID Dashboard",
    logout: "LOGOUT",
    pi_browser: "Pi Browser",
    pi_browser_required: "Pi Browser required. Open this app inside Pi Browser.",
  };
  mockUseLanguage.mockReturnValue({
    language: "en",
    setLanguage: jest.fn(),
    t: (key: string) => dict[key] || key,
  } as ReturnType<typeof useLanguage>);
}

describe("Header — rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(makeCtx());
    mockLanguage("en");
  });

  it("renders without crashing", () => {
    render(<Header />);
  });

  it("renders the AxiomID wordmark", () => {
    render(<Header />);
    expect(screen.getByText(/AXIOM/)).toBeInTheDocument();
    expect(screen.getByText("ID")).toBeInTheDocument();
  });

  it("renders a link to the home page", () => {
    render(<Header />);
    const homeLink = screen.getAllByRole("link").find((el) => el.getAttribute("href") === "/");
    expect(homeLink).toBeDefined();
  });
});

describe("Header — showBack prop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(makeCtx());
    mockLanguage("en");
  });

  it("does not render the back button by default", () => {
    render(<Header />);
    expect(screen.queryByText("BACK")).not.toBeInTheDocument();
  });

  it("renders a back button when showBack=true", () => {
    render(<Header showBack />);
    expect(screen.getByText("BACK")).toBeInTheDocument();
  });

  it("back button links to the home page", () => {
    render(<Header showBack />);
    const backLink = screen.getAllByRole("link").find((el) =>
      el.textContent?.includes("BACK")
    );
    expect(backLink?.getAttribute("href")).toBe("/");
  });
});

describe("Header — showWallet=false (default)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(makeCtx());
    mockLanguage("en");
  });

  it("does not show a connect button when showWallet is not set", () => {
    render(<Header />);
    expect(screen.queryByText("CONNECT")).not.toBeInTheDocument();
    expect(screen.queryByText("CONNECTING...")).not.toBeInTheDocument();
  });
});

describe("Header — showWallet with no user", () => {
  const connectWallet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(makeCtx({ user: null, connectWallet, isConnecting: false }));
    mockLanguage("en");
  });

  it("renders the connect button when no user is connected", () => {
    render(<Header showWallet />);
    expect(screen.getByText("CONNECT")).toBeInTheDocument();
  });

  it("connect button is enabled when not already connecting", () => {
    render(<Header showWallet />);
    expect(screen.getByText("CONNECT")).not.toBeDisabled();
  });

  it("connect button is disabled while isConnecting is true", () => {
    mockUseWallet.mockReturnValue(makeCtx({ user: null, isConnecting: true }));
    render(<Header showWallet />);
    expect(screen.getByText("CONNECTING...")).toBeDisabled();
  });

  it("calls connectWallet when connect button is clicked", async () => {
    connectWallet.mockResolvedValue(undefined);
    render(<Header showWallet />);
    fireEvent.click(screen.getByText("CONNECT"));
    await waitFor(() => expect(connectWallet).toHaveBeenCalledTimes(1));
  });

  it("shows Pi Browser required warning when not in Pi Browser", () => {
    mockUseWallet.mockReturnValue(makeCtx({ user: null, isPiBrowser: false }));
    render(<Header showWallet />);
    expect(screen.getByText(/Pi Browser required/)).toBeInTheDocument();
  });
});

describe("Header — showWallet with authenticated user", () => {
  const mockUser = {
    id: "u1",
    walletAddress: "pi:user1",
    xp: 100,
    tier: "Citizen" as const,
    trustScore: 70,
    createdAt: new Date().toISOString(),
    actions: [],
    stamps: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(makeCtx({ user: mockUser }));
    mockLanguage("en");
  });

  it("renders the dashboard link when user is authenticated", () => {
    render(<Header showWallet />);
    const dashboardLinks = screen.getAllByRole("link").filter((el) =>
      el.getAttribute("href") === "/dashboard"
    );
    expect(dashboardLinks.length).toBeGreaterThan(0);
  });

  it("renders the dashboard text", () => {
    render(<Header showWallet />);
    expect(screen.getByText("AxiomID Dashboard")).toBeInTheDocument();
  });

  it("renders the logout button", () => {
    render(<Header showWallet />);
    expect(screen.getByText("LOGOUT")).toBeInTheDocument();
  });

  it("calls logout when logout button is clicked", () => {
    const logout = jest.fn();
    mockUseWallet.mockReturnValue(makeCtx({ user: mockUser, logout }));
    render(<Header showWallet />);
    fireEvent.click(screen.getByText("LOGOUT"));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("does not show connect button when user is authenticated", () => {
    render(<Header showWallet />);
    expect(screen.queryByText("CONNECT")).not.toBeInTheDocument();
  });
});

describe("Header — Pi Browser indicator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLanguage("en");
  });

  it("shows 'Pi Browser' badge when in Pi Browser and no user connected", () => {
    mockUseWallet.mockReturnValue(makeCtx({ user: null, isPiBrowser: true }));
    render(<Header showWallet />);
    expect(screen.getByText("Pi Browser")).toBeInTheDocument();
  });

  it("does not show 'Pi Browser required' warning when in Pi Browser", () => {
    mockUseWallet.mockReturnValue(makeCtx({ user: null, isPiBrowser: true }));
    render(<Header showWallet />);
    expect(screen.queryByText(/Pi Browser required/)).not.toBeInTheDocument();
  });
});

// ─── PR change: handleConnect uses boolean return value (no try/catch) ────────
describe("Header — handleConnect (PR change: boolean return check)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows 'Connection failed' error when connectWallet returns false", async () => {
    const connectWallet = jest.fn().mockResolvedValue(false);
    mockUseWallet.mockReturnValue(makeCtx({ user: null, connectWallet, isConnecting: false }));
    render(<Header showWallet />);

    await act(async () => {
      fireEvent.click(screen.getByText("CONNECT"));
    });

    expect(screen.getByText("Connection failed")).toBeInTheDocument();
  });

  it("does NOT show error when connectWallet returns true", async () => {
    const connectWallet = jest.fn().mockResolvedValue(true);
    mockUseWallet.mockReturnValue(makeCtx({ user: null, connectWallet, isConnecting: false }));
    render(<Header showWallet />);

    await act(async () => {
      fireEvent.click(screen.getByText("CONNECT"));
    });

    expect(screen.queryByText("Connection failed")).not.toBeInTheDocument();
    expect(screen.queryByText(/فشل الاتصال/)).not.toBeInTheDocument();
  });

  it("shows error when connectWallet returns undefined (falsy)", async () => {
    // connectWallet returning undefined is falsy, so error should appear
    const connectWallet = jest.fn().mockResolvedValue(undefined);
    mockUseWallet.mockReturnValue(makeCtx({ user: null, connectWallet, isConnecting: false }));
    render(<Header showWallet />);

    await act(async () => {
      fireEvent.click(screen.getByText("CONNECT"));
    });

    // undefined is falsy → shows error
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
  });

  it("error message disappears after 6 seconds", async () => {
    const connectWallet = jest.fn().mockResolvedValue(false);
    mockUseWallet.mockReturnValue(makeCtx({ user: null, connectWallet, isConnecting: false }));
    render(<Header showWallet />);

    await act(async () => {
      fireEvent.click(screen.getByText("CONNECT"));
    });

    expect(screen.getByText("Connection failed")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    await waitFor(() => {
      expect(screen.queryByText("Connection failed")).not.toBeInTheDocument();
    });
  });

  it("calls connectWallet exactly once per click", async () => {
    const connectWallet = jest.fn().mockResolvedValue(true);
    mockUseWallet.mockReturnValue(makeCtx({ user: null, connectWallet, isConnecting: false }));
    render(<Header showWallet />);

    await act(async () => {
      fireEvent.click(screen.getByText("CONNECT"));
    });

    expect(connectWallet).toHaveBeenCalledTimes(1);
  });
});