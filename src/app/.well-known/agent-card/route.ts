import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { apiError, apiSuccess } from "@/lib/errors";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";
import type { UserAgent, Skill, SkillInstallation } from "@prisma/client";

type AgentWithSkills = UserAgent & {
  installedSkills: (SkillInstallation & { skill: Skill })[];
};

// A2A v1.0 AgentSkill schema
interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  examples: string[];
  inputModes: string[];
  outputModes: string[];
}

// A2A v1.0 SecurityScheme uses protobuf oneof — httpAuthSecurityScheme discriminator
interface AgentSecurityScheme {
  httpAuthSecurityScheme: {
    scheme: string;
    bearerFormat: string;
  };
}

// A2A v1.0 AgentCard schema
interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  iconUrl?: string;
  capabilities: {
    streaming: false;
    pushNotifications: false;
  };
  securitySchemes: Record<string, AgentSecurityScheme>;
  security: Record<string, string[]>[];
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentSkill[];
  // AxiomID extension fields (namespaced per A2A extension spec)
  "x-axiomid-did"?: string;
  "x-axiomid-lastActive"?: string;
}

// A2A v1.0 agent-directory wrapper (AxiomID extension for multi-agent)
interface AgentDirectory {
  kind: "agent-directory";
  name: "AxiomID Agent Directory";
  description: "Discoverable agents on the AxiomID protocol";
  url: "https://axiomid.app";
  provider: {
    organization: "AxiomID";
    url: "https://axiomid.app";
  };
  version: "1.0.0";
  agents: AgentCard[];
  total: number;
}

function buildAgentUrl(subdomain: string | null): string {
  if (subdomain) return `https://${subdomain}.axiomid.app`;
  return "https://axiomid.app";
}

function buildAgentCard(agent: AgentWithSkills): AgentCard {
  const skills: AgentSkill[] = agent.installedSkills.map((is) => ({
    id: is.skill.slug,
    name: is.skill.name,
    description: is.skill.description ?? "",
    tags: [],
    examples: [],
    inputModes: ["text/plain"],
    outputModes: ["text/plain"],
  }));

  const card: AgentCard = {
    name: agent.name,
    description: agent.description ?? "",
    url: buildAgentUrl(agent.subdomain),
    version: "1.0.0",
    capabilities: { streaming: false, pushNotifications: false },
    securitySchemes: {
      didKey: {
        httpAuthSecurityScheme: {
          scheme: "bearer",
          bearerFormat: "did:key",
        },
      },
    },
    security: [{ didKey: [] }],
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    skills,
  };

  if (agent.avatarUrl) {
    card.iconUrl = agent.avatarUrl;
  }
  if (agent.did) {
    card["x-axiomid-did"] = agent.did;
  }
  if (agent.lastActive) {
    card["x-axiomid-lastActive"] = agent.lastActive.toISOString();
  }

  return card;
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(
    `agent-card:${ip}`,
    RATE_LIMITS.public
  );
  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many requests. Try again later.",
      undefined,
      {
        "Retry-After": String(
          Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
        ),
      }
    );
  }

  try {
    const agents = await prisma.userAgent.findMany({
      where: { status: "ACTIVE", discoverable: true },
      include: {
        installedSkills: {
          where: { status: "active" },
          include: { skill: true },
        },
      },
    });

    const cards: AgentCard[] = agents.map(buildAgentCard);

    const directory: AgentDirectory = {
      kind: "agent-directory",
      name: "AxiomID Agent Directory",
      description: "Discoverable agents on the AxiomID protocol",
      url: "https://axiomid.app",
      provider: { organization: "AxiomID", url: "https://axiomid.app" },
      version: "1.0.0",
      agents: cards,
      total: cards.length,
    };

    return apiSuccess(directory, 200, {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
    });
  } catch (err) {
    logger.error("[.well-known/agent-card] Error:", err);
    return apiError("INTERNAL_ERROR", "Failed to generate AgentCard directory");
  }
}
