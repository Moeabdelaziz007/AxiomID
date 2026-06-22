/**
 * Tests for src/app/dashboard/sandbox/page.tsx
 *
 * PR changes covered:
 * - AUDIT_ITEMS now uses labelKey/descKey instead of hardcoded label/desc strings
 * - All text strings replaced with t() calls using i18n keys
 * - Added beginner-friendly intro section (sandbox_intro_title, _desc, _step_1/2/3)
 * - AUDIT_ITEMS: { id, labelKey, descKey } shape (was { id, label, desc })
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import SandboxPage from "@/app/dashboard/sandbox/page";

// Mock fetch for the skills API call on mount
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  // Default: resolve with empty skills list so the component renders fully
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ skills: [] }),
  });
});

// The global mock from jest.setup.js returns the key string for unknown keys.
// All sandbox_* keys are new in this PR so they render as their key names.

describe("SandboxPage — i18n title and status (PR change)", () => {
  it("renders without crashing", async () => {
    expect(() => render(<SandboxPage />)).not.toThrow();
  });

  it("renders sandbox_title as the page heading", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_title")).toBeInTheDocument();
    });
  });

  it("renders sandbox_idle status when not executing", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_idle")).toBeInTheDocument();
    });
  });

  it("does NOT render old hardcoded title 'Developer Sandbox'", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.queryByText("Developer Sandbox")).toBeNull();
    });
  });

  it("does NOT render old hardcoded status 'ENGINE IDLE'", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      // Old value was "ENGINE IDLE" as hardcoded text; now it's t("sandbox_idle")
      // which returns "sandbox_idle" via the global mock
      expect(screen.queryByText("ENGINE IDLE")).toBeNull();
    });
  });
});

describe("SandboxPage — beginner-friendly intro section (PR change)", () => {
  it("renders the sandbox_intro_title key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_intro_title")).toBeInTheDocument();
    });
  });

  it("renders the sandbox_intro_desc key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_intro_desc")).toBeInTheDocument();
    });
  });

  it("renders the sandbox_step_1 key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_step_1")).toBeInTheDocument();
    });
  });

  it("renders the sandbox_step_2 key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_step_2")).toBeInTheDocument();
    });
  });

  it("renders the sandbox_step_3 key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_step_3")).toBeInTheDocument();
    });
  });

  it("renders step number indicators '1.', '2.', '3.'", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("1.")).toBeInTheDocument();
      expect(screen.getByText("2.")).toBeInTheDocument();
      expect(screen.getByText("3.")).toBeInTheDocument();
    });
  });
});

describe("SandboxPage — AUDIT_ITEMS use labelKey/descKey (PR change)", () => {
  it("renders sandbox_sandbox_isolation key as an audit item label", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_sandbox_isolation")).toBeInTheDocument();
    });
  });

  it("renders sandbox_sandbox_desc key as an audit item description", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_sandbox_desc")).toBeInTheDocument();
    });
  });

  it("renders sandbox_ast_analysis key as an audit item label", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_ast_analysis")).toBeInTheDocument();
    });
  });

  it("renders sandbox_ast_desc key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_ast_desc")).toBeInTheDocument();
    });
  });

  it("renders sandbox_injection_guard key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_injection_guard")).toBeInTheDocument();
    });
  });

  it("renders sandbox_signature_anchor key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_signature_anchor")).toBeInTheDocument();
    });
  });

  it("renders sandbox_exfil_scan key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_exfil_scan")).toBeInTheDocument();
    });
  });

  it("renders sandbox_command_block key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_command_block")).toBeInTheDocument();
    });
  });

  it("renders sandbox_privilege_guard key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_privilege_guard")).toBeInTheDocument();
    });
  });

  it("renders sandbox_provenance_check key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_provenance_check")).toBeInTheDocument();
    });
  });

  it("renders all 8 audit items (one for each AUDIT_ITEMS entry)", async () => {
    render(<SandboxPage />);

    await waitFor(() => {
      // All 8 labelKeys must be present
      expect(screen.getByText("sandbox_sandbox_isolation")).toBeInTheDocument();
      expect(screen.getByText("sandbox_ast_analysis")).toBeInTheDocument();
      expect(screen.getByText("sandbox_injection_guard")).toBeInTheDocument();
      expect(screen.getByText("sandbox_signature_anchor")).toBeInTheDocument();
      expect(screen.getByText("sandbox_exfil_scan")).toBeInTheDocument();
      expect(screen.getByText("sandbox_command_block")).toBeInTheDocument();
      expect(screen.getByText("sandbox_privilege_guard")).toBeInTheDocument();
      expect(screen.getByText("sandbox_provenance_check")).toBeInTheDocument();
    });
  });

  it("does NOT render old hardcoded label 'Sandbox Isolation'", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.queryByText("Sandbox Isolation")).toBeNull();
    });
  });

  it("does NOT render old hardcoded label 'Static AST Analysis'", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.queryByText("Static AST Analysis")).toBeNull();
    });
  });

  it("does NOT render old hardcoded desc 'Isolated microVM container instance.'", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.queryByText("Isolated microVM container instance.")).toBeNull();
    });
  });

  it("does NOT render old hardcoded label 'Provenance Check'", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.queryByText("Provenance Check")).toBeNull();
    });
  });
});

describe("SandboxPage — security scan section labels (PR change)", () => {
  it("renders sandbox_security_scan key as the security section heading", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_security_scan")).toBeInTheDocument();
    });
  });

  it("renders sandbox_security_desc key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_security_desc")).toBeInTheDocument();
    });
  });

  it("does NOT render old hardcoded security scan title 'Agensi Security Scan'", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.queryByText("Agensi Security Scan")).toBeNull();
    });
  });
});

describe("SandboxPage — editor and input labels (PR change)", () => {
  it("renders sandbox_edit_manifest key as editor tab label", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_edit_manifest")).toBeInTheDocument();
    });
  });

  it("renders sandbox_ast_preview key as AST tab label", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_ast_preview")).toBeInTheDocument();
    });
  });

  it("renders sandbox_input_payload key as input section label", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_input_payload")).toBeInTheDocument();
    });
  });

  it("renders sandbox_run_test as the run button text (not executing)", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_run_test")).toBeInTheDocument();
    });
  });

  it("renders sandbox_copy_payload key", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_copy_payload")).toBeInTheDocument();
    });
  });

  it("does NOT render old hardcoded run button text 'RUN TEST IN VERCEL SANDBOX'", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.queryByText("RUN TEST IN VERCEL SANDBOX")).toBeNull();
    });
  });
});

describe("SandboxPage — available templates section (PR change)", () => {
  it("renders sandbox_available_templates key as section heading", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_available_templates")).toBeInTheDocument();
    });
  });

  it("renders sandbox_no_templates key when skills list is empty", async () => {
    // Mock returns empty skills list (set up in beforeEach)
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_no_templates")).toBeInTheDocument();
    });
  });

  it("does NOT render old hardcoded 'No templates seeded.' text", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.queryByText("No templates seeded.")).toBeNull();
    });
  });
});

describe("SandboxPage — terminal section (PR change)", () => {
  it("renders sandbox_terminal_output key as terminal section heading", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_terminal_output")).toBeInTheDocument();
    });
  });

  it("renders sandbox_waiting key in the waiting state (no logs)", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_waiting")).toBeInTheDocument();
    });
  });

  it("does NOT render old hardcoded waiting message", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(
        screen.queryByText(/Waiting for execution triggers/)
      ).toBeNull();
    });
  });
});

describe("SandboxPage — hint text on editor panels (PR change)", () => {
  it("renders sandbox_manifest_hint below the manifest editor", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_manifest_hint")).toBeInTheDocument();
    });
  });

  it("renders sandbox_input_hint below the input editor", async () => {
    render(<SandboxPage />);
    await waitFor(() => {
      expect(screen.getByText("sandbox_input_hint")).toBeInTheDocument();
    });
  });
});