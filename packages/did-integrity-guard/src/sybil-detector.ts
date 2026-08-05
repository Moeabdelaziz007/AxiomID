import { SybilAgentBehavior, SybilDetectionResult } from './types.js';

/**
 * Sybil Attack & Scammer Bot Detection Engine
 */
export class SybilBotDetector {
  /**
   * Evaluates agent request telemetry against Sybil / Scammer bot heuristic vectors
   */
  public evaluateBehavior(telemetry: SybilAgentBehavior): SybilDetectionResult {
    let riskScore = 0;
    const flags: string[] = [];

    // Vector 1: Velocity / Burst Rate (Frequency > 100 req/min is bot indicator)
    if (telemetry.requestFrequencyPerMin > 100) {
      riskScore += 40;
      flags.push(`High Velocity Anomaly (${telemetry.requestFrequencyPerMin} req/min)`);
    }

    // Vector 2: High Fan-Out / Spamming distinct recipients
    if (telemetry.distinctRecipients > 20) {
      riskScore += 30;
      flags.push(`Mass Spam / High Fan-Out Target Count (${telemetry.distinctRecipients} agents)`);
    }

    // Vector 3: Scammer keyword pattern detection in payloads
    if (telemetry.suspiciousKeywordsCount > 0) {
      riskScore += telemetry.suspiciousKeywordsCount * 15;
      flags.push(`Scammer Keywords Detected (${telemetry.suspiciousKeywordsCount} instances)`);
    }

    // Cap risk score to 100 max
    riskScore = Math.min(100, riskScore);

    return {
      isScammerBot: riskScore >= 50,
      riskScore,
      flags,
    };
  }
}
