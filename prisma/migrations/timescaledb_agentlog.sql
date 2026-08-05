-- TimescaleDB activation for AxiomID AgentLog
-- Converts the AgentLog table into a TimescaleDB hypertable for time-series
-- compression and continuous aggregates.
--
-- --- OFFICIAL DOCUMENTATION ---
-- TimescaleDB: https://docs.timescale.com/
-- Ghost.build: https://ghost.build
-- Prisma + PostgreSQL: https://www.prisma.io/docs
-- Full catalog: docs/AGENT_SERVICE_CATALOG.md §9
--
-- --- AGENT QUICK START ---
-- 1. Run: npx prisma db execute --file prisma/migrations/timescaledb_agentlog.sql
-- 2. This creates: hypertable + compression + continuous aggregate + retention
-- 3. Query the aggregate: GET /api/agent-activity?days=7&agentId=xxx
-- 4. Falls back to raw GROUP BY query if TimescaleDB is not available
-- 5. Verification queries are at the bottom of this file
--
-- Prerequisites:
--   - Ghost.build PostgreSQL with TimescaleDB extension enabled
--   - Run: npx prisma db execute --file prisma/migrations/timescaledb_agentlog.sql
--
-- Safety: All statements are idempotent (IF NOT EXISTS / IF EXISTS checks).

-- Step 1: Enable TimescaleDB extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Step 2: Convert AgentLog to hypertable
--         TimescaleDB requires the partitioning column to be NOT NULL
--         and have an index. createdAt is already @default(now()) and indexed.
SELECT create_hypertable(
  '"AgentLog"',
  'createdAt',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE
);

-- Step 3: Add compression policy (compress chunks older than 30 days)
--         This reduces storage by ~90% for old logs while keeping them queryable.
ALTER TABLE "AgentLog" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = '"agentId","level"',
  timescaledb.compress_orderby = '"createdAt" DESC'
);

SELECT add_compression_policy('"AgentLog"', INTERVAL '30 days', if_not_exists => TRUE);

-- Step 4: Create continuous aggregate for daily agent activity stats
--         This pre-computes counts per agent per day, enabling fast dashboard queries
--         without scanning the full hypertable.
CREATE MATERIALIZED VIEW IF NOT EXISTS agent_activity_daily
WITH (timescaledb.continuous) AS
SELECT
  "agentId"        AS agent_id,
  level            AS log_level,
  source           AS log_source,
  date_trunc('day', "createdAt") AS day,
  COUNT(*)         AS entry_count
FROM "AgentLog"
WHERE "agentId" IS NOT NULL
GROUP BY "agentId", level, source, date_trunc('day', "createdAt");

-- Refresh the continuous aggregate every hour (incremental)
SELECT add_continuous_aggregate_policy(
  'agent_activity_daily',
  start_offset => INTERVAL '7 days',
  end_offset   => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- Step 5: Create retention policy (drop raw logs older than 90 days)
--         The continuous aggregate keeps aggregated stats forever;
--         raw log entries older than 90 days are automatically dropped.
SELECT add_retention_policy('"AgentLog"', INTERVAL '90 days', if_not_exists => TRUE);

-- Verification queries (run manually to confirm):
-- SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name = 'AgentLog';
-- SELECT * FROM timescaledb_information.jobs WHERE proc_name IN ('policy_compression','policy_retention','policy_refresh_continuous_aggregate');
-- SELECT * FROM agent_activity_daily ORDER BY day DESC LIMIT 10;
