import { prisma } from '../prisma';
import { logger } from '../logger';

export interface SelfReviewResult {
  score: number;
  critique: string;
}

/**
 * Execute a background, non-blocking self-review audit using Groq.
 * Respects RULE 4, 5, 8.
 */
export async function runAgentSelfReview(
  actionName: string,
  telemetry: Record<string, unknown>
): Promise<SelfReviewResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.warn('GROQ_API_KEY is not defined. Skipping self-review analysis.');
    return { score: 10, critique: 'Groq API key not configured. Defaulting to passing score.' };
  }

  // Set timeout circuit breaker for Groq
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are the AxiomID Meta-Loop security & quality auditor. Analyze the action telemetry and return a strict JSON format only: {"score": <number 0-10>, "critique": "<string text analysis>"}',
          },
          {
            role: 'user',
            content: `Action: ${actionName}\nTelemetry: ${JSON.stringify(telemetry)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    
    let parsed: { score?: number; critique?: string };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {};
    }
    
    const score = typeof parsed.score === 'number' ? parsed.score : 8.0;
    const critique = parsed.critique || 'No critique provided.';

    // Save to DB asynchronously (non-blocking)
    prisma.selfReviewLog.create({
      data: {
        actionName,
        score,
        critique,
        telemetry: JSON.stringify(telemetry),
      },
    }).catch(dbErr => {
      logger.error('Failed to save self review log to DB:', dbErr);
    });

    return { score, critique };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    logger.error('Error during Groq self-review execution:', err);
    return { score: 5.0, critique: `Self-review failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
