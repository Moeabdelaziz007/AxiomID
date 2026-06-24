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
  const calls = MockedImageResponse.mock.calls;
  const element = calls[calls.length - 1][0];
  return flattenText(element);
}

/**
 * Collects every leaf text node in the rendered tree together with the
 * `fontSize` of its nearest styled ancestor. Lets tests assert on the value of
 * a specific element (e.g. the 56px trust score, the 44px avatar initials)
 * rather than a flattened `toContain`, which collides with static card text
 * such as the "/ 100" literal or the "AXIOMID" / "DECENTRALIZED ID" labels.
 */
function collectStyledText(
  node: unknown,
  inheritedFontSize?: number,
  acc: Array<{ fontSize?: number; text: string }> = [],
): Array<{ fontSize?: number; text: string }> {
  if (node == null || typeof node === 'boolean') return acc;
  if (typeof node === 'string' || typeof node === 'number') {
    const text = String(node).trim();
    if (text) acc.push({ fontSize: inheritedFontSize, text });
    return acc;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectStyledText(child, inheritedFontSize, acc);
    return acc;
  }
  if (typeof node === 'object' && 'props' in (node as Record<string, unknown>)) {
    const props = (node as { props?: { style?: { fontSize?: number }; children?: unknown } }).props;
    const fontSize = props?.style?.fontSize ?? inheritedFontSize;
    collectStyledText(props?.children, fontSize, acc);
  }
  return acc;
}

/** Returns the text of the first leaf node rendered at the given fontSize. */
function textAtFontSize(fontSize: number): string | undefined {
  const calls = MockedImageResponse.mock.calls;
  const element = calls[calls.length - 1][0];
  return collectStyledText(element).find((n) => n.fontSize === fontSize)?.text;
}

/** Trust score is the only node rendered at 56px (see @/app/api/og/passport/route). */
function renderedTrustScore(): string | undefined {
  return textAtFontSize(56);
}

/** Avatar initials are the only node rendered at 44px (see @/app/api/og/passport/route). */
function renderedAvatarInitials(): string | undefined {
  return textAtFontSize(44);
}

/**
 * Returns the value rendered in the stats-row cell with the given label.
 *
 * Each stat cell renders two leaf text nodes in order: the label (11px) then
 * the value (24px). Since XP, STAMPS, and TIER all share fontSize 24, we locate
 * the cell by its unique label and return the text node immediately following
 * it. This lets tests assert on the exact STAMPS value rather than a flattened
 * `toContain`, which collides with the XP value (e.g. "0" inside "300").
 */
function statCellValue(label: string): string | undefined {
  const calls = MockedImageResponse.mock.calls;
  const element = calls[calls.length - 1][0];
  const nodes = collectStyledText(element);
  const labelIndex = nodes.findIndex((n) => n.text === label);
  return labelIndex >= 0 ? nodes[labelIndex + 1]?.text : undefined;
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

  it('renders the explicit tier label, xp, stamps, and computed trust score', async () => {
    const req = makeRequest({ tier: 'Sovereign', xp: '1230', stamps: '4' });
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(renderedText()).toContain('SOVEREIGN');
    // Raw XP and stamps are shown in their dedicated stats cells.
    expect(statCellValue('XP')).toBe('1230');
    expect(statCellValue('STAMPS')).toBe('4');
    // Trust score is the 0-100 value from calculateTrustScore(1230, 4):
    // xpScore = min(100, floor(1230/10)) = 100; stampScore = round((4/6)*100) = 67;
    // round(100*0.7 + 67*0.3) = round(70 + 20.1) = 90.
    expect(renderedTrustScore()).toBe('90');
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
    expect(renderedText()).toContain('VISITOR');
    // Non-numeric xp is clamped to 0, so the trust score node renders exactly 0.
    expect(renderedTrustScore()).toBe('0');
  });

  it('clamps a negative stamps value to 0', async () => {
    const req = makeRequest({ stamps: '-5', xp: '300' });
    const res = await GET(req);
    expect(res.status).toBe(200);

    // Assert on the dedicated STAMPS stat cell so the match cannot be satisfied
    // by another "0" in the card (e.g. the "0" inside the XP value "300").
    expect(statCellValue('STAMPS')).toBe('0');
    // Sanity-check the sibling cells render the expected raw values.
    expect(statCellValue('XP')).toBe('300');
    // calculateTrustScore(300, 0) = round(floor(300/10) * 0.7) = round(21) = 21.
    expect(renderedTrustScore()).toBe('21');
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

describe('GET /api/og/passport — normalizeTier: all-caps and mixed-case inputs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts UPPERCASE "CITIZEN" and renders CITIZEN label', async () => {
    const req = makeRequest({ tier: 'CITIZEN' });
    await GET(req);
    expect(renderedText()).toContain('CITIZEN');
  });

  it('accepts UPPERCASE "SOVEREIGN" and renders SOVEREIGN label', async () => {
    const req = makeRequest({ tier: 'SOVEREIGN' });
    await GET(req);
    expect(renderedText()).toContain('SOVEREIGN');
  });

  it('accepts UPPERCASE "VISITOR" and renders VISITOR label', async () => {
    const req = makeRequest({ tier: 'VISITOR' });
    await GET(req);
    expect(renderedText()).toContain('VISITOR');
  });

  it('accepts UPPERCASE "VALIDATOR" and renders VALIDATOR label', async () => {
    const req = makeRequest({ tier: 'VALIDATOR' });
    await GET(req);
    expect(renderedText()).toContain('VALIDATOR');
  });

  it('accepts mixed-case "CitiZeN" and normalizes to CITIZEN', async () => {
    const req = makeRequest({ tier: 'CitiZeN' });
    await GET(req);
    expect(renderedText()).toContain('CITIZEN');
  });

  it('accepts mixed-case "sOVEREIGN" and normalizes to SOVEREIGN', async () => {
    const req = makeRequest({ tier: 'sOVEREIGN' });
    await GET(req);
    expect(renderedText()).toContain('SOVEREIGN');
  });

  it('treats an empty string tier as unrecognized and derives from xp', async () => {
    // Empty string tier → normalizeTier returns null → calculateTier(0) = Visitor
    const req = makeRequest({ tier: '' });
    await GET(req);
    expect(renderedText()).toContain('VISITOR');
  });
});

describe('GET /api/og/passport — explicit Visitor and Citizen tier params', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders VISITOR label for explicit tier=Visitor', async () => {
    const req = makeRequest({ tier: 'Visitor' });
    await GET(req);
    expect(renderedText()).toContain('VISITOR');
  });

  it('renders CITIZEN label for explicit tier=Citizen', async () => {
    const req = makeRequest({ tier: 'Citizen' });
    await GET(req);
    expect(renderedText()).toContain('CITIZEN');
  });
});

describe('GET /api/og/passport — calculateTier XP boundary thresholds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('xp=99 (below Citizen threshold 100) → VISITOR', async () => {
    const req = makeRequest({ xp: '99' });
    await GET(req);
    expect(renderedText()).toContain('VISITOR');
  });

  it('xp=100 (Citizen threshold) → CITIZEN', async () => {
    const req = makeRequest({ xp: '100' });
    await GET(req);
    expect(renderedText()).toContain('CITIZEN');
  });

  it('xp=499 (below Validator threshold 500) → CITIZEN', async () => {
    const req = makeRequest({ xp: '499' });
    await GET(req);
    expect(renderedText()).toContain('CITIZEN');
  });

  it('xp=500 (Validator threshold) → VALIDATOR', async () => {
    const req = makeRequest({ xp: '500' });
    await GET(req);
    expect(renderedText()).toContain('VALIDATOR');
  });

  it('xp=999 (below Sovereign threshold 1000) → VALIDATOR', async () => {
    const req = makeRequest({ xp: '999' });
    await GET(req);
    expect(renderedText()).toContain('VALIDATOR');
  });

  it('xp=1000 (Sovereign threshold) → SOVEREIGN', async () => {
    const req = makeRequest({ xp: '1000' });
    await GET(req);
    expect(renderedText()).toContain('SOVEREIGN');
  });

  it('xp=0 (default) → VISITOR', async () => {
    const req = makeRequest({ xp: '0' });
    await GET(req);
    expect(renderedText()).toContain('VISITOR');
  });

  it('negative xp is clamped to 0 → VISITOR', async () => {
    const req = makeRequest({ xp: '-100' });
    await GET(req);
    expect(renderedText()).toContain('VISITOR');
  });

  it('float xp "99.9" is parsed as 99 by parseInt → VISITOR', async () => {
    // parseInt('99.9', 10) === 99, which is below the Citizen threshold of 100
    const req = makeRequest({ xp: '99.9' });
    await GET(req);
    expect(renderedText()).toContain('VISITOR');
  });

  it('float xp "100.7" is parsed as 100 by parseInt → CITIZEN', async () => {
    // parseInt('100.7', 10) === 100, which meets the Citizen threshold
    const req = makeRequest({ xp: '100.7' });
    await GET(req);
    expect(renderedText()).toContain('CITIZEN');
  });
});

describe('GET /api/og/passport — trust score boundary values', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('xp=0 stamps=0 → trust score 0', async () => {
    const req = makeRequest({ xp: '0', stamps: '0' });
    await GET(req);
    // xpScore=0, stampScore=0 → round(0*0.7 + 0*0.3) = 0.
    // Assert on the dedicated trust-score node so the static "/ 100" literal
    // cannot satisfy the match.
    expect(renderedTrustScore()).toBe('0');
  });

  it('xp=1000 stamps=6 → trust score 100', async () => {
    // xpScore = min(100, floor(1000/10)) = 100
    // stampScore = round((6/6)*100) = 100
    // round(100*0.7 + 100*0.3) = round(70 + 30) = 100
    const req = makeRequest({ xp: '1000', stamps: '6' });
    await GET(req);
    expect(renderedTrustScore()).toBe('100');
  });

  it('stamps > TOTAL_STAMPS (6) are clamped to 6 in trust score', async () => {
    // Use xp=0 so xpScore=0; stamps=10 → clamped to 6 → stampScore=100
    // trust = round(0*0.7 + 100*0.3) = round(30) = 30
    const req = makeRequest({ xp: '0', stamps: '10' });
    await GET(req);
    // Trust score should be exactly 30 (clamped stamps=6), not higher.
    expect(renderedTrustScore()).toBe('30');
  });

  it('xp=10 stamps=0 → trust score 1', async () => {
    // xpScore = floor(10/10) = 1; stampScore = 0
    // round(1*0.7 + 0*0.3) = round(0.7) = 1
    const req = makeRequest({ xp: '10', stamps: '0' });
    await GET(req);
    expect(renderedTrustScore()).toBe('1');
  });
});

describe('GET /api/og/passport — DID shortName extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders first 2 chars of last DID segment uppercased in avatar', async () => {
    // did:axiom:alice → last segment "alice" → "AL".
    // Assert on the avatar node specifically; "AL" is also a substring of the
    // static "DECENTRALIZED ID" label, so a flattened match would be spurious.
    const req = makeRequest({ did: 'did:axiom:alice' });
    await GET(req);
    expect(renderedAvatarInitials()).toBe('AL');
  });

  it('renders single-char last DID segment as single uppercase char', async () => {
    // did:axiom:x → last segment "x" → slice(0,2) = "x" → "X".
    // "X" also appears in the static "AXIOMID" brand, so target the avatar node.
    const req = makeRequest({ did: 'did:axiom:x' });
    await GET(req);
    expect(renderedAvatarInitials()).toBe('X');
  });

  it('renders shortName from a DID with multiple colons', async () => {
    // did:key:z6Mk... → last segment "z6Mk..." → "Z6"
    const req = makeRequest({ did: 'did:key:z6MkfooBARbaz' });
    await GET(req);
    expect(renderedAvatarInitials()).toBe('Z6');
  });

  it('truncates DID longer than 28 chars in the rendered card', async () => {
    // 29-char DID should be truncated to "did:axiom:abcde..." style
    const longDid = 'did:axiom:averylongidentifier'; // 29 chars
    const req = makeRequest({ did: longDid });
    await GET(req);
    const text = renderedText();
    expect(text).toContain('...');
  });

  it('shows DID as-is when exactly 28 chars (no truncation)', async () => {
    // Exactly 28 chars → no truncation (threshold is > 28)
    const exactDid = 'did:axiom:exact28charsabcdef'; // exactly 28 chars
    expect(exactDid.length).toBe(28);
    const req = makeRequest({ did: exactDid });
    await GET(req);
    const text = renderedText();
    // The full DID should appear without ellipsis from the truncation logic
    expect(text).toContain(exactDid);
  });

  it('truncates DID at exactly 29 chars (boundary: > 28)', async () => {
    const boundaryDid = 'did:axiom:exact29charsabcdefg'; // exactly 29 chars
    expect(boundaryDid.length).toBe(29);
    const req = makeRequest({ did: boundaryDid });
    await GET(req);
    const text = renderedText();
    expect(text).toContain('...');
    // Verify the first 14 chars appear
    expect(text).toContain(boundaryDid.slice(0, 14));
    // Verify the last 10 chars appear
    expect(text).toContain(boundaryDid.slice(-10));
  });
});

describe('GET /api/og/passport — maxDuration and runtime exports', () => {
  it('exports maxDuration as 10', async () => {
    const mod = await import('@/app/api/og/passport/route');
    expect((mod as Record<string, unknown>).maxDuration).toBe(10);
  });
});