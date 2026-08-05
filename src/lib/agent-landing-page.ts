/**
 * Agent landing page generator for Here.now
 *
 * Creates a public, shareable landing page for each AxiomID agent on here.now.
 * These pages serve as "business cards" for agents — visible outside the
 * AxiomID ecosystem, SEO-friendly, and automatically updated via cron.
 *
 * --- OFFICIAL DOCUMENTATION ---
 * Here.now: https://here.now
 * Client: src/lib/herenow.ts (HereNowClient interface)
 * Full catalog: docs/AGENT_SERVICE_CATALOG.md §10
 *
 * --- AGENT QUICK START ---
 * 1. Read this file for the HTML template structure (generateAgentLandingHtml)
 * 2. Call publishAgentLandingPage(agentId) to publish a single agent
 * 3. Call publishAllAgentLandingPages() in a cron for daily refresh
 * 4. The URL is stored on UserAgent.hereNowUrl in the database
 * 5. Requires HERENOW_TOKEN env var to be set
 *
 * Flow:
 *   1. Agent activates on AxiomID → cron triggers publishAgentLandingPage()
 *   2. Here.now page created with passport card, trust score, skills, QR
 *   3. Page URL stored on agent record (hereNowUrl field)
 *   4. Daily review cron refreshes the page with latest trust score
 */

import { createHereNowClient, type HereNowClient } from "./herenow";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { calculateTrustScore } from "./trust";
import type { UserAgent, Skill, SkillInstallation } from "@prisma/client";

type AgentWithRelations = UserAgent & {
  user: { piUsername: string; walletAddress: string | null; xp: number };
  installedSkills: (SkillInstallation & { skill: Skill })[];
};

/**
 * Generates the HTML landing page for an agent.
 * This is a standalone HTML document (no React) that renders on here.now.
 */
export function generateAgentLandingHtml(agent: AgentWithRelations, trustScore: number): string {
  const agentUrl = agent.subdomain
    ? `https://${agent.subdomain}.axiomid.app`
    : `https://axiomid.app/agent/${agent.user.piUsername}`;

  const passportUrl = `https://axiomid.app/passport/${agent.user.piUsername}`;
  const skillsHtml = agent.installedSkills
    .filter((is) => is.status === "active")
    .map(
      (is) =>
        `<span class="skill-chip">${escapeHtml(is.skill.name)}</span>`
    )
    .join("");

  const trustColor = trustScore >= 80 ? "#22c55e" : trustScore >= 50 ? "#f59e0b" : "#ef4444";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(agent.name)} — AxiomID Agent</title>
  <meta name="description" content="${escapeHtml(agent.description || "An autonomous agent on the AxiomID protocol")}">
  <meta property="og:title" content="${escapeHtml(agent.name)} — AxiomID Agent" />
  <meta property="og:description" content="Trust Score: ${trustScore}/100 · DID: ${escapeHtml(agent.did || "N/A")}" />
  <meta property="og:type" content="profile" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #fafafa; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .card { max-width: 480px; width: 100%; background: linear-gradient(145deg, #14141a, #0f0f14); border: 1px solid #27272a; border-radius: 24px; padding: 2rem; position: relative; overflow: hidden; }
    .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #8b5cf6, #3b82f6); }
    .header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .avatar { width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 700; color: white; flex-shrink: 0; }
    .avatar img { width: 100%; height: 100%; border-radius: 16px; object-fit: cover; }
    .name { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.25rem; }
    .piUsername { font-size: 0.85rem; color: #71717a; font-family: ui-monospace, monospace; }
    .trust-ring { display: flex; align-items: center; gap: 0.5rem; margin: 1rem 0; padding: 0.75rem 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; }
    .trust-score { font-size: 1.5rem; font-weight: 700; color: ${trustColor}; }
    .trust-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 1rem 0; }
    .meta-item { padding: 0.75rem; background: rgba(255,255,255,0.02); border-radius: 10px; }
    .meta-label { font-size: 0.65rem; text-transform: uppercase; color: #71717a; margin-bottom: 0.25rem; }
    .meta-value { font-size: 0.9rem; font-family: ui-monospace, monospace; word-break: break-all; }
    .skills { margin: 1rem 0; }
    .skills-label { font-size: 0.65rem; text-transform: uppercase; color: #71717a; margin-bottom: 0.5rem; }
    .skill-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .skill-chip { padding: 0.3rem 0.7rem; background: rgba(139,92,246,0.15); color: #a78bfa; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
    .actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
    .btn { flex: 1; padding: 0.75rem; text-align: center; border-radius: 10px; font-size: 0.85rem; font-weight: 600; text-decoration: none; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.85; }
    .btn-primary { background: #8b5cf6; color: white; }
    .btn-secondary { background: rgba(255,255,255,0.05); color: #fafafa; border: 1px solid #27272a; }
    .footer { margin-top: 1.5rem; text-align: center; font-size: 0.7rem; color: #52525b; }
    .footer a { color: #8b5cf6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="avatar">
        ${agent.avatarUrl ? `<img src="${escapeHtml(agent.avatarUrl)}" alt="${escapeHtml(agent.name)}" />` : escapeHtml(agent.name.slice(0, 2).toUpperCase())}
      </div>
      <div>
        <div class="name">${escapeHtml(agent.name)}</div>
        <div class="username">@${escapeHtml(agent.user.piUsername)}</div>
      </div>
    </div>

    ${agent.description ? `<p style="color:#a1a1aa;font-size:0.9rem;margin-bottom:1rem;">${escapeHtml(agent.description)}</p>` : ""}

    <div class="trust-ring">
      <div class="trust-score">${trustScore}</div>
      <div>
        <div class="trust-label">Trust Score</div>
        <div style="font-size:0.7rem;color:#52525b;">out of 100</div>
      </div>
    </div>

    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">DID</div>
        <div class="meta-value">${agent.did ? escapeHtml(agent.did.slice(0, 24)) + "..." : "N/A"}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Status</div>
        <div class="meta-value" style="color:${agent.status === "ACTIVE" ? "#22c55e" : "#71717a"}">${agent.status}</div>
      </div>
    </div>

    ${skillsHtml ? `
    <div class="skills">
      <div class="skills-label">Skills (${agent.installedSkills.filter(is => is.status === "active").length})</div>
      <div class="skill-chips">${skillsHtml}</div>
    </div>` : ""}

    <div class="actions">
      <a href="${passportUrl}" class="btn btn-primary">View Passport</a>
      <a href="${agentUrl}" class="btn btn-secondary">Agent Profile</a>
    </div>

    <div class="footer">
      Powered by <a href="https://axiomid.app">AxiomID</a> · The Human Authorization Protocol
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Publishes or updates an agent's landing page on here.now.
 * Called by cron job after agent activation or daily review.
 */
export async function publishAgentLandingPage(
  agentId: string,
  client?: HereNowClient
): Promise<{ url: string; published: boolean } | null> {
  const hereNow = client || createHereNowClient();

  try {
    const agent = await prisma.userAgent.findUnique({
      where: { id: agentId },
      include: {
        user: { select: { piUsername: true, walletAddress: true, xp: true } },
        installedSkills: {
          where: { status: "active" },
          include: { skill: true },
          take: 20,
        },
      },
    });

    if (!agent || agent.status !== "ACTIVE") {
      logger.info(`[here.now] Agent ${agentId} not found or inactive — skipping landing page`);
      return null;
    }

    // Calculate current trust score
    const trustScore = calculateTrustScore(agent.user.xp, 0);

    // Generate landing page HTML
    const html = generateAgentLandingHtml(agent as AgentWithRelations, trustScore);
    const slug = `axiomid-agent-${agent.user.piUsername}`;

    // Publish to here.now
    const result = await hereNow.publishPage({
      title: `${agent.name} — AxiomID Agent`,
      slug,
      html,
    });

    // Store the URL on the agent record
    await prisma.userAgent.update({
      where: { id: agentId },
      data: { hereNowUrl: result.url },
    });

    logger.info(`[here.now] Published landing page for agent ${agent.user.piUsername}: ${result.url}`);
    return { url: result.url, published: true };
  } catch (err) {
    logger.error(`[here.now] Failed to publish landing page for agent ${agentId}:`, err);
    return null;
  }
}

/**
 * Publishes landing pages for all active agents.
 * Called by the daily review cron job.
 */
export async function publishAllAgentLandingPages(): Promise<{
  published: number;
  failed: number;
  skipped: number;
}> {
  const agents = await prisma.userAgent.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const agent of agents) {
    const result = await publishAgentLandingPage(agent.id);
    if (result?.published) published++;
    else if (result === null) skipped++;
    else failed++;
  }

  logger.info(
    `[here.now] Batch publish complete: ${published} published, ${failed} failed, ${skipped} skipped`
  );
  return { published, failed, skipped };
}
