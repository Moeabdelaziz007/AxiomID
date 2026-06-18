import { createUserDid, createIssuerDid } from '@/lib/did';

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
});
