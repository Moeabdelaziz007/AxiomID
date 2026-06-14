/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    selfReviewLog: {
      create: jest.fn().mockResolvedValue({ id: 'log-123' }),
    },
  },
}));

import { runAgentSelfReview } from '@/lib/agents/self-review';
import { prisma } from '@/lib/prisma';

const mockPrismaCreate = prisma.selfReviewLog.create as jest.Mock;

describe('AgentSelfReview Engine', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default score when GROQ_API_KEY is missing', async () => {
    delete process.env.GROQ_API_KEY;
    const result = await runAgentSelfReview('test_action', { foo: 'bar' });
    expect(result.score).toBe(10);
    expect(result.critique).toContain('Groq API key not configured');
  });

  it('should call fetch and save review to DB when key is present', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 9.5,
              critique: 'Perfect execution and sanitization.',
            }),
          },
        },
      ],
    };

    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    ) as jest.Mock;

    const result = await runAgentSelfReview('claim_kya', { username: 'testuser' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.score).toBe(9.5);
    expect(result.critique).toBe('Perfect execution and sanitization.');
    
    // Allow promises to resolve for async Prisma write
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockPrismaCreate).toHaveBeenCalledTimes(1);
  });
});
