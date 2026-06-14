import { logger } from '../logger';

export interface PerplexityQueryOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface PerplexityResult {
  content: string;
  citations: string[];
}

/**
 * Service to query Perplexity API for real-time data harvesting.
 * Respects RULE 8: Circuit breaker/timeout protection.
 */
export async function queryPerplexity(
  query: string,
  options: PerplexityQueryOptions = {}
): Promise<PerplexityResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    logger.warn('PERPLEXITY_API_KEY is not defined. Falling back to local warning.');
    return {
      content: 'Error: Perplexity API key is not configured.',
      citations: [],
    };
  }

  const model = options.model || 'sonar';
  const maxTokens = options.maxTokens || 1024;
  const temperature = options.temperature ?? 0.2;

  // RULE 8: Timeout Circuit Breaker (8 seconds timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an autonomous harvesting agent for AxiomID. Provide precise, factual, real-time verification summaries with zero fluff.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API HTTP error! Status: ${response.status}. Details: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    return { content, citations };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    logger.error('Error during Perplexity API execution:', error);
    
    // Check if aborted (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Perplexity query timed out (Circuit Breaker triggered).');
    }
    
    throw error;
  }

}
