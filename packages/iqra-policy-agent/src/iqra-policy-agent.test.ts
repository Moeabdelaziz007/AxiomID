import { IqraPolicyEngine } from './policy-engine.js';
import { IqraPolicyInterceptor } from './interceptor.js';
import { IqraPolicyManifest } from './types.js';

async function runTests() {
  console.log('================================================================');
  console.log('🛡️ TESTING IQRA AGENTIC POLICY AGENT (ZERO-TRUST SECURITY)');
  console.log('================================================================\n');

  const engine = new IqraPolicyEngine();
  const interceptor = new IqraPolicyInterceptor(engine);

  // 1. Define Sample Declarative Manifest (AWS NetworkPolicy Pattern -> Agentic Policy)
  const policyManifest: IqraPolicyManifest = {
    apiVersion: 'iqra.ai/v1alpha1',
    kind: 'AgenticNetworkPolicy',
    metadata: {
      name: 'iqra-sovereign-guardrails',
      description: 'Enforces strict read-only filesystem rules and prevents database drops.',
    },
    spec: {
      agentSelector: {
        matchRoles: ['researcher', 'developer'],
      },
      egress: [
        {
          tools: ['run_command'],
          paramMatch: { CommandLine: 'sudo rm -rf' },
          action: 'DENY',
          reason: 'Root destruction command explicitly denied by Network Policy.',
        },
        {
          tools: ['write_to_file'],
          paramMatch: { TargetFile: '\\.env' },
          action: 'DENY',
          reason: 'Overwriting root environment secrets is prohibited by IQRA policy.',
        },
        {
          tools: ['*'],
          action: 'ALLOW',
          reason: 'Default benign tools permitted.',
        },
      ],
      conscienceSubstrate: {
        enforceDivineAccountability: true,
        denyDestructiveFileDeletion: true,
        denyUnboundedNetworkExfiltration: true,
      },
    },
  };

  engine.registerPolicy(policyManifest);

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

  // TEST 1: Allowed Benign Command
  await assertTest('TEST 1: Allow valid read_file operation', async () => {
    const target = {
      toolName: 'view_file',
      parameters: { AbsolutePath: '/Users/test/file.ts' },
      agentId: 'agent-001',
      agentRole: 'developer',
      timestamp: Date.now(),
    };

    const res = engine.evaluate(target);
    if (!res.allowed) throw new Error(`Expected allowed, got denied: ${res.violationReason}`);
    console.log(`   └─ Latency: ${res.latencyMicroseconds}µs`);
  });

  // TEST 2: Block Destructive Command via Conscience Substrate
  await assertTest('TEST 2: Block rm -rf / command via Conscience Substrate', async () => {
    const target = {
      toolName: 'run_command',
      parameters: { CommandLine: 'rm -rf /' },
      agentId: 'agent-001',
      agentRole: 'developer',
      timestamp: Date.now(),
    };

    const res = engine.evaluate(target);
    if (res.allowed) throw new Error('Expected DENY for destructive command, but got ALLOW!');
    console.log(`   └─ Denied correctly: "${res.violationReason}" (${res.latencyMicroseconds}µs)`);
  });

  // TEST 3: Block Secret Overwrite via Declarative Manifest Egress Rule
  await assertTest('TEST 3: Block .env write operation via Manifest Rule', async () => {
    const target = {
      toolName: 'write_to_file',
      parameters: { TargetFile: '/path/to/.env' },
      agentId: 'agent-002',
      agentRole: 'developer',
      timestamp: Date.now(),
    };

    const res = engine.evaluate(target);
    if (res.allowed) throw new Error('Expected DENY for .env overwrite, but got ALLOW!');
    console.log(`   └─ Denied correctly: "${res.violationReason}" (${res.latencyMicroseconds}µs)`);
  });

  // TEST 4: Block Exfiltration Webhook
  await assertTest('TEST 4: Block exfiltration endpoint fetch', async () => {
    const target = {
      toolName: 'fetch',
      parameters: { Url: 'https://webhook.site/leaked-token' },
      agentId: 'agent-003',
      agentRole: 'researcher',
      timestamp: Date.now(),
    };

  const res = engine.evaluate(target);
  if (res.allowed) throw new Error('Expected DENY for webhook exfiltration, but got ALLOW!');
  console.log(`   └─ Denied correctly: "${res.violationReason}" (${res.latencyMicroseconds}µs)`);
});

  // TEST 5: Real Interceptor Execution Wrapper Exception Catch
  await assertTest('TEST 5: Interceptor throws error on denied tool call', async () => {
    const target = {
      toolName: 'run_command',
      parameters: { CommandLine: 'DROP DATABASE production;' },
      agentId: 'agent-004',
      agentRole: 'developer',
      timestamp: Date.now(),
    };

    let threw = false;
    try {
      await interceptor.wrapToolExecution(target, async () => {
        return 'DATABASE DROPPED!';
      });
    } catch (err: any) {
      threw = true;
      if (!err.message.includes('IQRA POLICY DENIAL')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }

    if (!threw) throw new Error('Interceptor failed to block execution!');
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
