import { AgentAppManifest, AgentAppValidationResult } from './types.js';

/**
 * Agent App Manifest Validator & Risk Engine
 */
export class AgentAppValidator {
  /**
   * Validates an Agent App Manifest against specification and security constraints
   */
  public validateAppManifest(manifest: AgentAppManifest): AgentAppValidationResult {
    const errors: string[] = [];
    let riskScore = 0;

    // 1. App ID Format Check
    if (!manifest.app || !manifest.app.appId || !/^app_[a-z0-9_]+$/.test(manifest.app.appId)) {
      errors.push("Invalid appId format. Must match pattern '^app_[a-z0-9_]+$'.");
      riskScore += 30;
    }

    // 2. Developer DID Check
    if (!manifest.app || !manifest.app.developerDid || !manifest.app.developerDid.startsWith('did:axiom:')) {
      errors.push("Invalid developerDid. Must start with 'did:axiom:'.");
      riskScore += 25;
    }

    // 3. Permissions Check
    if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
      errors.push("Missing required permissions array.");
      riskScore += 20;
    } else {
      for (const p of manifest.permissions) {
        if (p.scope === 'execute:command') {
          riskScore += 25; // Elevated risk for shell command execution
        }
        if (p.scope === 'write:filesystem' && (!p.reason || p.reason.length < 10)) {
          errors.push(`Permission scope '${p.scope}' requires detailed reason (at least 10 chars).`);
          riskScore += 15;
        }
        if (p.scope === 'network:egress' && (!p.allowedDomains || p.allowedDomains.length === 0)) {
          errors.push("Network egress permission requires explicit allowedDomains list.");
          riskScore += 30;
        }
      }
    }

    // 4. Sandboxing Enforcement
    if (manifest.sandboxed === false) {
      riskScore += 40;
      if (manifest.permissions.some(p => p.scope === 'execute:command')) {
        errors.push("Unsandboxed Agent App requesting execute:command is strictly forbidden under IQRA policy.");
        riskScore = 100;
      }
    }

    const valid = errors.length === 0 && riskScore < 80;

    return {
      valid,
      appId: manifest.app ? manifest.app.appId : 'unknown',
      errors,
      securityRiskScore: Math.min(100, riskScore),
    };
  }
}
