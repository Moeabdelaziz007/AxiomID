/**
 * Email sending route — Cloudflare Email Service binding
 * POST /api/email/send — send a transactional email
 */

import type { Env } from "../lib/types";
import { jsonResponse, errorResponse, verifyAuth } from "../lib/auth";

interface EmailSendRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
}

const FROM_EMAIL = "notifications@axiomid.app";
const FROM_NAME_DEFAULT = "AxiomID";

export async function handleEmailSend(
  request: Request,
  env: Env
): Promise<Response> {
  // Verify auth — require shared secret
  const auth = verifyAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(401, "Unauthorized");
  }

  try {
    const body: EmailSendRequest = await request.json();

    if (!body.to || !body.subject) {
      return errorResponse(400, "Missing required fields: to, subject");
    }

    if (!body.html && !body.text) {
      return errorResponse(400, "Provide at least one of: html, text");
    }

    const result = await env.EMAIL.send({
      to: body.to,
      from: {
        email: FROM_EMAIL,
        name: body.fromName || FROM_NAME_DEFAULT,
      },
      subject: body.subject,
      html: body.html || "",
      text: body.text || "",
    });

    return jsonResponse(200, {
      success: true,
      messageId: result.messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(500, `Email send failed: ${message}`);
  }
}
