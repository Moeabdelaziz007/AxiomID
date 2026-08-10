import { DidValidator } from '../packages/did-integrity-guard/src/did-validator.js';
import { AgentAppValidator } from '../packages/agent-app-models/src/validator.js';
import { IqraPolicyEngine } from '../packages/iqra-policy-agent/src/policy-engine.js';

async function runEmpiricalBenchmark() {
  console.log('================================================================');
  console.log('⚡ PAI REHEARSE — EMPIRICAL SYSTEM BENCHMARK HARNESS (0 MOCKS)');
  console.log('================================================================\n');

  const ITERATIONS = 100;

  // 1. Ed25519 WebCrypto Key Generation & Verification Benchmark
  console.log('1. Measuring Ed25519 WebCrypto Cryptographic Engine...');
  const validator = new DidValidator();
  const { publicKeyJwk, privateKeyJwk } = await validator.generateEd25519KeyPair();
  const did = 'did:axiomid:z6MkpBenchmarkKey2026';
  const payload = `${did}:2026-07-22T20:00:00Z:assertionMethod`;
  const signature = await validator.signEd25519Payload(privateKeyJwk, payload);

  const startCrypto = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await validator.verifyEd25519Signature(publicKeyJwk, signature, payload);
  }
  const endCrypto = performance.now();
  const totalCryptoMs = endCrypto - startCrypto;
  const avgCryptoMicroseconds = (totalCryptoMs / ITERATIONS) * 1000;
  const cryptoOpsPerSec = Math.round((ITERATIONS / totalCryptoMs) * 1000);

  console.log(`   └─ Average Verification Latency: ${avgCryptoMicroseconds.toFixed(2)}µs`);
  console.log(`   └─ Throughput: ${cryptoOpsPerSec.toLocaleString()} ops/sec\n`);

  // 2. IQRA Conscience Substrate Policy Interceptor Benchmark
  console.log('2. Measuring IQRA Conscience Substrate Policy Engine...');
  const policyEngine = new IqraPolicyEngine();

  const startPolicy = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    policyEngine.evaluate({
      toolName: 'read_file',
      args: { path: '/Users/cryptojoker710/Desktop/_A-CORE/AxiomID/README.md' },
      userDid: 'did:axiom:usr_88f2x',
    });
  }
  const endPolicy = performance.now();
  const totalPolicyMs = endPolicy - startPolicy;
  const avgPolicyMicroseconds = (totalPolicyMs / ITERATIONS) * 1000;
  const policyOpsPerSec = Math.round((ITERATIONS / totalPolicyMs) * 1000);

  console.log(`   └─ Average Policy Evaluation Latency: ${avgPolicyMicroseconds.toFixed(2)}µs`);
  console.log(`   └─ Throughput: ${policyOpsPerSec.toLocaleString()} ops/sec\n`);

  // 3. Agent App Models Manifest Security Validator Benchmark
  console.log('3. Measuring Agent App Models Security Validator Engine...');
  const appValidator = new AgentAppValidator();
  const sampleApp = {
    manifestVersion: '0.1' as const,
    app: {
      appId: 'app_axiomid_analytics',
      name: 'Agent Analytics App',
      version: '1.0.0',
      description: 'Analytics dashboard',
      developerDid: 'did:axiom:dev_88f2x',
    },
    permissions: [
      { scope: 'memory:read' as const, reason: 'read telemetry metrics' },
    ],
    capabilities: [],
    sandboxed: true,
    created_at: '2026-07-22T20:00:00Z',
    updated_at: '2026-07-22T20:00:00Z',
  };

  const startAppVal = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    appValidator.validateAppManifest(sampleApp);
  }
  const endAppVal = performance.now();
  const totalAppValMs = endAppVal - startAppVal;
  const avgAppValMicroseconds = (totalAppValMs / ITERATIONS) * 1000;
  const appValOpsPerSec = Math.round((ITERATIONS / totalAppValMs) * 1000);

  console.log(`   └─ Average App Validation Latency: ${avgAppValMicroseconds.toFixed(2)}µs`);
  console.log(`   └─ Throughput: ${appValOpsPerSec.toLocaleString()} ops/sec\n`);

  // Summary Metrics Table
  console.log('================================================================');
  console.log('📊 EMPIRICAL SYSTEM BENCHMARK SUMMARY TABLE');
  console.log('================================================================');
  console.log(`• Ed25519 WebCrypto Verify: ${avgCryptoMicroseconds.toFixed(2)} µs/op (${cryptoOpsPerSec.toLocaleString()} ops/sec)`);
  console.log(`• IQRA Policy Interceptor : ${avgPolicyMicroseconds.toFixed(2)} µs/op (${policyOpsPerSec.toLocaleString()} ops/sec)`);
  console.log(`• Agent App Validator     : ${avgAppValMicroseconds.toFixed(2)} µs/op (${appValOpsPerSec.toLocaleString()} ops/sec)`);
  console.log('================================================================\n');
}

runEmpiricalBenchmark().catch((e) => {
  console.error(e);
  process.exit(1);
});
