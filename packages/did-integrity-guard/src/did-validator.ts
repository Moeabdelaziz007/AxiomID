import { DidDocument, DidValidationResult } from './types.js';

/**
 * Real W3C DID Cryptographic Verification Engine
 * Implements WebCrypto Ed25519 Signature Verification & Proof Validation
 */
export class DidValidator {
  /**
   * Generates a real Ed25519 WebCrypto keypair for agent DID signing
   */
  public async generateEd25519KeyPair(): Promise<{
    publicKeyJwk: JsonWebKey;
    privateKeyJwk: JsonWebKey;
  }> {
    const keyPair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    return { publicKeyJwk, privateKeyJwk };
  }

  /**
   * Cryptographically signs a DID payload using Ed25519 WebCrypto
   */
  public async signEd25519Payload(privateKeyJwk: JsonWebKey, payload: string): Promise<string> {
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      { name: 'Ed25519' },
      false,
      ['sign']
    );
    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign(
      'Ed25519',
      privateKey,
      encoder.encode(payload)
    );
    return Buffer.from(signatureBuffer).toString('base64');
  }

  /**
   * Verifies an Ed25519 cryptographic signature using WebCrypto SubleCrypto API
   */
  public async verifyEd25519Signature(
    publicKeyJwk: JsonWebKey,
    signatureBase64: string,
    payload: string
  ): Promise<boolean> {
    try {
      const publicKey = await crypto.subtle.importKey(
        'jwk',
        publicKeyJwk,
        { name: 'Ed25519' },
        false,
        ['verify']
      );
      const encoder = new TextEncoder();
      const signatureBytes = Buffer.from(signatureBase64, 'base64');
      return await crypto.subtle.verify(
        'Ed25519',
        publicKey,
        signatureBytes,
        encoder.encode(payload)
      );
    } catch {
      return false;
    }
  }

  /**
   * Validates a DID identifier, document structure, and Ed25519 cryptographic proof
   */
  public async validateDidAsync(doc: DidDocument): Promise<DidValidationResult> {
    // 1. Syntactic W3C DID Format Check (did:<method>:<namespace/id>)
    const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9.\-_:]+$/;
    if (!didRegex.test(doc.id)) {
      return {
        valid: false,
        did: doc.id,
        reason: 'Malformed DID URI structure. Fails W3C regex specification.',
        trustScore: 0,
        cryptoVerified: false,
      };
    }

    // 2. Check Key Revocation Status
    if (doc.revoked === true) {
      return {
        valid: false,
        did: doc.id,
        reason: 'DID key material has been revoked by controller.',
        trustScore: 0,
        cryptoVerified: false,
      };
    }

    // 3. Verification Method Array Check
    if (!doc.verificationMethod || doc.verificationMethod.length === 0) {
      return {
        valid: false,
        did: doc.id,
        reason: 'Missing public key verificationMethod array. Fake or incomplete DID.',
        trustScore: 10,
        cryptoVerified: false,
      };
    }

    // 4. Controller Match Check
    const primaryKey = doc.verificationMethod[0]!;
    if (!primaryKey.controller || !doc.id.startsWith(primaryKey.controller)) {
      return {
        valid: false,
        did: doc.id,
        reason: 'Key controller mismatch. Spoofed verification key detected.',
        trustScore: 25,
        cryptoVerified: false,
      };
    }

    // 5. Cryptographic Signature Verification (Ed25519 WebCrypto)
    let cryptoVerified = false;
    if (doc.proof && primaryKey.publicKeyJwk) {
      const canonicalPayload = `${doc.id}:${doc.proof.created}:${doc.proof.proofPurpose}`;
      const isValidSig = await this.verifyEd25519Signature(
        primaryKey.publicKeyJwk,
        doc.proof.proofValue,
        canonicalPayload
      );

      if (!isValidSig) {
        return {
          valid: false,
          did: doc.id,
          reason: 'Cryptographic signature verification failed! Invalid Ed25519 proof signature.',
          trustScore: 0,
          cryptoVerified: false,
        };
      }
      cryptoVerified = true;
    }

    // All checks pass -> Valid Cryptographic DID
    return {
      valid: true,
      did: doc.id,
      trustScore: cryptoVerified ? 100 : 95,
      cryptoVerified,
    };
  }

  /**
   * Synchronous validation fallback for legacy syntactic calls
   */
  public validateDid(doc: DidDocument): DidValidationResult {
    const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9.\-_:]+$/;
    if (!didRegex.test(doc.id)) {
      return { valid: false, did: doc.id, reason: 'Malformed DID URI structure.', trustScore: 0 };
    }
    if (doc.revoked === true) {
      return { valid: false, did: doc.id, reason: 'DID key material has been revoked by controller.', trustScore: 0 };
    }
    if (!doc.verificationMethod || doc.verificationMethod.length === 0) {
      return { valid: false, did: doc.id, reason: 'Missing public key verificationMethod array.', trustScore: 10 };
    }
    const primaryKey = doc.verificationMethod[0]!;
    if (!primaryKey.controller || !doc.id.startsWith(primaryKey.controller)) {
      return { valid: false, did: doc.id, reason: 'Key controller mismatch.', trustScore: 25 };
    }
    return { valid: true, did: doc.id, trustScore: 95 };
  }
}
