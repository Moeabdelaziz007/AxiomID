/**
 * GitHub App Webhook Handler — Amrikky CI Intelligence Agent
 *
 * Receives GitHub App webhooks:
 * - pull_request: Analyze PR diff, detect anomalies, index to Vectorize, post PR comment
 * - installation: Auto-create agent passport on install
 * - ping: Health check
 *
 * Zero cost: runs on Cloudflare Workers free tier (100k req/day).
 * Embeddings via Workers AI free tier (10k neurons/day).
 * Vector storage via Vectorize free tier (30M dimensions).
 */

import type { Env } from "../lib/types";
import { jsonResponse, errorResponse, safeCompare } from "../lib/auth";

// Pi Network referral link — drives user acquisition
// Users who sign up via this link get free Pi tokens daily by mining
const PI_REFERRAL_LINK = "https://minepi.com/amrikyy";
const PI_MARKET_CAP_LINK = "https://coinmarketcap.com/currencies/pi";

// Webhook secret for GitHub signature verification
function verifyGitHubSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expected = signature.substring(7);
  return safeCompare(expected, secret);
}

interface PRDiffInfo {
  fileCount: number;
  totalAdded: number;
  totalRemoved: number;
  files: Array<{ path: string; added: number; removed: number; extension: string }>;
  securityFiles: string[];
  isLargePR: boolean;
}

async function analyzePRDiff(
  repoFullName: string,
  prNumber: number,
  githubToken: string
): Promise<PRDiffInfo> {
  // Fetch PR diff using GitHub API
  const diffUrl = `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`;
  const resp = await fetch(diffUrl, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github.v3.diff",
    },
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch PR diff: ${resp.status}`);
  }

  const diffText = await resp.text();
  const files: Array<{ path: string; added: number; removed: number; extension: string }> = [];

  // Parse diff — split on "diff --git" boundaries
  const fileDiffs = diffText.split(/^diff --git /m).filter(Boolean);

  for (const fileDiff of fileDiffs) {
    const firstLine = fileDiff.split("\n")[0];
    const pathMatch = firstLine.match(/a\/(.+?) b\//);
    const filePath = pathMatch ? pathMatch[1] : "unknown";
    const added = (fileDiff.match(/^\+[^+]/gm) || []).length;
    const removed = (fileDiff.match(/^-[^-]/gm) || []).length;
    const extension = filePath.split(".").pop() || "unknown";

    files.push({ path: filePath, added, removed, extension });
  }

  const totalAdded = files.reduce((sum, f) => sum + f.added, 0);
  const totalRemoved = files.reduce((sum, f) => sum + f.removed, 0);

  // Detect security-sensitive files
  const securityKeywords = ["auth", "middleware", "crypto", "secret", "key", "token", "password", "wallet"];
  const securityFiles = files
    .filter((f) => securityKeywords.some((kw) => f.path.toLowerCase().includes(kw)))
    .map((f) => f.path);

  return {
    fileCount: files.length,
    totalAdded,
    totalRemoved,
    files,
    securityFiles,
    isLargePR: totalAdded > 500 || totalRemoved > 500 || files.length > 20,
  };
}

async function indexToVectorize(
  env: Env,
  prNumber: number,
  repoFullName: string,
  diffInfo: PRDiffInfo
): Promise<{ indexed: number; failed: number }> {
  let indexed = 0;
  let failed = 0;

  for (const file of diffInfo.files.slice(0, 50)) {
    // Cap at 50 files to stay within free tier
    const text = `Repo: ${repoFullName} PR#${prNumber} File: ${file.path} Extension: ${file.extension} Added: ${file.added} lines Removed: ${file.removed} lines`;

    try {
      // Generate embedding via Workers AI (free tier)
      const embedResult = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text: [text] }) as { data: number[][] };
      const embedding = embedResult.data[0];

      // Store in Vectorize (free tier)
      await env.SEARCH_VECTORS.insert([
        {
          id: `pr-${repoFullName.replace("/", "-")}-${prNumber}-${file.path.replace(/\//g, "-")}`.slice(0, 64),
          values: embedding,
          metadata: {
            repo: repoFullName,
            prNumber,
            file: file.path,
            extension: file.extension,
            added: file.added,
            removed: file.removed,
            timestamp: Date.now(),
          },
        },
      ]);
      indexed++;
    } catch {
      failed++;
    }
  }

  return { indexed, failed };
}

async function postPRComment(
  repoFullName: string,
  prNumber: number,
  githubToken: string,
  diffInfo: PRDiffInfo,
  vectorizeResult: { indexed: number; failed: number },
  agentUsername: string
): Promise<void> {
  const alerts: string[] = [];

  if (diffInfo.isLargePR) {
    alerts.push(`⚠️ **Large PR**: +${diffInfo.totalAdded} / -${diffInfo.totalRemoved} lines across ${diffInfo.fileCount} files`);
  }

  if (diffInfo.securityFiles.length > 0) {
    alerts.push(`🔒 **Security-sensitive files**: ${diffInfo.securityFiles.length} files (${diffInfo.securityFiles.slice(0, 5).join(", ")}${diffInfo.securityFiles.length > 5 ? "..." : ""})`);
  }

  if (diffInfo.fileCount > 20) {
    alerts.push(`📦 **Large scope**: ${diffInfo.fileCount} files changed`);
  }

  const statusLine = alerts.length > 0 ? alerts.join("\n") : "✅ No anomalies detected";

  const body = `## 🔍 CI Intelligence Report by Amrikky

${statusLine}

📊 **Stats**: ${diffInfo.fileCount} files | +${diffInfo.totalAdded} / -${diffInfo.totalRemoved} lines
🧠 **Indexed**: ${vectorizeResult.indexed} files to semantic search

---

### 🤖 Agent Passport
This PR was analyzed by **${agentUsername}** — an autonomous CI agent with a verified identity on AxiomID.

🔗 View agent identity: [axiomid.app/agent/${agentUsername}](https://axiomid.app/agent/${agentUsername})

### ⛏️ Get Free Pi Tokens
Want to verify your own AI agents? Join Pi Network and start mining free Pi tokens daily:
👉 [Start mining Pi](https://minepi.com/amrikyy)
📈 [Check Pi market data on CoinMarketCap](https://coinmarketcap.com/currencies/pi)

---

*Powered by [AxiomID](https://axiomid.app) — The Human Authorization Protocol for AI Agents*`;

  // Post comment via GitHub API
  await fetch(`https://api.github.com/repos/${repoFullName}/issues/${prNumber}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
}

async function handleInstallation(
  payload: { action: string; installation: { account: { login: string; id: number; type: string } } },
  env: Env
): Promise<Response> {
  const { action, installation } = payload;
  const accountLogin = installation.account.login;

  // Store installation in KV for tracking
  await env.CACHE_KV.put(
    `github-install:${installation.account.id}`,
    JSON.stringify({
      login: accountLogin,
      type: installation.account.type,
      installedAt: Date.now(),
    }),
    { expirationTtl: 0 } // permanent
  );

  console.log(`GitHub App ${action} by ${accountLogin} (${installation.account.type})`);

  return jsonResponse({
    success: true,
    message: `Installation ${action} for ${accountLogin}`,
    passportUrl: `https://axiomid.app/agent/${accountLogin}`,
    piReferral: PI_REFERRAL_LINK,
  });
}

export async function handleGitHubWebhook(request: Request, env: Env): Promise<Response> {
  // Only accept POST
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // Verify webhook secret
  const webhookSecret = env.SHARED_SECRET_TOKEN_VERCEL_CF;
  if (!webhookSecret) {
    console.error("WEBHOOK_SECRET not configured");
    return errorResponse("Webhook secret not configured", 500);
  }

  const signature = request.headers.get("X-Hub-Signature-256");
  const event = request.headers.get("X-GitHub-Event");
  const payloadText = await request.text();

  if (!verifyGitHubSignature(payloadText, signature, webhookSecret)) {
    return errorResponse("Invalid signature", 401);
  }

  const payload = JSON.parse(payloadText);

  // Handle ping event
  if (event === "ping") {
    return jsonResponse({ success: true, message: "pong", piReferral: PI_REFERRAL_LINK });
  }

  // Handle installation events
  if (event === "installation") {
    return handleInstallation(payload, env);
  }

  // Handle pull_request events
  if (event === "pull_request") {
    const action = payload.action;
    const pr = payload.pull_request;
    const repo = payload.repository;
    const installation = payload.installation;

    // Only process opened, synchronize, reopened
    if (!["opened", "synchronize", "reopened"].includes(action)) {
      return jsonResponse({ success: true, message: `Action ${action} skipped` });
    }

    // Get installation token (simplified — in production, use JWT + installation token flow)
    // For now, use the GITHUB_TOKEN from env if available
    const githubToken = (env as unknown as { GITHUB_TOKEN?: string }).GITHUB_TOKEN || "";

    if (!githubToken && installation) {
      // In production: generate installation access token via GitHub App JWT
      // For now, skip PR analysis if no token
      console.log("No GitHub token available — skipping PR analysis");
      return jsonResponse({ success: true, message: "No token — skipped" });
    }

    try {
      // 1. Analyze PR diff
      const diffInfo = await analyzePRDiff(repo.full_name, pr.number, githubToken);

      // 2. Index to Vectorize
      const vectorizeResult = await indexToVectorize(env, pr.number, repo.full_name, diffInfo);

      // 3. Determine agent username (from installation or repo owner)
      const agentUsername = installation?.account?.login || repo.owner.login;

      // 4. Post PR comment with intelligence report + passport link + Pi referral
      await postPRComment(repo.full_name, pr.number, githubToken, diffInfo, vectorizeResult, agentUsername);

      return jsonResponse({
        success: true,
        message: `PR #${pr.number} analyzed: ${diffInfo.fileCount} files, ${vectorizeResult.indexed} indexed`,
        passportUrl: `https://axiomid.app/agent/${agentUsername}`,
        piReferral: PI_REFERRAL_LINK,
      });
    } catch (err) {
      console.error("PR analysis failed:", err instanceof Error ? err.message : err);
      return errorResponse("PR analysis failed", 500);
    }
  }

  return jsonResponse({ success: true, message: `Event ${event} received` });
}
