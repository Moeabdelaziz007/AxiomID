#!/usr/bin/env node
// ============================================================
// REAL E2E TEST — pai-7loop-router on Cloudflare Workers
// Hits the LIVE production URL, not localhost
// Usage: WORKER_URL=https://pai-7loop-router.<account>.workers.dev node test_live.mjs
// ============================================================

const BASE = process.env.WORKER_URL;
if (!BASE) {
  console.error('❌ Set WORKER_URL env var: export WORKER_URL=https://pai-7loop-router.<account>.workers.dev');
  process.exit(1);
}

let pass = 0; let fail = 0;

async function req(method, path, body) {
  const t = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const latencyMs = Date.now() - t;
  const json = await res.json();
  return { status: res.status, json, latencyMs };
}

function assert(label, condition, detail = '') {
  if (condition) { console.log(`  ✅ ${label}`); pass++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); fail++; }
}

console.log(`\n🌐 Testing LIVE worker: ${BASE}\n`);

// ─── TEST 1: POST /route — English code prompt ─────────────────────────────
console.log('TEST 1: POST /route (English code prompt)');
{
  const { status, json, latencyMs } = await req('POST', '/route', {
    prompt: 'Write a TypeScript fibonacci function'
  });
  console.log(`  Latency: ${latencyMs}ms | Response:`, JSON.stringify(json));
  assert('HTTP 200', status === 200, `got ${status}`);
  assert('has provider field', typeof json.provider === 'string');
  assert('has model field', typeof json.model === 'string');
  assert('has isExploration boolean', typeof json.isExploration === 'boolean');
  assert('provider is known', ['deepseek', 'openrouter', 'together', 'cloudflare'].includes(json.provider),
    `got: ${json.provider}`);
}

// ─── TEST 2: POST /route — Arabic prompt ──────────────────────────────────
console.log('\nTEST 2: POST /route (Arabic prompt)');
{
  const { status, json, latencyMs } = await req('POST', '/route', {
    prompt: 'اكتب دالة فيبوناتشي'
  });
  console.log(`  Latency: ${latencyMs}ms | Response:`, JSON.stringify(json));
  assert('HTTP 200', status === 200, `got ${status}`);
  assert('has provider', typeof json.provider === 'string');
}

// ─── TEST 2B: POST /route — Chinese prompt (zh language detection) ────────
console.log('\nTEST 2B: POST /route (Chinese prompt - zh detection)');
{
  const { status, json, latencyMs } = await req('POST', '/route', {
    prompt: '优化 DeepSeek R1 的 TypeScript 代码'
  });
  console.log(`  Latency: ${latencyMs}ms | Response:`, JSON.stringify(json));
  assert('HTTP 200', status === 200, `got ${status}`);
  assert('has provider', typeof json.provider === 'string');
}

// ─── TEST 3: POST /route — Missing prompt (400 validation) ────────────────
console.log('\nTEST 3: POST /route (missing prompt → 400)');
{
  const { status, json } = await req('POST', '/route', {});
  console.log(`  Response:`, JSON.stringify(json));
  assert('HTTP 400 on missing prompt', status === 400, `got ${status}`);
  assert('has error field', typeof json.error === 'string');
}

// ─── TEST 4: POST /feedback — Record real inference result ────────────────
console.log('\nTEST 4: POST /feedback (record inference result)');
{
  const { status, json, latencyMs } = await req('POST', '/feedback', {
    timestamp:   Date.now(),
    provider:    'deepseek',
    model:       'deepseek-chat',
    latencyMs:   450,
    costPer1M:   0.14,
    success:     true,
    userRating:  5,
  });
  console.log(`  Latency: ${latencyMs}ms | Response:`, JSON.stringify(json));
  assert('HTTP 200', status === 200, `got ${status}`);
  assert('recorded: true', json.recorded === true);
}

// ─── TEST 5: POST /feedback — Missing fields (400) ────────────────────────
console.log('\nTEST 5: POST /feedback (missing field → 400)');
{
  const { status, json } = await req('POST', '/feedback', {
    timestamp: Date.now(),
    provider: 'deepseek',
    // missing: model, latencyMs, costPer1M, success
  });
  console.log(`  Response:`, JSON.stringify(json));
  assert('HTTP 400 on incomplete feedback', status === 400, `got ${status}`);
}

// ─── TEST 6: GET /weights — Inspect bandit state ──────────────────────────
console.log('\nTEST 6: GET /weights (inspect live bandit state)');
{
  const { status, json, latencyMs } = await req('GET', '/weights');
  console.log(`  Latency: ${latencyMs}ms | Response:`, JSON.stringify(json));
  assert('HTTP 200', status === 200, `got ${status}`);
  assert('has weights object', typeof json.weights === 'object');
  assert('has epsilon', typeof json.epsilon === 'number');
  assert('epsilon in (0,1)', json.epsilon > 0 && json.epsilon <= 1,
    `got ${json.epsilon}`);
  assert('has totalObservations', typeof json.totalObservations === 'number');
}

// ─── TEST 7: Unknown route → 404 ─────────────────────────────────────────
console.log('\nTEST 7: GET /unknown → 404');
{
  const { status } = await req('GET', '/nonexistent');
  assert('HTTP 404', status === 404, `got ${status}`);
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════');
console.log(`✅ PASSED: ${pass}  ❌ FAILED: ${fail}  TOTAL: ${pass + fail}`);
console.log(`Worker URL: ${BASE}`);
console.log('════════════════════════════════════\n');

if (fail > 0) process.exit(1);
