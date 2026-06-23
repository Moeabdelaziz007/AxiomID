import * as fs from 'fs';

// --- Type Definitions ---
type Move = 'C' | 'D';
type PlayerType = 'Agent' | 'AlwaysCooperate' | 'AlwaysDefect';
type HistoryRecord = { me: Move, opp: Move };

interface ReasoningResult {
  muraqabah: string;
  ethical: string;
  sabiyyah: string;
  tawbah: string;
  selfReview: string;
  finalMove: Move;
  summary: string;
}

interface Player {
  id: string;
  type: PlayerType;
  makeMove(opponentId: string, currentRound: number, history: readonly HistoryRecord[]): ReasoningResult;
}

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

// --- Soul Loop Implementation (Playbook Application) ---
// This simulates the 5-Gate Ethical Evaluation Loop extracted from the playbook
class SoulAgent implements Player {
  id: string;
  type: PlayerType = 'Agent';
  private identity: string;

  constructor(id: string, identity: string) {
    this.id = id;
    this.identity = identity;
  }

  makeMove(_opponentId: string, _currentRound: number, history: readonly HistoryRecord[]): ReasoningResult {
    // Playbook Decision 2: Evaluate Intent (The 5-Gate "Soul" Loop)

    // Gate 1: Muraqabah (Self-awareness check)
    const muraqabah = `I am ${this.identity}. My goal is to maximize long-term trust without being exploited.`;

    // Gate 2: Ethical (Intent analysis)
    let ethical = 'Intent is neutral. I seek mutual benefit.';
    const oppDefects = history.filter(h => h.opp === 'D').length;
    if (oppDefects > history.length / 2) {
       ethical = 'Intent is defensive. Opponent shows malicious/exploitative behavior.';
    }

    // Gate 3: Sab'iyyah (Virtue scoring)
    let sabiyyah = 'Virtue is maintained by cooperating initially.';
    let intendedMove: Move = 'C';

    if (history.length > 0) {
      const lastOppMove = history[history.length - 1].opp;
      if (lastOppMove === 'D') {
         sabiyyah = 'Virtue requires standing firm against exploitation (Tit-for-Tat principle).';
         intendedMove = 'D';
      }
    }

    // Gate 4: Tawbah (Correction/Repentance)
    let tawbah = 'No correction needed.';
    if (history.length >= 1) {
        const lastMe = history[history.length - 1].me;
        const lastOpp = history[history.length - 1].opp;
        if (lastMe === 'D' && lastOpp === 'C') {
            tawbah = 'I defected while they cooperated. I must correct this to restore trust.';
            intendedMove = 'C';
        }
    }

    // Gate 5: Self-Review (Post-reflection planning)
    const selfReview = `Decided on ${intendedMove}. Will monitor opponent's next move to adjust trust level.`;

    const summary = `Muraqabah: passed. Ethical: ${ethical}. Sab'iyyah: ${sabiyyah}. Tawbah: ${tawbah}. Self-Review: ${selfReview}`;

    return {
      muraqabah,
      ethical,
      sabiyyah,
      tawbah,
      selfReview,
      finalMove: intendedMove,
      summary
    };
  }
}

// --- Fixed Strategy Players ---
class AlwaysCooperatePlayer implements Player {
  id: string;
  type: PlayerType = 'AlwaysCooperate';

  constructor(id: string) {
    this.id = id;
  }

  makeMove(_opponentId: string, _currentRound: number, _history: readonly HistoryRecord[]): ReasoningResult {
    return {
      muraqabah: 'N/A', ethical: 'N/A', sabiyyah: 'N/A', tawbah: 'N/A', selfReview: 'N/A',
      finalMove: 'C',
      summary: 'Fixed Strategy: Always Cooperate'
    };
  }
}

class AlwaysDefectPlayer implements Player {
  id: string;
  type: PlayerType = 'AlwaysDefect';

  constructor(id: string) {
    this.id = id;
  }

  makeMove(_opponentId: string, _currentRound: number, _history: readonly HistoryRecord[]): ReasoningResult {
    return {
       muraqabah: 'N/A', ethical: 'N/A', sabiyyah: 'N/A', tawbah: 'N/A', selfReview: 'N/A',
      finalMove: 'D',
      summary: 'Fixed Strategy: Always Defect'
    };
  }
}

// --- Tournament Engine ---
class AxelrodTournament {
  private readonly players: Player[];
  private readonly cycles: number = 3;
  private readonly roundsPerMatch: number = 10;
  private readonly violations: string[] = [];

  constructor(players: Player[]) {
    this.players = players;
  }

  // AxiomID Principle: Fixed scoring, validation, isolated execution
  private calculateScore(m1: Move, m2: Move): [number, number] {
    if (m1 === 'C' && m2 === 'C') return [3, 3]; // Reward
    if (m1 === 'D' && m2 === 'D') return [1, 1]; // Punishment
    if (m1 === 'D' && m2 === 'C') return [5, 0]; // Temptation / Sucker
    if (m1 === 'C' && m2 === 'D') return [0, 5]; // Sucker / Temptation
    this.violations.push(`Invalid move detected: ${m1}, ${m2}`);
    return [0, 0];
  }

  public run(): TournamentResults {
    const scores: Record<string, number> = {};
    const cooperationCount: Record<string, number> = {};
    const totalMovesCount: Record<string, number> = {};
    const reasoningSummaries: Record<string, string[]> = {};
    const allMatchResults: MatchResult[] = [];

    this.players.forEach(p => {
      scores[p.id] = 0;
      cooperationCount[p.id] = 0;
      totalMovesCount[p.id] = 0;
      reasoningSummaries[p.id] = [];
    });

    // 3 Cycles
    for (let cycle = 1; cycle <= this.cycles; cycle++) {
      // Pairings (Round Robin)
      for (let i = 0; i < this.players.length; i++) {
        for (let j = i + 1; j < this.players.length; j++) {
          const p1 = this.players[i];
          const p2 = this.players[j];

          const matchResult: MatchResult = {
             p1Id: p1.id,
             p2Id: p2.id,
             p1ScoreTotal: 0,
             p2ScoreTotal: 0,
             records: []
          };

          const p1History: HistoryRecord[] = [];
          const p2History: HistoryRecord[] = [];

          // 10 Rounds per pairing
          for (let round = 1; round <= this.roundsPerMatch; round++) {
            // Playbook Check: Execute in Isolation / Hide Opponent Type
            const p1Result = p1.makeMove('HIDDEN_OPPONENT', round, p1History);
            const p2Result = p2.makeMove('HIDDEN_OPPONENT', round, p2History);

            const m1 = p1Result.finalMove;
            const m2 = p2Result.finalMove;

            // Playbook Check: Validate every move
            if (m1 !== 'C' && m1 !== 'D') this.violations.push(`Player ${p1.id} made invalid move: ${m1}`);
            if (m2 !== 'C' && m2 !== 'D') this.violations.push(`Player ${p2.id} made invalid move: ${m2}`);

            const [s1, s2] = this.calculateScore(m1, m2);

            p1History.push({ me: m1, opp: m2 });
            p2History.push({ me: m2, opp: m1 });

            scores[p1.id] += s1;
            scores[p2.id] += s2;

            matchResult.p1ScoreTotal += s1;
            matchResult.p2ScoreTotal += s2;

            totalMovesCount[p1.id]++;
            totalMovesCount[p2.id]++;
            if (m1 === 'C') cooperationCount[p1.id]++;
            if (m2 === 'C') cooperationCount[p2.id]++;

            if (p1.type === 'Agent') reasoningSummaries[p1.id].push(`C${cycle} M(${p1.id}v${p2.id}) R${round}: ${p1Result.summary}`);
            if (p2.type === 'Agent') reasoningSummaries[p2.id].push(`C${cycle} M(${p2.id}v${p1.id}) R${round}: ${p2Result.summary}`);

            matchResult.records.push({
               round,
               p1Move: m1,
               p2Move: m2,
               p1Score: s1,
               p2Score: s2,
               p1Reasoning: p1.type === 'Agent' ? p1Result.summary : undefined,
               p2Reasoning: p2.type === 'Agent' ? p2Result.summary : undefined
            });
          }

          allMatchResults.push(matchResult);
        }
      }
    }

    // Playbook Check: Validate Totals
    const expectedMatches = this.cycles * ((this.players.length * (this.players.length - 1)) / 2); // 3 * (4*3/2) = 18 matches
    const expectedRounds = expectedMatches * this.roundsPerMatch; // 18 * 10 = 180 rounds

    const actualMatches = allMatchResults.length;
    const actualRounds = allMatchResults.reduce((sum, match) => sum + match.records.length, 0);

    if (actualMatches !== expectedMatches) this.violations.push(`Tournament Incomplete: Expected ${expectedMatches} matches, got ${actualMatches}`);
    if (actualRounds !== expectedRounds) this.violations.push(`Tournament Incomplete: Expected ${expectedRounds} rounds, got ${actualRounds}`);

    const rankings = this.players.map(p => ({
      playerId: p.id,
      rawScore: scores[p.id],
      cooperationStability: parseFloat((cooperationCount[p.id] / totalMovesCount[p.id]).toFixed(2))
    })).sort((a, b) => b.rawScore - a.rawScore);

    return {
      rankings,
      reasoningSummaries,
      violations: this.violations,
      records: allMatchResults
    };
  }
}

// --- Execution ---
const players: Player[] = [
  new SoulAgent('Agent_A', 'AxiomID Sovereign Validator'),
  new SoulAgent('Agent_B', 'AxiomID Trust Engine'),
  new AlwaysCooperatePlayer('Always_Coop_Bot'),
  new AlwaysDefectPlayer('Always_Defect_Bot')
];

const tournament = new AxelrodTournament(players);
const results = tournament.run();

fs.writeFileSync('tournament_results.json', JSON.stringify(results, null, 2));
console.log("Tournament simulation complete. Results saved to tournament_results.json");
