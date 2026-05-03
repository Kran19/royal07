-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bets_user_timestamp" ON "Bet"("userId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bets_round_status" ON "Bet"("roundId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bets_type_timestamp" ON "Bet"("betType", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bets_status_timestamp" ON "Bet"("status", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_betstats_timestamp" ON "BetStats"("timestamp" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_gameround_status" ON "GameRound"("status", "startedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_user" ON "Transaction"("userId", "createdAt" DESC);

-- Enable TimescaleDB for time-series data
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert bets to hypertable for better time-series performance
SELECT create_hypertable('"Bet"', 'createdAt', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create continuous aggregate for real-time stats
CREATE MATERIALIZED VIEW bet_stats_5sec
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 seconds', "createdAt") AS bucket,
  "betType",
  SUM(amount) as total_amount,
  COUNT(*) as bet_count,
  COUNT(DISTINCT "userId") as unique_users
FROM "Bet"
WHERE "status" = 'ACTIVE'
GROUP BY bucket, "betType"
WITH NO DATA;

-- Add refresh policy
SELECT add_continuous_aggregate_policy('bet_stats_5sec',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '5 seconds',
  schedule_interval => INTERVAL '5 seconds');
