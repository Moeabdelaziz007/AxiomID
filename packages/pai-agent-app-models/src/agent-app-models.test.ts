import { AgentAppValidator } from './validator.js';
import { AgentAppManifest } from './types.js';

console.log('================================================================');
console.log('📱 TESTING AGENT APP MODELS & MANIFEST SECURITY VALIDATOR');
console.log('================================================================\n');

const validator = new AgentAppValidator();
let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.log(`❌ [FAIL] ${msg}`);
    failed++;
  }
}

// TEST 1: Valid Sandboxed Agent App Manifest
const validManifest: AgentAppManifest = {
  manifestVersion: '0.1',
  app: {
    appId: 'app_axiomid_analytics',
    name: 'Agent Analytics & Metrics App',
    version: '1.0.0',
    description: 'Autonomous analytics dashboard for AI agents',
    developerDid: 'did:axiom:dev_88f2x99',
    iconUrl: 'https://axiomid.app/apps/analytics/icon.png',
  },
  permissions: [
    {
      scope: 'memory:read',
      reason: 'Read agent telemetry and performance metrics for visualization',
      maxCallsPerMin: 60,
    },
    {
      scope: 'network:egress',
      reason: 'Push aggregated metrics to telemetry server',
      allowedDomains: ['https://telemetry.axiomid.app'],
    },
  ],
  capabilities: [
    {
      name: 'metrics-exporter',
      endpoint: 'https://axiomid.app/api/apps/analytics',
      protocol: 'rest',
      version: '1.0',
    },
  ],
  sandboxed: true,
  created_at: '2026-07-22T20:00:00Z',
  updated_at: '2026-07-22T20:00:00Z',
};

const res1 = validator.validateAppManifest(validManifest);
assert(res1.valid, `Valid Agent App passed validation (AppID: ${res1.appId}, Risk Score: ${res1.securityRiskScore}/100)`);

// TEST 2: Unsandboxed App Requesting Shell Execution (Forbidden)
const dangerousManifest: AgentAppManifest = {
  manifestVersion: '0.1',
  app: {
    appId: 'app_malicious_shell',
    name: 'Rogue Shell Exec App',
    version: '0.0.1',
    description: 'Attempts shell execution outside sandbox',
    developerDid: 'did:axiom:bad_actor',
  },
  permissions: [
    {
      scope: 'execute:command',
      reason: 'run shell scripts',
    },
    {
      scope: 'network:egress',
      reason: 'send data',
      allowedDomains: [], // Missing required domain list
    },
  ],
  capabilities: [],
  sandboxed: false, // UNSANDBOXED
  created_at: '2026-07-22T20:00:00Z',
  updated_at: '2026-07-22T20:00:00Z',
};

const res2 = validator.validateAppManifest(dangerousManifest);
assert(!res2.valid, `Dangerous Agent App correctly REJECTED (Risk Score: ${res2.securityRiskScore}/100 | Errors: ${res2.errors.join(' | ')})`);

console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) process.exit(1);
