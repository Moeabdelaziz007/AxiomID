/**
 * @jest-environment node
 */
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign as cryptoSign } from 'crypto';
import {
  getIssuerPublicKey,
  issueAgentPassport,
  verifyAgentSignature,
  AgentPassportVC,
} from '@/lib/passport-crypto';

// ── helpers ────────────────────────────────────────────────────────────────────

/** Derive the Ed25519 public-key PEM that matches the ISSUER_PRIVATE_KEY set in jest.setup.js */
function derivePublicKeyFromIssuerPrivate(): string {
  const privateKeyPem = process.env.ISSUER_PRIVATE_KEY!;
  const privateKey = createPrivateKey({ key: privateKeyPem, format: 'pem', type: 'pkcs8' });
  return createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }) as string;
}

/** Generate a fresh Ed25519 key pair for standalone signing/verification tests. */
function generateEd25519Pair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }) as string,
  };
}

// ── getIssuerPublicKey ─────────────────────────────────────────────────────────

describe('getIssuerPublicKey', () => {
  const originalKey = process.env.ISSUER_PUBLIC_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ISSUER_PUBLIC_KEY;
    } else {
      process.env.ISSUER_PUBLIC_KEY = originalKey;
    }
  });

  it('returns the public key when ISSUER_PUBLIC_KEY is set', () => {
    process.env.ISSUER_PUBLIC_KEY = 'test-public-key-value';
    expect(getIssuerPublicKey()).toBe('test-public-key-value');
  });

  it('throws when ISSUER_PUBLIC_KEY is not set', () => {
    delete process.env.ISSUER_PUBLIC_KEY;
    expect(() => getIssuerPublicKey()).toThrow(
      'Cryptographic Error: ISSUER_PUBLIC_KEY environment variable is not set.'
    );
  });

  it('error message includes the openssl extraction hint', () => {
    delete process.env.ISSUER_PUBLIC_KEY;
    expect(() => getIssuerPublicKey()).toThrow('openssl pkey -in private.pem -pubout');
  });
});

// ── issueAgentPassport ─────────────────────────────────────────────────────────

describe('issueAgentPassport', () => {
  // ISSUER_PRIVATE_KEY is set globally in jest.setup.js

  describe('VC structure', () => {
    let vc: AgentPassportVC;

    beforeEach(() => {
      vc = issueAgentPassport('agent-123', 'pi:alice');
    });

    it('includes the W3C credentials context', () => {
      expect(vc['@context']).toContain('https://www.w3.org/2018/credentials/v1');
    });

    it('has a urn:uuid id', () => {
      expect(vc.id).toMatch(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('includes VerifiableCredential and AgentPassportCredential types', () => {
      expect(vc.type).toContain('VerifiableCredential');
      expect(vc.type).toContain('AgentPassportCredential');
    });

    it('sets the issuer DID', () => {
      expect(vc.issuer).toBe('did:axiom:axiomid.app:root');
    });

    it('issuanceDate is a valid ISO 8601 string', () => {
      expect(() => new Date(vc.issuanceDate)).not.toThrow();
      expect(new Date(vc.issuanceDate).toISOString()).toBe(vc.issuanceDate);
    });

    it('proof.type is Ed25519Signature2020', () => {
      expect(vc.proof.type).toBe('Ed25519Signature2020');
    });

    it('proof.verificationMethod points to root key', () => {
      expect(vc.proof.verificationMethod).toBe('did:axiom:axiomid.app:root#key-1');
    });

    it('proof.proofPurpose is assertionMethod', () => {
      expect(vc.proof.proofPurpose).toBe('assertionMethod');
    });

    it('proof.created matches issuanceDate', () => {
      expect(vc.proof.created).toBe(vc.issuanceDate);
    });

    it('proof.proofValue is a non-empty hex string', () => {
      expect(vc.proof.proofValue).toMatch(/^[0-9a-f]+$/);
      expect(vc.proof.proofValue.length).toBeGreaterThan(0);
    });
  });

  describe('credentialSubject defaults', () => {
    it('uses did:axiom:axiomid.app:<agentPublicId> as subject id when no customDid provided', () => {
      const vc = issueAgentPassport('pub-999', 'pi:bob');
      expect(vc.credentialSubject.id).toBe('did:axiom:axiomid.app:pub-999');
    });

    it('uses customDid when provided', () => {
      const vc = issueAgentPassport('pub-999', 'pi:bob', undefined, 'did:custom:override');
      expect(vc.credentialSubject.id).toBe('did:custom:override');
    });

    it('sets owner to the provided wallet address', () => {
      const vc = issueAgentPassport('a1', 'pi:charlie');
      expect(vc.credentialSubject.owner).toBe('pi:charlie');
    });

    it('uses default allowedToolsets when none provided', () => {
      const vc = issueAgentPassport('a1', 'pi:dave');
      expect(vc.credentialSubject.allowedToolsets).toEqual(['file', 'terminal', 'git_sovereign']);
    });

    it('uses custom allowedToolsets when provided', () => {
      const tools = ['read_only', 'audit'];
      const vc = issueAgentPassport('a1', 'pi:eve', tools);
      expect(vc.credentialSubject.allowedToolsets).toEqual(tools);
    });

    it('sets privilegeLevel to 1', () => {
      const vc = issueAgentPassport('a1', 'pi:frank');
      expect(vc.credentialSubject.privilegeLevel).toBe(1);
    });

    it('sets spendLimits.dailyTokenLimit to 500000', () => {
      const vc = issueAgentPassport('a1', 'pi:gina');
      expect(vc.credentialSubject.spendLimits.dailyTokenLimit).toBe(500000);
    });

    it('sets spendLimits.maxUsdcPerTx to 10', () => {
      const vc = issueAgentPassport('a1', 'pi:hans');
      expect(vc.credentialSubject.spendLimits.maxUsdcPerTx).toBe(10);
    });
  });

  describe('deadhandEndpoint', () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    afterEach(() => {
      if (originalAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
      }
    });

    it('defaults to http://localhost:3000/api/agent/pause when NEXT_PUBLIC_APP_URL is not set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      const vc = issueAgentPassport('a1', 'pi:alice');
      expect(vc.credentialSubject.deadhandEndpoint).toBe('http://localhost:3000/api/agent/pause');
    });

    it('uses NEXT_PUBLIC_APP_URL when set', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://axiomid.app';
      const vc = issueAgentPassport('a1', 'pi:alice');
      expect(vc.credentialSubject.deadhandEndpoint).toBe('https://axiomid.app/api/agent/pause');
    });
  });

  describe('each call produces a unique VC id', () => {
    it('generates different urn:uuid ids on successive calls', () => {
      const vc1 = issueAgentPassport('a1', 'pi:alice');
      const vc2 = issueAgentPassport('a1', 'pi:alice');
      expect(vc1.id).not.toBe(vc2.id);
    });
  });

  describe('error handling', () => {
    const originalPrivateKey = process.env.ISSUER_PRIVATE_KEY;

    afterEach(() => {
      process.env.ISSUER_PRIVATE_KEY = originalPrivateKey;
    });

    it('throws when ISSUER_PRIVATE_KEY is not set', () => {
      delete process.env.ISSUER_PRIVATE_KEY;
      expect(() => issueAgentPassport('a1', 'pi:alice')).toThrow(
        'Cryptographic Error: ISSUER_PRIVATE_KEY environment variable is not set.'
      );
    });

    it('throws when ISSUER_PRIVATE_KEY contains a malformed key', () => {
      process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nINVALID\n-----END PRIVATE KEY-----';
      expect(() => issueAgentPassport('a1', 'pi:alice')).toThrow(
        'Cryptographic signature generation failed.'
      );
    });
  });

  describe('signature integrity', () => {
    /** Mirror of the private canonicalizeObject in passport-crypto.ts */
    function canonicalizeObject(obj: unknown): unknown {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(canonicalizeObject);
      const sorted = Object.keys(obj as Record<string, unknown>).sort();
      const result: Record<string, unknown> = {};
      for (const key of sorted) {
        result[key] = canonicalizeObject((obj as Record<string, unknown>)[key]);
      }
      return result;
    }

    it('proofValue is verifiable with the corresponding issuer public key', () => {
      const vc = issueAgentPassport('agent-sig-test', 'pi:sigtest');

      // Reconstruct the exact data that was signed (JCS-style canonicalization)
      const dataToVerify = JSON.stringify(canonicalizeObject(vc.credentialSubject), null, 0);

      const issuerPublicKeyPem = derivePublicKeyFromIssuerPrivate();
      const isValid = verifyAgentSignature(dataToVerify, vc.proof.proofValue, issuerPublicKeyPem);
      expect(isValid).toBe(true);
    });

    it('proofValue from one VC does not verify a different VC subject', () => {
      const vc1 = issueAgentPassport('agent-a', 'pi:alice');
      const vc2 = issueAgentPassport('agent-b', 'pi:bob');
      const dataToVerify = JSON.stringify(canonicalizeObject(vc2.credentialSubject), null, 0);
      const issuerPublicKeyPem = derivePublicKeyFromIssuerPrivate();
      // vc1's signature should NOT verify vc2's data
      expect(verifyAgentSignature(dataToVerify, vc1.proof.proofValue, issuerPublicKeyPem)).toBe(false);
    });
  });
});

// ── verifyAgentSignature ───────────────────────────────────────────────────────

describe('verifyAgentSignature', () => {
  let privateKeyPem: string;
  let publicKeyPem: string;

  beforeAll(() => {
    ({ privateKeyPem, publicKeyPem } = generateEd25519Pair());
  });

  function signMessage(message: string, privKeyPem: string): string {
    const key = createPrivateKey({ key: privKeyPem, format: 'pem', type: 'pkcs8' });
    return cryptoSign(null, Buffer.from(message), key).toString('hex');
  }

  it('returns true for a valid signature with fully-formatted PEM key', () => {
    const message = 'hello world';
    const sig = signMessage(message, privateKeyPem);
    expect(verifyAgentSignature(message, sig, publicKeyPem)).toBe(true);
  });

  it('returns true when public key lacks PEM headers (auto-wraps them)', () => {
    const message = 'deadhand trigger';
    const sig = signMessage(message, privateKeyPem);

    // Strip PEM headers to simulate a raw base64 key
    const rawBase64 = publicKeyPem
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .trim();

    expect(verifyAgentSignature(message, sig, rawBase64)).toBe(true);
  });

  it('returns false for a tampered message', () => {
    const message = 'original message';
    const sig = signMessage(message, privateKeyPem);
    expect(verifyAgentSignature('tampered message', sig, publicKeyPem)).toBe(false);
  });

  it('returns false for an incorrect signature', () => {
    const message = 'correct message';
    const wrongSig = signMessage('different message', privateKeyPem);
    expect(verifyAgentSignature(message, wrongSig, publicKeyPem)).toBe(false);
  });

  it('returns false when verified with a different (wrong) public key', () => {
    const message = 'auth token';
    const sig = signMessage(message, privateKeyPem);
    const { publicKeyPem: wrongPublicKey } = generateEd25519Pair();
    expect(verifyAgentSignature(message, sig, wrongPublicKey)).toBe(false);
  });

  it('returns false for an empty signature string', () => {
    expect(verifyAgentSignature('message', '', publicKeyPem)).toBe(false);
  });

  it('returns false for a non-hex (invalid) signature string', () => {
    expect(verifyAgentSignature('message', 'not-a-valid-hex-sig!!!', publicKeyPem)).toBe(false);
  });

  it('returns false for a completely invalid public key', () => {
    expect(verifyAgentSignature('message', 'aabb', 'not-a-key-at-all')).toBe(false);
  });

  it('returns false for a bit-flipped signature', () => {
    const message = 'flip test';
    const sig = signMessage(message, privateKeyPem);
    // Flip the last two hex characters
    const flipped = sig.slice(0, -2) + (sig.slice(-2) === '00' ? 'ff' : '00');
    expect(verifyAgentSignature(message, flipped, publicKeyPem)).toBe(false);
  });

  it('handles an empty message correctly (signature still matches)', () => {
    const sig = signMessage('', privateKeyPem);
    expect(verifyAgentSignature('', sig, publicKeyPem)).toBe(true);
  });

  it('is case-sensitive for the message', () => {
    const message = 'CaseSensitive';
    const sig = signMessage(message, privateKeyPem);
    expect(verifyAgentSignature('casesensitive', sig, publicKeyPem)).toBe(false);
  });
});
