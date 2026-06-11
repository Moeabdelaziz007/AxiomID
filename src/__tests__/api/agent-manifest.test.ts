/**
 * @jest-environment node
 */

// Mock the crypto module to avoid needing a real private key
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    createPrivateKey: jest.fn(),
    sign: jest.fn(() => Buffer.from('mock-signature')),
  };
});

import { GET } from '@/app/api/agent/manifest/route';
import { createPrivateKey, sign } from 'crypto';

const mockCreatePrivateKey = createPrivateKey as jest.Mock;
const mockSign = sign as jest.Mock;

function mockGetRequest(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `http://localhost/api/agent/manifest${qs ? '?' + qs : ''}`;
  return new Request(url, { method: 'GET' });
}

describe('GET /api/agent/manifest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ISSUER_PRIVATE_KEY;
    // Re-establish default mock implementations after clearAllMocks
    mockSign.mockReturnValue(Buffer.from('mock-signature'));
    mockCreatePrivateKey.mockReturnValue({ type: 'private' });
  });

  it('returns a signed manifest with a valid private key', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockCreatePrivateKey.mockReturnValue({ type: 'private' });
    mockSign.mockReturnValue(Buffer.from('deadbeef', 'hex'));

    const req = mockGetRequest({ userId: 'user-123' });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data['@context']).toBeDefined();
    expect(data.type).toContain('VerifiableCredential');
    expect(data.credentialSubject.id).toBe('did:axiom:axiomid.app:user-123');
    expect(data.proof).toBeDefined();
    expect(data.proof.type).toBe('Ed25519Signature2020');
    expect(data.proof.proofValue).not.toBe('signature_unavailable');
  });

  it('uses "anonymous" as userId when not provided', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockCreatePrivateKey.mockReturnValue({ type: 'private' });
    mockSign.mockReturnValue(Buffer.from('aabbcc', 'hex'));

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.credentialSubject.id).toBe('did:axiom:axiomid.app:anonymous');
  });

  it('returns 500 when ISSUER_PRIVATE_KEY is not set', async () => {
    // No env var set
    const req = mockGetRequest({ userId: 'user-456' });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('cryptographic');
  });

  it('returns 500 when crypto signing throws', async () => {
    process.env.ISSUER_PRIVATE_KEY = 'bad-key-content';
    mockCreatePrivateKey.mockImplementation(() => {
      throw new Error('Invalid key format');
    });

    const req = mockGetRequest({ userId: 'user-789' });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('cryptographic');
  });

  it('returns correct Content-Type and CORS headers', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockSign.mockReturnValue(Buffer.from('deadbeef', 'hex'));
    const req = mockGetRequest({ userId: 'test-user' });
    const res = await GET(req);

    expect(res.headers.get('Content-Type')).toContain('application/ld+json');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Cache-Control')).toContain('max-age=3600');
  });

  it('includes required manifest fields', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockSign.mockReturnValue(Buffer.from('deadbeef', 'hex'));
    const req = mockGetRequest({ userId: 'myuser' });
    const res = await GET(req);
    const data = await res.json();

    expect(data.issuer).toBeDefined();
    expect(data.issuer.name).toBe('AxiomID Protocol');
    expect(data.issuanceDate).toBeDefined();
    expect(data.credentialSubject.type).toBe('AgentIdentity');
    expect(data.metadata.protocol).toBe('AxiomID');
    expect(data.metadata.version).toBe('1.0.0');
  });

  it('includes proof with correct structure', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockSign.mockReturnValue(Buffer.from('deadbeef', 'hex'));
    const req = mockGetRequest({ userId: 'u1' });
    const res = await GET(req);
    const data = await res.json();

    expect(data.proof.verificationMethod).toBe('did:axiom:axiomid.app:issuer#key-1');
    expect(data.proof.proofPurpose).toBe('assertionMethod');
    expect(data.proof.created).toBe(data.issuanceDate);
  });
});