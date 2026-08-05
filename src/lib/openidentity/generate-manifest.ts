/**
 * OpenIdentity manifest generator for AxiomID agents.
 * Produces a portable identity manifest following the OpenIdentity v0.1 spec.
 *
 * The manifest describes an AI agent's identity, its human controller, the
 * capabilities the agent exposes, and any linked wallet/passport references.
 * It is intended to be served from a well-known endpoint
 * (/.well-known/openidentity) so other agents and verifiers can resolve and
 * inspect an agent's identity without a separate registry.
 */

export interface OpenIdentityManifest {
  openidentity: string;
  agent: {
    id: string;
    name: string;
    type: string;
    version?: string;
    description?: string;
  };
  controller: {
    type: string;
    name: string;
    verified: boolean;
    url?: string;
  };
  verification?: {
    type: string;
    url: string;
  };
  capabilities: {
    roles: string[];
    skills: string[];
  };
  wallets?: {
    type: string;
    address: string;
  }[];
  links?: {
    homepage?: string;
    repository?: string;
    passport?: string;
  };
}

export interface GenerateManifestParams {
  agentId: string;
  agentName: string;
  agentType?: string;
  controllerName: string;
  controllerVerified: boolean;
  roles: string[];
  skills: string[];
  walletAddress?: string;
  passportUrl?: string;
  /**
   * Optional wallet type override. Defaults to "pi-network" — the only wallet
   * provider AxiomID currently integrates with. Keeping this overridable lets
   * callers describe multi-wallet agents without changing the generator.
   */
  walletType?: string;
}

/**
 * Generate an OpenIdentity v0.1 manifest for an AxiomID agent.
 *
 * The function is pure: it derives the manifest entirely from `params` and
 * never reads from process.env or the network. This keeps it safe to call from
 * both Server Components and route handlers, and trivially testable.
 */
export function generateManifest(params: GenerateManifestParams): OpenIdentityManifest {
  const walletType = params.walletType ?? "pi-network";

  const manifest: OpenIdentityManifest = {
    openidentity: "0.1",
    agent: {
      id: params.agentId,
      name: params.agentName,
      type: params.agentType ?? "ai-agent",
    },
    controller: {
      type: "human",
      name: params.controllerName,
      verified: params.controllerVerified,
    },
    capabilities: {
      roles: params.roles,
      skills: params.skills,
    },
  };

  if (params.walletAddress) {
    manifest.wallets = [
      {
        type: walletType,
        address: params.walletAddress,
      },
    ];
  }

  if (params.passportUrl) {
    manifest.links = {
      passport: params.passportUrl,
    };
  }

  return manifest;
}

/**
 * Minimal structural validation for an OpenIdentity manifest.
 * Returns `true` when the manifest contains the required top-level fields and
 * each nested object has the keys mandated by the v0.1 spec. This is a shape
 * check, not a semantic check — callers should still verify that `agent.id`
 * resolves and `controller.verified` reflects the actual verification state.
 */
export function validateManifest(manifest: unknown): manifest is OpenIdentityManifest {
  if (typeof manifest !== "object" || manifest === null) return false;
  const m = manifest as Record<string, unknown>;

  if (typeof m.openidentity !== "string") return false;
  if (typeof m.agent !== "object" || m.agent === null) return false;
  const agent = m.agent as Record<string, unknown>;
  if (
    typeof agent.id !== "string" ||
    typeof agent.name !== "string" ||
    typeof agent.type !== "string"
  ) {
    return false;
  }

  if (typeof m.controller !== "object" || m.controller === null) return false;
  const controller = m.controller as Record<string, unknown>;
  if (
    typeof controller.type !== "string" ||
    typeof controller.name !== "string" ||
    (controller.verified !== undefined && typeof controller.verified !== "boolean") ||
    (controller.url !== undefined && typeof controller.url !== "string")
  ) {
    return false;
  }

  if (typeof m.capabilities !== "object" || m.capabilities === null) return false;
  const capabilities = m.capabilities as Record<string, unknown>;
  if (
    !Array.isArray(capabilities.roles) ||
    !capabilities.roles.every((r) => typeof r === "string") ||
    !Array.isArray(capabilities.skills) ||
    !capabilities.skills.every((s) => typeof s === "string")
  ) {
    return false;
  }

  if (m.wallets !== undefined) {
    if (!Array.isArray(m.wallets)) return false;
    for (const w of m.wallets) {
      if (typeof w !== "object" || w === null) return false;
      const wallet = w as Record<string, unknown>;
      if (
        typeof wallet.type !== "string" ||
        (wallet.address !== undefined && typeof wallet.address !== "string") ||
        (wallet.url !== undefined && typeof wallet.url !== "string")
      ) {
        return false;
      }
    }
  }

  if (m.links !== undefined) {
    if (typeof m.links !== "object" || m.links === null) return false;
  }

  return true;
}
