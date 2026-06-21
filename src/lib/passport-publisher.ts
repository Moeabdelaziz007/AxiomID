import { createHereNowClient } from "./herenow";
import { prisma } from "./prisma";
import { logger } from "./logger";

export interface PassportData {
  userId: string;
  username: string;
  did: string;
  tier: string;
  xp: number;
  trustScore: number;
  walletAddress?: string;
  stellarAddress?: string;
  kyaStatus: "verified" | "pending" | "denied";
  kycStatus: "verified" | "pending" | "denied";
  stamps: { type: string; provider: string }[];
  agentName?: string;
  issuedDate: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tierBadgeColor(tier: string): string {
  const colors: Record<string, string> = {
    Visitor: "#6b7280",
    Citizen: "#3b82f6",
    Sentinel: "#8b5cf6",
    Guardian: "#f59e0b",
    Architect: "#10b981",
    Sovereign: "#ef4444",
  };
  return colors[tier] || "#6b7280";
}

function statusIcon(status: string): string {
  if (status === "verified") return "✅";
  if (status === "pending") return "⏳";
  return "❌";
}

export function generatePassportHtml(data: PassportData): string {
  const tierColor = tierBadgeColor(data.tier);
  const displayAddress = data.stellarAddress || data.walletAddress || "";
  const shortAddress =
    displayAddress.length > 20
      ? `${displayAddress.slice(0, 10)}...${displayAddress.slice(-8)}`
      : displayAddress;

  const stampRows = data.stamps
    .map(
      (s) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#94a3b8">${escapeHtml(s.type)}</td><td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#e2e8f0">${escapeHtml(s.provider)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(data.username)} — AxiomID Passport</title>
<meta property="og:title" content="${escapeHtml(data.username)} — AxiomID Passport">
<meta property="og:description" content="Tier ${escapeHtml(data.tier)} | Trust Score ${data.trustScore} | ${data.xp} XP">
<meta name="twitter:card" content="summary">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f172a;color:#e2e8f0;font-family:'Inter',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#1e293b;border:1px solid #334155;border-radius:16px;max-width:480px;width:100%;overflow:hidden}
.header{background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 24px;text-align:center;border-bottom:1px solid #334155}
.avatar{width:80px;height:80px;border-radius:50%;background:${tierColor};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;font-weight:700;color:#fff}
.username{font-size:24px;font-weight:700;margin-bottom:4px}
.tier{display:inline-block;padding:4px 12px;border-radius:9999px;background:${tierColor};color:#fff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em}
.did{font-family:'JetBrains Mono',monospace;font-size:11px;color:#64748b;margin-top:12px;word-break:break-all}
.body{padding:24px}
.stat-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #1e293b}
.stat-label{color:#94a3b8;font-size:14px}
.stat-value{font-weight:600;font-size:14px}
.stamps{margin-top:20px}
.stamps h3{font-size:14px;color:#94a3b8;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em}
table{width:100%;border-collapse:collapse}
.footer{padding:16px 24px;border-top:1px solid #334155;text-align:center;font-size:12px;color:#475569}
.footer a{color:#3b82f6;text-decoration:none}
</style>
</head>
<body>
<div class="card">
<div class="header">
<div class="avatar">${escapeHtml(data.username.charAt(0).toUpperCase())}</div>
<div class="username">${escapeHtml(data.username)}</div>
<div class="tier">${escapeHtml(data.tier)}</div>
<div class="did">${escapeHtml(data.did)}</div>
</div>
<div class="body">
<div class="stat-row"><span class="stat-label">Trust Score</span><span class="stat-value">${data.trustScore}</span></div>
<div class="stat-row"><span class="stat-label">Experience</span><span class="stat-value">${data.xp.toLocaleString()} XP</span></div>
${shortAddress ? `<div class="stat-row"><span class="stat-label">Address</span><span class="stat-value" style="font-family:monospace;font-size:12px">${escapeHtml(shortAddress)}</span></div>` : ""}
<div class="stat-row"><span class="stat-label">KYA</span><span class="stat-value">${statusIcon(data.kyaStatus)} ${data.kyaStatus}</span></div>
<div class="stat-row"><span class="stat-label">KYC</span><span class="stat-value">${statusIcon(data.kycStatus)} ${data.kycStatus}</span></div>
${data.agentName ? `<div class="stat-row"><span class="stat-label">Agent</span><span class="stat-value">${escapeHtml(data.agentName)}</span></div>` : ""}
${data.stamps.length > 0 ? `<div class="stamps"><h3>Stamps</h3><table>${stampRows}</table></div>` : ""}
</div>
<div class="footer">Issued ${escapeHtml(data.issuedDate)} · <a href="https://axiomid.app">AxiomID</a></div>
</div>
</body>
</html>`;
}

export interface PublishPassportResult {
  url: string;
  publishedAt: string;
}

export async function publishPassport(data: PassportData): Promise<PublishPassportResult> {
  const client = createHereNowClient();
  const html = generatePassportHtml(data);

  const slug = data.username || data.userId;
  const { url } = await client.publishPage({
    title: `${data.username} — AxiomID Passport`,
    slug,
    html,
  });

  // Persist URL to database
  await prisma.user.update({
    where: { id: data.userId },
    data: { passportUrl: url },
  });

  logger.info("[PASSPORT-PUBLISHER] Published passport", {
    userId: data.userId,
    username: data.username,
    url,
  });

  return { url, publishedAt: new Date().toISOString() };
}
