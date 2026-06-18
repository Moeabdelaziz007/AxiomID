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
    it('creates correct Pi DID format', () => {
      expect(createPiDid('pi-uid-123')).toBe('did:axiom:axiomid.app:pi:pi-uid-123');
    });

    it('URI-encodes special characters in the uid', () => {
      expect(createPiDid('a b/c')).toBe('did:axiom:axiomid.app:pi:a%20b%2Fc');
    });

    it('throws on an empty uid', () => {
      expect(() => createPiDid('')).toThrow();
    });
  });
});
