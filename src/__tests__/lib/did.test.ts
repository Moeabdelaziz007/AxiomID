import { createPassportDid, createUserDid, createIssuerDid } from '@/lib/did';

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

  describe('createPassportDid', () => {
    it('creates correct passport DID for normal slug', () => {
      expect(createPassportDid('my-passport')).toBe('did:axiom:my-passport');
    });

    it('collapses consecutive hyphens', () => {
      expect(createPassportDid('my--passport---slug')).toBe('did:axiom:my-passport-slug');
    });

    it('trims leading and trailing hyphens', () => {
      expect(createPassportDid('-my-passport-')).toBe('did:axiom:my-passport');
    });

    it('removes invalid characters', () => {
      expect(createPassportDid('my_passport$slug!')).toBe('did:axiom:mypassportslug');
    });

    it('throws error if sanitized slug is empty', () => {
      expect(() => createPassportDid('!@#$')).toThrow('Passport slug cannot be empty after sanitization');
    });
  });
});
