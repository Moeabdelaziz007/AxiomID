import { createUserDid, createIssuerDid, createPiDid } from '@/lib/did';

describe('DID Utils', () => {
  describe('createUserDid', () => {
    it('creates correct user DID format', () => {
      expect(createUserDid('user123')).toBe('did:axiom:user-user123');
    });
  });

  describe('createIssuerDid', () => {
    it('creates correct issuer DID format', () => {
      expect(createIssuerDid()).toBe('did:axiom:issuer');
    });
  });

  describe('createPiDid', () => {
    it('creates correct Pi DID format for a simple uid', () => {
      expect(createPiDid('mock-pi-uid')).toBe('did:axiom:axiomid.app:pi:mock-pi-uid');
    });

    it('includes the axiomid.app:pi: namespace segment', () => {
      const did = createPiDid('abc123');
      expect(did).toMatch(/^did:axiom:axiomid\.app:pi:/);
    });

    it('URL-encodes special characters in the uid', () => {
      expect(createPiDid('uid with spaces')).toBe('did:axiom:axiomid.app:pi:uid%20with%20spaces');
    });

    it('URL-encodes colons in the uid', () => {
      expect(createPiDid('uid:with:colons')).toBe('did:axiom:axiomid.app:pi:uid%3Awith%3Acolons');
    });

    it('URL-encodes slashes in the uid', () => {
      expect(createPiDid('uid/slash')).toBe('did:axiom:axiomid.app:pi:uid%2Fslash');
    });

    it('throws ZodError for an empty string uid', () => {
      expect(() => createPiDid('')).toThrow();
    });

    it('throws for a non-string uid (null)', () => {
      expect(() => createPiDid(null as any)).toThrow();
    });

    it('throws for a non-string uid (undefined)', () => {
      expect(() => createPiDid(undefined as any)).toThrow();
    });

    it('handles a uid that is just a number string', () => {
      expect(createPiDid('12345')).toBe('did:axiom:axiomid.app:pi:12345');
    });

    it('produces a DID that contains the original uid when no encoding needed', () => {
      const uid = 'plain-uid-99';
      const did = createPiDid(uid);
      expect(did.endsWith(uid)).toBe(true);
    });
  });
});
