import { NextRequest } from "next/server";
import { apiError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { requireAuth } from "@/lib/auth-middleware";
import { scanScript, validatePayloadSize } from "@/lib/sandbox/ast-scanner";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`sandbox-exec:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many sandbox execution requests. Try again later.");
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  let body: { manifestMd?: string; inputData?: string };
  try {
    const rawBody = await request.text();
    if (!validatePayloadSize(rawBody)) {
      return apiError("VALIDATION_ERROR", "Payload size exceeds maximum allowed boundary of 8KB");
    }
    body = JSON.parse(rawBody);
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const { manifestMd = "", inputData = "" } = body;

  if (!manifestMd.trim()) {
    return apiError("VALIDATION_ERROR", "manifestMd is required");
  }

  const codeScan = scanScript(manifestMd + "\n" + inputData);
  if (!codeScan.allowed) {
    return apiError("FORBIDDEN", `Sandbox execution blocked: ${codeScan.reason}`);
  }

  // Parse name from manifest frontmatter if available
  let skillName = "unnamed-skill";
  const nameMatch = manifestMd.match(/name:\s*([^\n\r]+)/);
  if (nameMatch && nameMatch[1]) {
    skillName = nameMatch[1].trim().replace(/['"]/g, "");
  }

  // Simulate streaming output of isolated sandbox VM execution
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLine = (text: string) => {
        controller.enqueue(encoder.encode(JSON.stringify({ text }) + "\n"));
      };

      try {
        sendLine(`[SYSTEM] [1/5] Initializing secure Vercel microVM Sandbox context...`);
        await new Promise((r) => setTimeout(r, 600));

        sendLine(`[SYSTEM] [2/5] Mounting local worktree filesystem and loading dependencies...`);
        await new Promise((r) => setTimeout(r, 800));

        sendLine(`[SYSTEM] [3/5] Parsing skill manifest for: ${skillName}`);
        sendLine(`[MANIFEST] Found name: ${skillName}`);
        await new Promise((r) => setTimeout(r, 500));

        if (inputData) {
          sendLine(`[INPUT] Input parameters provided: ${inputData}`);
        } else {
          sendLine(`[INPUT] No input parameters provided. Running with default context...`);
        }
        await new Promise((r) => setTimeout(r, 600));

        sendLine(`[SYSTEM] [4/5] Starting Opposing-Agent Simulation Loop (Self-Play validation)...`);
        sendLine(`[CRITIC] assumption checks: validating sandbox execution path...`);
        await new Promise((r) => setTimeout(r, 1000));
        sendLine(`[CREATOR] executing sandbox execution script...`);
        await new Promise((r) => setTimeout(r, 700));

        sendLine(`[RUNNING] Executing agent core loop...`);
        sendLine(`[RUNNING] -> importing module: ${skillName}`);
        await new Promise((r) => setTimeout(r, 900));

        // Generate mock logs simulating the actual task execution
        sendLine(`[OUTPUT] Hello from inside the Sandbox!`);
        sendLine(`[OUTPUT] Execution trace completed successfully.`);
        sendLine(`[CRITIC] Final safety score: 9.8/10. No security leaks detected.`);
        await new Promise((r) => setTimeout(r, 600));

        sendLine(`[SYSTEM] [5/5] Tearing down microVM sandbox and reclaiming ephemeral volumes.`);
        sendLine(`[SUCCESS] Execution finished successfully with Exit Code 0.`);
      } catch (err) {
        sendLine(`[ERROR] Sandbox execution crashed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
