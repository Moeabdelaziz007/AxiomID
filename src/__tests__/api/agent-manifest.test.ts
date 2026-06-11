/* eslint-disable @typescript-eslint/no-explicit-any */
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
    expect(data.proof.proofValue).toBeDefined();
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
    // No env var set - getIssuerPrivateKey() throws, so route returns 500
    const req = mockGetRequest({ userId: 'user-456' });
    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 500 when crypto signing throws (invalid key format)', async () => {
    process.env.ISSUER_PRIVATE_KEY = 'bad-key-content';
    mockCreatePrivateKey.mockImplementation(() => {
      throw new Error('Invalid key format');
    });

    const req = mockGetRequest({ userId: 'user-789' });
    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns correct Content-Type and CORS headers on success', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockCreatePrivateKey.mockReturnValue({ type: 'private' });
    mockSign.mockReturnValue(Buffer.from('abc', 'hex'));

    const req = mockGetRequest({ userId: 'test-user' });
    const res = await GET(req);

    expect(res.headers.get('Content-Type')).toContain('application/ld+json');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Cache-Control')).toContain('max-age=3600');
  });

  it('includes required manifest fields on success', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockCreatePrivateKey.mockReturnValue({ type: 'private' });
    mockSign.mockReturnValue(Buffer.from('cafebabe', 'hex'));

    const req = mockGetRequest({ userId: 'myuser' });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.issuer).toBeDefined();
    expect(data.issuer.name).toBe('AxiomID Protocol');
    expect(data.issuanceDate).toBeDefined();
    expect(data.credentialSubject.type).toBe('AgentIdentity');
    expect(data.metadata.protocol).toBe('AxiomID');
    expect(data.metadata.version).toBe('1.0.0');
  });

  it('includes proof with correct structure on success', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockCreatePrivateKey.mockReturnValue({ type: 'private' });
    mockSign.mockReturnValue(Buffer.from('1a2b3c', 'hex'));

    const req = mockGetRequest({ userId: 'u1' });
    const res = await GET(req);
    const data = await res.json();

    expect(data.proof.verificationMethod).toBe('did:axiom:axiomid.app:issuer#key-1');
    expect(data.proof.proofPurpose).toBe('assertionMethod');
    expect(data.proof.created).toBe(data.issuanceDate);
  });

  it('proofValue is a hex-encoded string of signature buffer', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockCreatePrivateKey.mockReturnValue({ type: 'private' });
    const fakeSignatureBytes = Buffer.from('deadbeef1234', 'hex');
    mockSign.mockReturnValue(fakeSignatureBytes);

    const req = mockGetRequest({ userId: 'user-hex' });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.proof.proofValue).toBe(fakeSignatureBytes.toString('hex'));
  });

  it('includes AgentFacts in credential type array', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockCreatePrivateKey.mockReturnValue({ type: 'private' });
    mockSign.mockReturnValue(Buffer.from('ff', 'hex'));

    const req = mockGetRequest({ userId: 'u2' });
    const res = await GET(req);
    const data = await res.json();

    expect(data.type).toContain('AgentFacts');
  });

  it('manifest includes compliance fields', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    mockCreatePrivateKey.mockReturnValue({ type: 'private' });
    mockSign.mockReturnValue(Buffer.from('aa', 'hex'));

    const req = mockGetRequest({ userId: 'user-comp' });
    const res = await GET(req);
    const data = await res.json();

    expect(data.metadata.compliance.kya).toBe(true);
    expect(data.metadata.compliance.kyc).toBe(true);
    expect(data.metadata.compliance.w3cDid).toBe(true);
    expect(data.metadata.compliance.piCompatible).toBe(true);
  });

  it('calls sign with the manifest serialized as compact JSON', async () => {
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    const mockKeyObject = { type: 'private' };
    mockCreatePrivateKey.mockReturnValue(mockKeyObject);
    mockSign.mockReturnValue(Buffer.from('bb', 'hex'));

    const req = mockGetRequest({ userId: 'json-test' });
    await GET(req);

    expect(mockSign).toHaveBeenCalledWith(
      null,
      expect.any(Buffer),
      mockKeyObject
    );
  });
});