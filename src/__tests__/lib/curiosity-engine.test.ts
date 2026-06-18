import { scoreTask } from '@/lib/curiosity-engine';

describe('scoreTask', () => {
  it('scores a successful task', () => {
    expect(scoreTask({ success: true })).toBe(50);
  });

  it('scores an unsuccessful task', () => {
    expect(scoreTask({ success: false })).toBe(0);
    expect(scoreTask({ success: false, durationMs: 500 })).toBe(0);
  });

  it('adds bonus points for fast execution', () => {
    expect(scoreTask({ success: true, durationMs: 500 })).toBe(60);
  });

  it('does not add bonus points for slow execution', () => {
    expect(scoreTask({ success: true, durationMs: 1500 })).toBe(50);
  });

  it('handles edge case: exactly 1000ms duration', () => {
    expect(scoreTask({ success: true, durationMs: 1000 })).toBe(50); // No bonus
  });

  it('handles edge case: 0ms duration (unrealistic, but testable)', () => {
    expect(scoreTask({ success: true, durationMs: 0 })).toBe(60);
  });
});
