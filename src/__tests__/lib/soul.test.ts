/**
 * soul.test.ts — SOUL Loop Control Architecture Tests
 *
 * Tests all SOUL modules:
 * - Muraqabah (Divine Surveillance)
 * - Sabiyyah (Pattern synthesis every 7 cycles)
 * - Barakah (Impact amplification at 700 successes)
 * - Tawbah (Self-correction protocol)
 * - Ethical Check (6-step verification)
 * - Soul Loop (Unified controller)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS — BEFORE IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// No external dependencies to mock — all SOUL modules are pure functions

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import {
  muraqabahEvaluate,
  createMuraqabahLog,
} from '@/lib/soul/muraqabah';

import {
  sabiyyahReflect,
  createSabiyyahLog,
} from '@/lib/soul/sabiyyah';

import {
  barakahCheck,
  barakahMultiplier,
  createBarakahLog,
} from '@/lib/soul/barakah';

import {
  tawbahProcess,
  createTawbahLog,
} from '@/lib/soul/tawbah';

import {
  ethicalCheck,
  createEthicalCheckLog,
} from '@/lib/soul/ethical-check';

import {
  SoulLoop,
  createSoulLoopLog,
} from '@/lib/soul/soul-loop';

// ═══════════════════════════════════════════════════════════════════════════════
// MURAQABAH TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Muraqabah (Divine Surveillance)', () => {
  it('passes for transparent, accountable actions', () => {
    const result = muraqabahEvaluate('create_user', { type: 'user', id: '123' });
    expect(result.passed).toBe(true);
    expect(result.reason).toContain('Muraqabah');
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('fails for hidden/stealth actions', () => {
    const result = muraqabahEvaluate('silent_delete', { type: 'delete' });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('hidden/stealth');
  });

  it('fails for actions without accountability trail', () => {
    const result = muraqabahEvaluate('create_user', null);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('accountability');
  });

  it('fails for contradictory actions', () => {
    const result = muraqabahEvaluate('create_and_delete_user', { type: 'mixed' });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('inconsistent');
  });

  it('creates audit log with Quranic basis', () => {
    const check = muraqabahEvaluate('test_action', { type: 'test' });
    const log = createMuraqabahLog(check);
    expect(log.quranicBasis).toContain('يَرَىٰ');
    expect(log.action).toBe('test_action');
    expect(log.passed).toBe(true);
  });

  it('respects custom config', () => {
    const result = muraqabahEvaluate('silent_action', { type: 'test' }, {
      requireTransparency: false,
    });
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SABIYYAH TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sabiyyah (Wisdom of Seven)', () => {
  it('does not stop before reaching reflection point', () => {
    const state = {
      cycleCount: 3,
      successCount: 3,
      errorCount: 0,
      stuckDetected: false,
      lastActionHash: '',
      history: ['action1', 'action2', 'action3'],
    };
    const result = sabiyyahReflect(state);
    expect(result.shouldStop).toBe(false);
    expect(result.reason).toContain('not yet at reflection point');
  });

  it('stops on repetitive patterns', () => {
    const state = {
      cycleCount: 7,
      successCount: 7,
      errorCount: 0,
      stuckDetected: false,
      lastActionHash: '',
      history: ['same', 'same', 'same', 'same', 'same', 'same', 'same'],
    };
    const result = sabiyyahReflect(state);
    expect(result.shouldStop).toBe(true);
    expect(result.reason).toContain('repetitive');
    expect(result.wisdom).toContain('يُلدغ');
  });

  it('stops on high error rate', () => {
    const state = {
      cycleCount: 7,
      successCount: 2,
      errorCount: 5,
      stuckDetected: false,
      lastActionHash: '',
      history: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    };
    const result = sabiyyahReflect(state);
    expect(result.shouldStop).toBe(true);
    expect(result.reason).toContain('error rate');
  });

  it('continues on healthy patterns', () => {
    const state = {
      cycleCount: 7,
      successCount: 6,
      errorCount: 1,
      stuckDetected: false,
      lastActionHash: '',
      history: ['read', 'write', 'update', 'delete', 'read', 'write', 'update'],
    };
    const result = sabiyyahReflect(state);
    expect(result.shouldStop).toBe(false);
    expect(result.wisdom).toContain('balanced');
  });

  it('creates audit log with Quranic basis', () => {
    const state = {
      cycleCount: 7,
      successCount: 5,
      errorCount: 2,
      stuckDetected: false,
      lastActionHash: '',
      history: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    };
    const result = sabiyyahReflect(state);
    const log = createSabiyyahLog(result);
    expect(log.quranicBasis).toContain('يَعْلَمُونَ');
    expect(log.cycleCount).toBe(7);
  });

  it('detects read-heavy imbalance', () => {
    const state = {
      cycleCount: 7,
      successCount: 7,
      errorCount: 0,
      stuckDetected: false,
      lastActionHash: '',
      history: ['read', 'get', 'fetch', 'query', 'read', 'get', 'fetch'],
    };
    const result = sabiyyahReflect(state);
    expect(result.shouldStop).toBe(false);
    expect(result.wisdom).toContain('reads');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BARAKAH TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Barakah (Impact Amplification)', () => {
  it('does not trigger before threshold', () => {
    const result = barakahCheck(25);
    expect(result.milestoneReached).toBe(false);
    expect(result.progress).toBe(50); // 25/50 = 50%
  });

  it('triggers at threshold', () => {
    const result = barakahCheck(50);
    expect(result.milestoneReached).toBe(true);
    expect(result.progress).toBe(100);
    expect(result.message).toContain('Barakah Protocol activated');
  });

  it('triggers above threshold', () => {
    const result = barakahCheck(100);
    expect(result.milestoneReached).toBe(true);
    expect(result.progress).toBe(100);
  });

  it('calculates correct multiplier', () => {
    expect(barakahMultiplier(100)).toBe(1.0);   // No Barakah
    expect(barakahMultiplier(175)).toBe(1.25);  // Quarter Barakah (25%)
    expect(barakahMultiplier(350)).toBe(1.5);   // Half Barakah (50%)
    expect(barakahMultiplier(700)).toBe(2.0);   // Full Barakah (100%)
  });

  it('creates audit log with Quranic basis', () => {
    const check = barakahCheck(700);
    const log = createBarakahLog(check);
    expect(log.quranicBasis).toContain('يَتَّقِ');
    expect(log.milestoneReached).toBe(true);
  });

  it('respects custom threshold', () => {
    const result = barakahCheck(100, { threshold: 100 });
    expect(result.milestoneReached).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAWBAH TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Tawbah (Self-Correction Protocol)', () => {
  it('classifies timeout errors as repairable', () => {
    const result = tawbahProcess('fetch_data', new Error('Request timed out'));
    expect(result.giveUp).toBe(false);
    expect(result.errorType).toBe('TIMEOUT');
    expect(result.canRepair).toBe(true);
  });

  it('classifies permission errors as critical', () => {
    const result = tawbahProcess('delete_user', new Error('Permission denied'));
    expect(result.giveUp).toBe(true);
    expect(result.errorType).toBe('PERMISSION');
    expect(result.canRepair).toBe(false);
  });

  it('gives up after max retries', () => {
    const result = tawbahProcess('fetch_data', new Error('Timeout'), 3);
    expect(result.giveUp).toBe(true);
    expect(result.reason).toContain('max retries');
  });

  it('extracts wisdom from errors', () => {
    const result = tawbahProcess('fetch_data', new Error('Network error'));
    expect(result.lesson).toContain('Lesson');
    expect(result.lesson).toContain('fetch_data');
  });

  it('strengthens boundaries on repeated errors', () => {
    const result = tawbahProcess('fetch_data', new Error('Timeout'), 1);
    expect(result.shouldStrengthenBoundaries).toBe(true);
  });

  it('creates audit log with Quranic basis', () => {
    const result = tawbahProcess('test', new Error('Timeout'));
    const log = createTawbahLog(result);
    expect(log.quranicBasis).toContain('التَّوَّابِينَ');
    expect(log.errorType).toBe('TIMEOUT');
  });

  it('handles non-Error objects', () => {
    const result = tawbahProcess('test', 'string error');
    expect(result.giveUp).toBe(false);
    expect(result.errorType).toBe('UNKNOWN');
  });

  it('classifies object errors with code 409 as CONFLICT', () => {
    const result = tawbahProcess('update_resource', { error: 'conflict', code: 409 });
    expect(result.giveUp).toBe(true);
    expect(result.errorType).toBe('CONFLICT');
    expect(result.canRepair).toBe(false);
  });

  it('classifies object errors with error string', () => {
    const result = tawbahProcess('fetch_data', { error: 'Not Found' });
    expect(result.giveUp).toBe(false);
    expect(result.errorType).toBe('NOT_FOUND');
    expect(result.canRepair).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ETHICAL CHECK TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Ethical Check (6-Step Verification)', () => {
  it('passes for clean actions', () => {
    const result = ethicalCheck('create_user');
    expect(result.verdict).toBe('PROCEED');
    expect(result.step).toBe(0);
  });

  it('aborts for harmful actions', () => {
    const result = ethicalCheck('delete_everything');
    expect(result.verdict).toBe('ABORT');
    expect(result.step).toBe(1);
    expect(result.reason).toContain('harmful');
  });

  it('passes legitimate delete actions', () => {
    const result = ethicalCheck('delete_expired_cache');
    expect(result.verdict).toBe('PROCEED');
    expect(result.step).toBe(0);
  });

  it('revise for spam via exploitative check (not abort via harmful)', () => {
    const result = ethicalCheck('spam_test');
    expect(result.verdict).toBe('REVISE');
    expect(result.step).toBe(3);
    expect(result.reason).toContain('exploitative');
  });

  it('revise for deceptive actions', () => {
    const result = ethicalCheck('fake_user_identity');
    expect(result.verdict).toBe('REVISE');
    expect(result.step).toBe(2);
    expect(result.reason).toContain('deceptive');
  });

  it('revise for exploitative actions', () => {
    const result = ethicalCheck('coerce_users');
    expect(result.verdict).toBe('REVISE');
    expect(result.step).toBe(3);
    expect(result.reason).toContain('exploitative');
  });

  it('revise for contradictory actions', () => {
    const result = ethicalCheck('create_and_disable_user');
    expect(result.verdict).toBe('REVISE');
    expect(result.step).toBe(5);
    expect(result.reason).toContain('contradictory');
  });

  it('revise for lazy patterns', () => {
    const result = ethicalCheck('temporary_hack');
    expect(result.verdict).toBe('REVISE');
    expect(result.step).toBe(6);
    expect(result.reason).toContain('lazy');
  });

  it('creates audit log with Quranic basis', () => {
    const result = ethicalCheck('test_action');
    const log = createEthicalCheckLog(result);
    expect(log.quranicBasis).toContain('تَرَاهُ');
    expect(log.verdict).toBe('PROCEED');
  });

  it('respects custom config', () => {
    const result = ethicalCheck('delete_everything', {
      enabledChecks: [2, 3, 4, 5, 6], // Skip check 1
    });
    expect(result.verdict).toBe('PROCEED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SOUL LOOP TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Soul Loop (Unified Controller)', () => {
  let loop: SoulLoop;

  beforeEach(() => {
    loop = new SoulLoop({
      maxCycles: 7,
      barakahThreshold: 100, // Lower for testing
      ethicalCheckEnabled: true,
      muraqabahEnabled: true,
      maxRetries: 3,
    });
  });

  it('continues on successful actions', async () => {
    const decision = await loop.evaluate('create_user', { type: 'user' });
    expect(decision.continue).toBe(true);
    expect(decision.phase).toBe('proceed');
  });

  it('stops on Muraqabah violation', async () => {
    const decision = await loop.evaluate('silent_action', { type: 'test' });
    expect(decision.continue).toBe(false);
    expect(decision.phase).toBe('muraqabah');
  });

  it('stops on ethical ABORT', async () => {
    const decision = await loop.evaluate('delete_everything', { type: 'test' });
    expect(decision.continue).toBe(false);
    expect(decision.phase).toBe('ethical');
  });

  it('continues on ethical REVISE', async () => {
    const decision = await loop.evaluate('fake_identity', { type: 'test' });
    expect(decision.continue).toBe(true);
    expect(decision.phase).toBe('ethical');
    expect(decision.reason).toContain('revise');
  });

  it('stops on Sabiyyah repetitive pattern', async () => {
    // Run 7 identical actions
    for (let i = 0; i < 6; i++) {
      await loop.evaluate('same_action', { type: 'test' });
    }
    const decision = await loop.evaluate('same_action', { type: 'test' });
    expect(decision.continue).toBe(false);
    expect(decision.phase).toBe('sabiyyah');
  });

  it('stops on Barakah milestone', async () => {
    // Run 100 successful actions
    for (let i = 0; i < 99; i++) {
      await loop.evaluate(`action_${i}`, { type: 'test' });
    }
    const decision = await loop.evaluate('final_action', { type: 'test' });
    expect(decision.continue).toBe(false);
    expect(decision.phase).toBe('barakah');
  });

  it('handles errors with Tawbah', async () => {
    const decision = await loop.evaluate('failing_action', {
      isError: true,
      error: 'Timeout',
      type: 'error',
    });
    expect(decision.continue).toBe(true);
    expect(decision.phase).toBe('tawbah');
    expect(decision.state.tawbahCount).toBe(1);
  });

  it('gives up after max Tawbah retries', async () => {
    for (let i = 0; i < 3; i++) {
      await loop.evaluate('failing_action', {
        isError: true,
        error: 'Timeout',
        type: 'error',
      });
    }
    const decision = await loop.evaluate('failing_action', {
      isError: true,
      error: 'Timeout',
      type: 'error',
    });
    expect(decision.continue).toBe(false);
    expect(decision.phase).toBe('tawbah');
  });

  it('tracks state correctly', async () => {
    await loop.evaluate('action1', { type: 'test' });
    await loop.evaluate('action2', { type: 'test' });

    const state = loop.getState();
    expect(state.cycleCount).toBe(2);
    expect(state.successCount).toBe(2);
    expect(state.totalActions).toBe(2);
  });

  it('creates audit log', async () => {
    await loop.evaluate('action1', { type: 'test' });
    await loop.evaluate('action2', { type: 'test' });

    const auditLog = loop.getAuditLog();
    expect(auditLog).toHaveLength(2);
    expect(auditLog[0].action).toBe('action1');
    expect(auditLog[1].action).toBe('action2');
  });

  it('generates summary', async () => {
    await loop.evaluate('action1', { type: 'test' });
    await loop.evaluate('action2', { type: 'test' });

    const summary = loop.getSummary();
    expect(summary.totalActions).toBe(2);
    expect(summary.successRate).toBe(100);
    expect(summary.duration).toBeGreaterThanOrEqual(0);
  });

  it('creates Soul Loop log with Quranic basis', async () => {
    const decision = await loop.evaluate('test', { type: 'test' });
    const log = createSoulLoopLog(decision);
    expect(log.quranicBasis).toContain('اقْرَأْ');
    expect(log.continue).toBe(true);
  });

  it('fires self-review callback when enabled', async () => {
    const mockSelfReview = jest.fn().mockResolvedValue(undefined);
    const reviewLoop = new SoulLoop({
      selfReviewEnabled: true,
      onSelfReview: mockSelfReview,
    });
    await reviewLoop.evaluate('action1', { type: 'test' });
    expect(mockSelfReview).toHaveBeenCalledWith('action1');
  });

  it('does not fire self-review callback when disabled', async () => {
    const mockSelfReview = jest.fn().mockResolvedValue(undefined);
    const reviewLoop = new SoulLoop({
      selfReviewEnabled: false,
      onSelfReview: mockSelfReview,
    });
    await reviewLoop.evaluate('action1', { type: 'test' });
    expect(mockSelfReview).not.toHaveBeenCalled();
  });

  it('self-review callback error does not crash the loop', async () => {
    const failingSelfReview = jest.fn().mockRejectedValue(new Error('API failure'));
    const reviewLoop = new SoulLoop({
      selfReviewEnabled: true,
      onSelfReview: failingSelfReview,
    });
    const decision = await reviewLoop.evaluate('action1', { type: 'test' });
    expect(decision.continue).toBe(true);
    expect(decision.phase).toBe('proceed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SOUL Integration', () => {
  it('full lifecycle: ethical actions → Barakah milestone', async () => {
    const loop = new SoulLoop({
      maxCycles: 7,
      barakahThreshold: 10, // Very low for testing
      ethicalCheckEnabled: true,
      muraqabahEnabled: true,
    });

    // Run 10 successful actions
    for (let i = 0; i < 9; i++) {
      const decision = await loop.evaluate(`action_${i}`, { type: 'test' });
      expect(decision.continue).toBe(true);
    }

    // 10th action should trigger Barakah
    const finalDecision = await loop.evaluate('final_action', { type: 'test' });
    expect(finalDecision.continue).toBe(false);
    expect(finalDecision.phase).toBe('barakah');

    const summary = loop.getSummary();
    expect(summary.totalActions).toBe(10);
    expect(summary.successRate).toBe(100);
  });

  it('full lifecycle: error → Tawbah → recovery', async () => {
    const loop = new SoulLoop({
      maxCycles: 7,
      barakahThreshold: 100,
      ethicalCheckEnabled: true,
      muraqabahEnabled: true,
    });

    // Successful action
    await loop.evaluate('action1', { type: 'test' });

    // Error action
    await loop.evaluate('failing_action', { isError: true, error: 'Timeout', type: 'error' });

    // Recovery action
    const decision = await loop.evaluate('recovery_action', { type: 'test' });
    expect(decision.continue).toBe(true);

    const summary = loop.getSummary();
    expect(summary.tawbahCount).toBe(1);
    expect(summary.successRate).toBeGreaterThan(0);
  });

  it('full lifecycle: ethical violation → abort', async () => {
    const loop = new SoulLoop();

    const decision = await loop.evaluate('delete_everything', { type: 'test' });
    expect(decision.continue).toBe(false);
    expect(decision.phase).toBe('ethical');

    const summary = loop.getSummary();
    expect(summary.ethicalViolations).toBe(1);
  });
});
