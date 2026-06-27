/**
 * D1 database helper with typed queries.
 * Wraps Cloudflare's D1Database.
 */

export interface HarvestResult {
  id: string;
  query: string;
  result: string;
  citations: string;
  user_did: string | null;
  created_at: string;
}

export interface AgentPresence {
  agent_id: string;
  status: string;
  last_heartbeat: number;
  metadata: string | null;
}

export class D1Helper {
  private initialized = false;

  constructor(public db: D1Database) {}

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const stmts = [
      'CREATE TABLE IF NOT EXISTS harvest_results (id TEXT PRIMARY KEY, query TEXT NOT NULL, result TEXT NOT NULL, citations TEXT, user_did TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
      'CREATE INDEX IF NOT EXISTS idx_harvest_user ON harvest_results(user_did)',
      'CREATE INDEX IF NOT EXISTS idx_harvest_created ON harvest_results(created_at)',
      'CREATE TABLE IF NOT EXISTS agent_presence (agent_id TEXT PRIMARY KEY, status TEXT DEFAULT \'offline\', last_heartbeat INTEGER, metadata TEXT)',
      'CREATE TABLE IF NOT EXISTS trust_delegations (delegator_did TEXT NOT NULL, delegatee_did TEXT NOT NULL, trust_level REAL DEFAULT 0.5, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME, PRIMARY KEY (delegator_did, delegatee_did))',
      'CREATE INDEX IF NOT EXISTS idx_delegation_delegatee ON trust_delegations(delegatee_did)',
      'CREATE TABLE IF NOT EXISTS skill_installs (id TEXT PRIMARY KEY, skill_slug TEXT NOT NULL, user_did TEXT NOT NULL, version TEXT, installed_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(skill_slug, user_did))',
    ];

    for (const sql of stmts) {
      await this.db.exec(sql);
    }
  }

  async saveHarvestResult(data: {
    id: string;
    query: string;
    result: string;
    citations: string[];
    userDid?: string;
  }): Promise<void> {
    await this.db.prepare(
      "INSERT INTO harvest_results (id, query, result, citations, user_did) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      data.id,
      data.query,
      data.result,
      JSON.stringify(data.citations),
      data.userDid || null
    ).run();
  }

  async getHarvestResult(id: string): Promise<HarvestResult | null> {
    return this.db.prepare(
      "SELECT * FROM harvest_results WHERE id = ?"
    ).bind(id).first<HarvestResult>();
  }

  async getRecentHarvests(userDid: string, limit: number = 10): Promise<HarvestResult[]> {
    const result = await this.db.prepare(
      "SELECT * FROM harvest_results WHERE user_did = ? ORDER BY created_at DESC LIMIT ?"
    ).bind(userDid, limit).all<HarvestResult>();
    return result.results;
  }

  async updatePresence(agentId: string, status: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.db.prepare(
      "INSERT OR REPLACE INTO agent_presence (agent_id, status, last_heartbeat, metadata) VALUES (?, ?, ?, ?)"
    ).bind(
      agentId,
      status,
      Date.now(),
      metadata ? JSON.stringify(metadata) : null
    ).run();
  }

  async getPresence(agentId: string): Promise<AgentPresence | null> {
    return this.db.prepare(
      "SELECT * FROM agent_presence WHERE agent_id = ?"
    ).bind(agentId).first<AgentPresence>();
  }
}
