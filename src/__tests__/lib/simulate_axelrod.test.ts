/**
 * simulate_axelrod.test.ts — Tests for the Axelrod Tournament simulation script.
 *
 * The script exports no symbols; it executes at import time and writes results
 * to a JSON file via fs.writeFileSync. Tests mock fs to capture that output
 * and verify correctness of the tournament engine, player strategies, and
 * scoring logic.
 */

import * as fs from 'fs';

jest.mock('fs');

// Types mirrored from the script for assertion helpers (not production re-use).
type Move = 'C' | 'D';

interface MatchRecord {
  round: number;
  p1Move: Move;
  p2Move: Move;
  p1Score: number;
  p2Score: number;
  p1Reasoning?: string;
  p2Reasoning?: string;
}

interface MatchResult {
  p1Id: string;
  p2Id: string;
  p1ScoreTotal: number;
  p2ScoreTotal: number;
  records: MatchRecord[];
}

interface TournamentResults {
  rankings: { playerId: string; rawScore: number; cooperationStability: number }[];
  reasoningSummaries: Record<string, string[]>;
  violations: string[];
  records: MatchResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load tournament results by requiring the script (isolated) and parsing what
 *  was written to tournament_results.json via the mocked fs.writeFileSync. */
function loadResults(): TournamentResults {
  const mockedWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;
  mockedWriteFileSync.mockClear();

  jest.isolateModules(() => {
    require('../../../scripts/simulate_axelrod');
  });

  expect(mockedWriteFileSync).toHaveBeenCalled();
  const [, jsonContent] = mockedWriteFileSync.mock.calls[0] as [string, string];
  return JSON.parse(jsonContent) as TournamentResults;
}

// ---------------------------------------------------------------------------
// Tournament Structure
// ---------------------------------------------------------------------------

describe('AxelrodTournament — structure', () => {
  let results: TournamentResults;

  beforeAll(() => {
    results = loadResults();
  });

  it('produces exactly 18 matches (3 cycles × 6 pairings)', () => {
    expect(results.records).toHaveLength(18);
  });

  it('produces exactly 180 rounds (18 matches × 10 rounds)', () => {
    const totalRounds = results.records.reduce((sum, m) => sum + m.records.length, 0);
    expect(totalRounds).toBe(180);
  });

  it('records zero violations for valid players', () => {
    expect(results.violations).toHaveLength(0);
  });

  it('each match contains exactly 10 rounds', () => {
    results.records.forEach(match => {
      expect(match.records).toHaveLength(10);
    });
  });

  it('every round has a valid p1Move and p2Move (C or D)', () => {
    results.records.forEach(match => {
      match.records.forEach(record => {
        expect(['C', 'D']).toContain(record.p1Move);
        expect(['C', 'D']).toContain(record.p2Move);
      });
    });
  });

  it('includes all four players in rankings', () => {
    const ids = results.rankings.map(r => r.playerId);
    expect(ids).toContain('Agent_A');
    expect(ids).toContain('Agent_B');
    expect(ids).toContain('Always_Coop_Bot');
    expect(ids).toContain('Always_Defect_Bot');
    expect(ids).toHaveLength(4);
  });

  it('rankings are sorted in descending order by rawScore', () => {
    const scores = results.rankings.map(r => r.rawScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('writes results to "tournament_results.json"', () => {
    const mockedWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;
    expect(mockedWriteFileSync.mock.calls[0][0]).toBe('tournament_results.json');
  });
});

// ---------------------------------------------------------------------------
// Score Calculation (Prisoner's Dilemma payoff matrix)
// ---------------------------------------------------------------------------

describe('AxelrodTournament — score calculation', () => {
  let results: TournamentResults;

  beforeAll(() => {
    results = loadResults();
  });

  it('CC produces [3, 3] (mutual cooperation reward)', () => {
    // SoulAgent vs SoulAgent always cooperate from round 1 onward.
    const agentMatch = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Agent_B'
    );
    expect(agentMatch).toBeDefined();
    const round1 = agentMatch!.records[0];
    expect(round1.p1Move).toBe('C');
    expect(round1.p2Move).toBe('C');
    expect(round1.p1Score).toBe(3);
    expect(round1.p2Score).toBe(3);
  });

  it('DD produces [1, 1] (mutual defection punishment)', () => {
    // After round 1 of Agent vs AlwaysDefect, both defect for the rest.
    const defectMatch = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Always_Defect_Bot'
    );
    expect(defectMatch).toBeDefined();
    const round2 = defectMatch!.records[1];
    expect(round2.p1Move).toBe('D');
    expect(round2.p2Move).toBe('D');
    expect(round2.p1Score).toBe(1);
    expect(round2.p2Score).toBe(1);
  });

  it('CD produces [0, 5] (sucker/temptation)', () => {
    // Round 1 of Agent vs AlwaysDefect: Agent C, Defect D.
    const defectMatch = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Always_Defect_Bot'
    );
    expect(defectMatch).toBeDefined();
    const round1 = defectMatch!.records[0];
    expect(round1.p1Move).toBe('C');
    expect(round1.p2Move).toBe('D');
    expect(round1.p1Score).toBe(0);
    expect(round1.p2Score).toBe(5);
  });

  it('defector (p2) earns 5 (temptation payoff) when cooperator (p1) plays C', () => {
    // In round-robin order, AlwaysCoop is p1 and AlwaysDefect is p2.
    // Every round: p1=C, p2=D → p1Score=0, p2Score=5 (the temptation/sucker asymmetry).
    const match = results.records.find(
      m => m.p1Id === 'Always_Coop_Bot' && m.p2Id === 'Always_Defect_Bot'
    );
    expect(match).toBeDefined();
    const round1 = match!.records[0];
    expect(round1.p1Move).toBe('C');
    expect(round1.p2Move).toBe('D');
    expect(round1.p1Score).toBe(0);
    expect(round1.p2Score).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Expected Total Scores
// ---------------------------------------------------------------------------

describe('AxelrodTournament — expected raw scores', () => {
  let results: TournamentResults;

  beforeAll(() => {
    results = loadResults();
  });

  // Pre-computed scores based on strategy interactions:
  //   Agent vs Agent:         3×10×3 = 90 pts each
  //   Agent vs AlwaysCoop:    3×10×3 = 90 pts each
  //   Agent vs AlwaysDefect:  3×(0+9×1) = 27 pts (Agent), 3×(5+9×1) = 42 pts (Defect)
  //   AlwaysCoop vs AlwaysDefect: 3×10×0 = 0 pts (Coop), 3×10×5 = 150 pts (Defect)

  function rankFor(id: string) {
    return results.rankings.find(r => r.playerId === id)!;
  }

  it('Agent_A total score is 207', () => {
    // 90 (vs Agent_B) + 90 (vs AlwaysCoop) + 27 (vs AlwaysDefect) = 207
    expect(rankFor('Agent_A').rawScore).toBe(207);
  });

  it('Agent_B total score is 207', () => {
    expect(rankFor('Agent_B').rawScore).toBe(207);
  });

  it('Always_Coop_Bot total score is 180', () => {
    // 90 (vs Agent_A) + 90 (vs Agent_B) + 0 (vs AlwaysDefect) = 180
    expect(rankFor('Always_Coop_Bot').rawScore).toBe(180);
  });

  it('Always_Defect_Bot total score is 234', () => {
    // 42 (vs Agent_A) + 42 (vs Agent_B) + 150 (vs AlwaysCoop) = 234
    expect(rankFor('Always_Defect_Bot').rawScore).toBe(234);
  });

  it('AlwaysDefect ranks first', () => {
    expect(results.rankings[0].playerId).toBe('Always_Defect_Bot');
  });

  it('AlwaysCooperate ranks last', () => {
    expect(results.rankings[results.rankings.length - 1].playerId).toBe('Always_Coop_Bot');
  });
});

// ---------------------------------------------------------------------------
// Cooperation Stability
// ---------------------------------------------------------------------------

describe('AxelrodTournament — cooperation stability', () => {
  let results: TournamentResults;

  beforeAll(() => {
    results = loadResults();
  });

  function rankFor(id: string) {
    return results.rankings.find(r => r.playerId === id)!;
  }

  it('AlwaysCooperate has cooperation stability of 1.0', () => {
    expect(rankFor('Always_Coop_Bot').cooperationStability).toBe(1);
  });

  it('AlwaysDefect has cooperation stability of 0.0', () => {
    expect(rankFor('Always_Defect_Bot').cooperationStability).toBe(0);
  });

  it('Soul Agents have cooperation stability of 0.70', () => {
    // 63 C moves out of 90 total = 0.70
    expect(rankFor('Agent_A').cooperationStability).toBe(0.7);
    expect(rankFor('Agent_B').cooperationStability).toBe(0.7);
  });

  it('cooperation stability is within [0, 1] for all players', () => {
    results.rankings.forEach(r => {
      expect(r.cooperationStability).toBeGreaterThanOrEqual(0);
      expect(r.cooperationStability).toBeLessThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// SoulAgent — Gate Behavior (verified via match records)
// ---------------------------------------------------------------------------

describe('SoulAgent — Gate 3: Sab\'iyyah (Tit-for-Tat)', () => {
  let results: TournamentResults;

  beforeAll(() => {
    results = loadResults();
  });

  it('cooperates on round 1 (empty history — trusting start)', () => {
    const match = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Always_Defect_Bot'
    );
    expect(match!.records[0].p1Move).toBe('C');
  });

  it('defects on round 2 after opponent defected in round 1 (Tit-for-Tat)', () => {
    const match = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Always_Defect_Bot'
    );
    expect(match!.records[1].p1Move).toBe('D');
  });

  it('keeps defecting when opponent keeps defecting', () => {
    const match = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Always_Defect_Bot'
    );
    // Rounds 2-10 should all be D for Agent_A
    match!.records.slice(1).forEach(record => {
      expect(record.p1Move).toBe('D');
    });
  });

  it('cooperates every round when opponent always cooperates', () => {
    const match = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Always_Coop_Bot'
    );
    match!.records.forEach(record => {
      expect(record.p1Move).toBe('C');
    });
  });

  it('two Soul Agents cooperate every round with each other', () => {
    const match = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Agent_B'
    );
    match!.records.forEach(record => {
      expect(record.p1Move).toBe('C');
      expect(record.p2Move).toBe('C');
    });
  });
});

describe('SoulAgent — reasoning summaries', () => {
  let results: TournamentResults;

  beforeAll(() => {
    results = loadResults();
  });

  it('reasoning summaries are only recorded for Agent-type players', () => {
    expect(results.reasoningSummaries['Agent_A']).toBeDefined();
    expect(results.reasoningSummaries['Agent_B']).toBeDefined();
    // Fixed-strategy players should have empty arrays (no reasoning stored)
    expect(results.reasoningSummaries['Always_Coop_Bot']).toEqual([]);
    expect(results.reasoningSummaries['Always_Defect_Bot']).toEqual([]);
  });

  it('Soul Agent reasoning includes all five gate labels', () => {
    const firstEntry = results.reasoningSummaries['Agent_A'][0];
    expect(firstEntry).toContain("Muraqabah:");
    expect(firstEntry).toContain("Ethical:");
    expect(firstEntry).toContain("Sab'iyyah:");
    expect(firstEntry).toContain("Tawbah:");
    expect(firstEntry).toContain("Self-Review:");
  });

  it('Agent_A has exactly 90 reasoning entries (3 opponents × 3 cycles × 10 rounds)', () => {
    expect(results.reasoningSummaries['Agent_A']).toHaveLength(90);
  });

  it('Agent_B has exactly 90 reasoning entries', () => {
    expect(results.reasoningSummaries['Agent_B']).toHaveLength(90);
  });

  it('reasoning entries include cycle and round labels', () => {
    const entries = results.reasoningSummaries['Agent_A'];
    // Check cycle 1 round 1 format: "C1 M(...) R1:"
    const c1r1 = entries.find(e => e.startsWith('C1 ') && e.includes(' R1:'));
    expect(c1r1).toBeDefined();
    // Check cycle 3 appears
    const c3 = entries.find(e => e.startsWith('C3 '));
    expect(c3).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AlwaysCooperatePlayer
// ---------------------------------------------------------------------------

describe('AlwaysCooperatePlayer', () => {
  let results: TournamentResults;

  beforeAll(() => {
    results = loadResults();
  });

  it('always plays C regardless of opponent', () => {
    const coopMatches = results.records.filter(
      m => m.p1Id === 'Always_Coop_Bot' || m.p2Id === 'Always_Coop_Bot'
    );
    coopMatches.forEach(match => {
      match.records.forEach(record => {
        if (match.p1Id === 'Always_Coop_Bot') expect(record.p1Move).toBe('C');
        if (match.p2Id === 'Always_Coop_Bot') expect(record.p2Move).toBe('C');
      });
    });
  });

  it('no reasoning summary is stored for AlwaysCoop player', () => {
    const coopMatches = results.records.filter(
      m => m.p1Id === 'Always_Coop_Bot' || m.p2Id === 'Always_Coop_Bot'
    );
    coopMatches.forEach(match => {
      match.records.forEach(record => {
        if (match.p1Id === 'Always_Coop_Bot') expect(record.p1Reasoning).toBeUndefined();
        if (match.p2Id === 'Always_Coop_Bot') expect(record.p2Reasoning).toBeUndefined();
      });
    });
  });
});

// ---------------------------------------------------------------------------
// AlwaysDefectPlayer
// ---------------------------------------------------------------------------

describe('AlwaysDefectPlayer', () => {
  let results: TournamentResults;

  beforeAll(() => {
    results = loadResults();
  });

  it('always plays D regardless of opponent', () => {
    const defectMatches = results.records.filter(
      m => m.p1Id === 'Always_Defect_Bot' || m.p2Id === 'Always_Defect_Bot'
    );
    defectMatches.forEach(match => {
      match.records.forEach(record => {
        if (match.p1Id === 'Always_Defect_Bot') expect(record.p1Move).toBe('D');
        if (match.p2Id === 'Always_Defect_Bot') expect(record.p2Move).toBe('D');
      });
    });
  });

  it('no reasoning summary is stored for AlwaysDefect player', () => {
    const defectMatches = results.records.filter(
      m => m.p1Id === 'Always_Defect_Bot' || m.p2Id === 'Always_Defect_Bot'
    );
    defectMatches.forEach(match => {
      match.records.forEach(record => {
        if (match.p1Id === 'Always_Defect_Bot') expect(record.p1Reasoning).toBeUndefined();
        if (match.p2Id === 'Always_Defect_Bot') expect(record.p2Reasoning).toBeUndefined();
      });
    });
  });

  it('earns maximum score (234) by exploiting cooperative players', () => {
    const rank = results.rankings.find(r => r.playerId === 'Always_Defect_Bot')!;
    expect(rank.rawScore).toBe(234);
  });
});

// ---------------------------------------------------------------------------
// Match records — per-match score totals
// ---------------------------------------------------------------------------

describe('AxelrodTournament — per-match score totals', () => {
  let results: TournamentResults;

  beforeAll(() => {
    results = loadResults();
  });

  it('Agent vs Agent single-match score total is 30 each', () => {
    const match = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Agent_B'
    );
    expect(match!.p1ScoreTotal).toBe(30);
    expect(match!.p2ScoreTotal).toBe(30);
  });

  it('Agent vs AlwaysCoop single-match score total is 30 each', () => {
    const match = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Always_Coop_Bot'
    );
    expect(match!.p1ScoreTotal).toBe(30);
    expect(match!.p2ScoreTotal).toBe(30);
  });

  it('Agent vs AlwaysDefect single-match score total: Agent=9, Defect=14', () => {
    // Round 1: C vs D → 0, 5; Rounds 2-10: D vs D → 1, 1 each
    const match = results.records.find(
      m => m.p1Id === 'Agent_A' && m.p2Id === 'Always_Defect_Bot'
    );
    expect(match!.p1ScoreTotal).toBe(9);
    expect(match!.p2ScoreTotal).toBe(14);
  });

  it('AlwaysCoop vs AlwaysDefect single-match score total: Coop=0, Defect=50', () => {
    // All 10 rounds: C vs D → 0, 5 each round
    const match = results.records.find(
      m => m.p1Id === 'Always_Coop_Bot' && m.p2Id === 'Always_Defect_Bot'
    );
    expect(match!.p1ScoreTotal).toBe(0);
    expect(match!.p2ScoreTotal).toBe(50);
  });

  it('round scores sum to match score totals', () => {
    results.records.forEach(match => {
      const sumP1 = match.records.reduce((s, r) => s + r.p1Score, 0);
      const sumP2 = match.records.reduce((s, r) => s + r.p2Score, 0);
      expect(sumP1).toBe(match.p1ScoreTotal);
      expect(sumP2).toBe(match.p2ScoreTotal);
    });
  });
});

// ---------------------------------------------------------------------------
// Boundary and regression tests
// ---------------------------------------------------------------------------

describe('AxelrodTournament — boundary and regression', () => {
  let results: TournamentResults;

  beforeAll(() => {
    results = loadResults();
  });

  it('round numbers are sequential from 1 to 10 within each match', () => {
    results.records.forEach(match => {
      match.records.forEach((record, idx) => {
        expect(record.round).toBe(idx + 1);
      });
    });
  });

  it('cooperationStability is a number with at most 2 decimal places', () => {
    results.rankings.forEach(r => {
      const str = r.cooperationStability.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  it('match p1Id and p2Id are never the same player', () => {
    results.records.forEach(match => {
      expect(match.p1Id).not.toBe(match.p2Id);
    });
  });

  it('AlwaysCoop earns the "sucker payoff" (0) in every round against AlwaysDefect', () => {
    const match = results.records.find(
      m => m.p1Id === 'Always_Coop_Bot' && m.p2Id === 'Always_Defect_Bot'
    );
    expect(match).toBeDefined();
    match!.records.forEach(record => {
      expect(record.p1Score).toBe(0);
    });
  });

  it('total score across all players equals total points distributed in tournament', () => {
    const totalScore = results.rankings.reduce((sum, r) => sum + r.rawScore, 0);
    // Total points distributed: each round distributes scores based on payoff matrix.
    // Pre-calculated: 207 + 207 + 180 + 234 = 828
    expect(totalScore).toBe(828);
  });

  it('result JSON contains all required top-level keys', () => {
    expect(results).toHaveProperty('rankings');
    expect(results).toHaveProperty('reasoningSummaries');
    expect(results).toHaveProperty('violations');
    expect(results).toHaveProperty('records');
  });
});