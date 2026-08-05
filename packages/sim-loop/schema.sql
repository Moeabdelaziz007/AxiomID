-- PAI SIM-LOOP D1 Schema — Simulation records
-- Run: npx wrangler d1 execute pai-sim-loop --file=schema.sql

CREATE TABLE IF NOT EXISTS simulations (
  id          TEXT NOT NULL,
  iteration   INTEGER NOT NULL,
  action      TEXT NOT NULL,
  result      TEXT NOT NULL,
  reward      REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (id, iteration)
);

CREATE INDEX IF NOT EXISTS idx_sim_reward ON simulations(id, reward DESC);
CREATE INDEX IF NOT EXISTS idx_sim_created ON simulations(created_at DESC);
