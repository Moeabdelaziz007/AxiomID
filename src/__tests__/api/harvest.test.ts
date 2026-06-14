/**
 * @jest-environment node
 */

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/agents/perplexity', () => ({
  queryPerplexity: jest.fn(),
}));

import { POST } from '@/app/api/agents/harvest/route';
import { requireAuth } from '@/lib/auth-middleware';
import { queryPerplexity } from '@/lib/agents/perplexity';
import { NextRequest } from 'next/server';

const mockRequireAuth = requireAuth as jest.Mock;
const mockQueryPerplexity = queryPerplexity as jest.Mock;

function mockPostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/agents/harvest', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const mockUser = {
  id: 'user-123',
  piUid: 'pi_uid_123',
  walletAddress: 'pi:test',
  piUsername: 'testuser',
};

const mockAuthResponse = { error: null, user: mockUser };

describe('POST /api/agents/harvest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(mockAuthResponse);
    mockQueryPerplexity.mockResolvedValue({
      content: 'Real-time result from Perplexity.',
      citations: ['https://example.com'],
    });
  });

  it('successfully queries Perplexity with validated input', async () => {
    const req = mockPostRequest({
      query: 'What is Gitcoin stamp layout?',
      maxTokens: 500,
      temperature: 0.1,
    });
    
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result).toBe('Real-time result from Perplexity.');
    expect(data.citations).toContain('https://example.com');
    expect(mockQueryPerplexity).toHaveBeenCalledWith('What is Gitcoin stamp layout?', {
      maxTokens: 500,
      temperature: 0.1,
    });
  });

  it('returns 400 when validation fails on query length', async () => {
    const req = mockPostRequest({ query: 'ab' }); // Too short (min 3)
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('BAD_REQUEST');
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }),
      user: null,
    });

    const req = mockPostRequest({ query: 'Valid query request' });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});
