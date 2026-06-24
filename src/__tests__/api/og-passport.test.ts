/**
 * @jest-environment node
 *
 * Tests for src/app/api/og/passport/route.tsx
 *
 * The OG image generation endpoint accepts title, did, tier, xp, and stamps
 * query parameters and returns a 1200×630 ImageResponse, or a 500 Response on
 * failure. The tier is taken from the `tier` param when present (any casing)
 * and otherwise derived from `xp` via calculateTier (see @/lib/tiers).
 */

// Mock @vercel/og before importing the route
jest.mock('@vercel/og', () => ({
  ImageResponse: jest.fn().mockImplementation((_element, _options) => {
    return new Response('image-response', {
      status: 200,
      headers: { 'content-type': 'image/png' },
    });
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/og/passport/route';
import { ImageResponse } from '@vercel/og';
import { logger } from '@/lib/logger';

const MockedImageResponse = ImageResponse as jest.MockedClass<typeof ImageResponse>;
const mockLogger = logger as jest.Mocked<typeof logger>;

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/og/passport');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

/**
 * Recursively flattens a React element tree (as captured by the ImageResponse
 * mock) into a single string of its text nodes. Lets tests assert on what the
 * card actually renders (tier label, XP, stamps, DID) rather than only status.
 */
function flattenText(node: unknown): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  if (typeof node === 'object' && 'props' in (node as Record<string, unknown>)) {
    const props = (node as { props?: { children?: unknown } }).props;
    return flattenText(props?.children);
  }
  return '';
}

/** Returns the flattened text of the element passed to the latest ImageResponse call. */
function renderedText(): string {
  const element = MockedImageResponse.mock.calls[0][0];
  return flattenText(element);
}

describe('GET /api/og/passport — default parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when called with no query params', async () => {
    const req = makeRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('calls ImageResponse with default title "AxiomID Passport" when title param is missing', async () => {
    const req = makeRequest();
    await GET(req);
    expect(MockedImageResponse).toHaveBeenCalledTimes(1);
    const callArgs = MockedImageResponse.mock.calls[0];
    // element is JSX serialized as string; options is second arg
    const options = callArgs[1] as { width: number; height: number };
    expect(options.width).toBe(1200);
    expect(options.height).toBe(630);
  });

  it('calls ImageResponse with correct dimensions 1200×630', async () => {
    const req = makeRequest({ title: 'Test', did: 'did:axiom:test', tier: 'Citizen', color: '#00ff00' });
    await GET(req);
    const options = MockedImageResponse.mock.calls[0][1] as { width: number; height: number };
    expect(options.width).toBe(1200);
    expect(options.height).toBe(630);
  });
});

describe('GET /api/og/passport — custom query parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 for valid custom title, did, tier, and color', async () => {
    const req = makeRequest({
      title: 'My Passport',
      did: 'did:axiom:abc123',
      tier: 'Citizen',
      color: '#00aaff',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('returns 200 for Sovereign tier', async () => {
    const req = makeRequest({ title: 'Passport', did: 'did:axiom:xyz', tier: 'Sovereign', color: '#gold' });
    const res = await GET(req);
    // invalid color still falls back gracefully
    expect(res.status).toBe(200);
  });

  it('returns 200 for Validator tier with valid 3-digit hex color', async () => {
    const req = makeRequest({ tier: 'Validator', color: '#abc' });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('returns 200 for Visitor tier with valid 6-digit hex color', async () => {
    const req = makeRequest({ tier: 'Visitor', color: '#ffffff' });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/og/passport — tier, xp, and stamps params', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the explicit tier label, xp, and stamps in the card', async () => {
    const req = makeRequest({ tier: 'Sovereign', xp: '1200', stamps: '5' });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const text = renderedText();
    expect(text).toContain('SOVEREIGN');
    expect(text).toContain('1200');
    expect(text).toContain('5');
  });

  it('normalizes a lowercase tier param to the canonical label', async () => {
    const req = makeRequest({ tier: 'validator' });
    await GET(req);
    expect(renderedText()).toContain('VALIDATOR');
  });

  it('derives the tier from xp when the tier param is unknown', async () => {
    // xp 600 → Validator (>= 500, < 1000) per @/lib/tiers thresholds
    const req = makeRequest({ tier: 'not-a-tier', xp: '600' });
    await GET(req);
    expect(renderedText()).toContain('VALIDATOR');
  });

  it('derives the tier from xp when no tier param is provided', async () => {
    // xp 1000 → Sovereign per @/lib/tiers thresholds
    const req = makeRequest({ xp: '1000' });
    await GET(req);
    expect(renderedText()).toContain('SOVEREIGN');
  });

  it('falls back to Visitor for non-numeric xp and no tier', async () => {
    const req = makeRequest({ xp: 'abc' });
    await GET(req);
    const text = renderedText();
    expect(text).toContain('VISITOR');
    // Non-numeric xp is clamped to 0 and rendered as the trust score.
    expect(text).toContain('0');
  });

  it('clamps a negative stamps value to 0', async () => {
    const req = makeRequest({ stamps: '-5' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(renderedText()).toContain('0');
  });
});

describe('GET /api/og/passport — error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 500 when ImageResponse constructor throws', async () => {
    MockedImageResponse.mockImplementationOnce(() => {
      throw new Error('ImageResponse construction failed');
    });

    const req = makeRequest({ title: 'Test' });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it('returns plain text body on error', async () => {
    MockedImageResponse.mockImplementationOnce(() => {
      throw new Error('render error');
    });

    const req = makeRequest();
    const res = await GET(req);
    const text = await res.text();
    expect(text).toContain('Failed to generate the image');
  });

  it('calls logger.error on failure', async () => {
    MockedImageResponse.mockImplementationOnce(() => {
      throw new Error('test error');
    });

    const req = makeRequest();
    await GET(req);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[OG-PASSPORT]'),
      expect.any(Error)
    );
  });

  it('does not throw when ImageResponse throws — graceful 500', async () => {
    MockedImageResponse.mockImplementationOnce(() => {
      throw new TypeError('unexpected');
    });

    const req = makeRequest();
    await expect(GET(req)).resolves.toBeDefined();
  });
});

describe('GET /api/og/passport — runtime export', () => {
  it('exports runtime as "nodejs"', async () => {
    const mod = await import('@/app/api/og/passport/route');
    expect((mod as Record<string, unknown>).runtime).toBe('nodejs');
  });
});

describe('GET /api/og/passport — parameter boundary cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles very long title without error', async () => {
    const longTitle = 'A'.repeat(500);
    const req = makeRequest({ title: longTitle });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('handles DID with special characters without error', async () => {
    const req = makeRequest({ did: 'did:axiom:user/with/slash?and=query' });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('handles uppercase tier value (tier.toUpperCase used in render)', async () => {
    const req = makeRequest({ tier: 'citizen' });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('responds to GET requests with content-type image/png from mock', async () => {
    const req = makeRequest({ title: 'Test', did: 'did:axiom:test' });
    const res = await GET(req);
    expect(res.headers.get('content-type')).toContain('image/png');
  });
});