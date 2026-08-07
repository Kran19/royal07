--[[
  place-bet.lua
  =============
  Atomic bet placement script for RoyalBet.

  This Lua script runs inside Redis as a single atomic unit.
  No other Redis operation can interleave between any of these steps.
  This guarantees:
    1. No double-spend (balance check + deduct are inseparable)
    2. No duplicate bets (idempotency key is checked before anything else)
    3. No race condition between concurrent bets from the same user

  KEYS:
    KEYS[1]  = user:balance:{userId}         (balance string e.g. "5000.00")
    KEYS[2]  = event:seen:{eventId}          (idempotency guard)
    KEYS[3]  = round:{roundId}:exposure      (hash: floor -> total staked)

  ARGV:
    ARGV[1]  = totalDeducted                 (Decimal string, e.g. "1500.00")
    ARGV[2]  = eventPayloadJSON              (full BetPlacedEvent as JSON string)
    ARGV[3]  = roundId                       (for stream key construction)
    ARGV[4]  = exposureFieldsJSON            (JSON array of {field, increment} pairs)
               e.g. [{"field":"3","inc":"500.00"},{"field":"7","inc":"500.00"},{"field":"total","inc":"1000.00"}]

  Return values (array):
    [1]  = status code:
             1   = SUCCESS
            -1   = INSUFFICIENT_BALANCE
            -2   = DUPLICATE_EVENT (already processed)
            -3   = ROUND_NOT_ACTIVE (balance key doesn't exist in Redis yet,
                   meaning round wasn't seeded — rare cold-start edge case)
    [2]  = new balance string (on SUCCESS) or current balance (on failure)
]]--

-- ── 1. Idempotency Check ─────────────────────────────────────────
-- If this eventId was already processed (e.g. client retried), silently reject.
if redis.call('EXISTS', KEYS[2]) == 1 then
  local currentBalance = redis.call('GET', KEYS[1]) or '0'
  return {-2, currentBalance}
end

-- ── 2. Balance Read ──────────────────────────────────────────────
local rawBalance = redis.call('GET', KEYS[1])
if not rawBalance then
  -- Balance key doesn't exist in Redis — user hasn't been seeded yet.
  -- This is a cold-start case. The API layer should load from Postgres first.
  return {-3, '0'}
end

-- ── 3. Decimal Comparison ────────────────────────────────────────
-- Redis stores balances as strings (e.g. "5000.00").
-- tonumber() works for decimal strings in Lua.
local balance      = tonumber(rawBalance)
local totalDeducted = tonumber(ARGV[1])

if balance < totalDeducted then
  return {-1, rawBalance}
end

-- ── 4. Atomic Deduct Balance ─────────────────────────────────────
local newBalanceNum = balance - totalDeducted
-- Format to 2 decimal places for consistency
local newBalance = string.format('%.2f', newBalanceNum)
redis.call('SET', KEYS[1], newBalance)

-- Update balance version timestamp (used by sync worker for conditional writes)
redis.call('SET', KEYS[1] .. ':version', tostring(redis.call('TIME')[1] * 1000))

-- ── 5. Mark Event as Seen (idempotency TTL = 5 minutes) ──────────
redis.call('SET', KEYS[2], '1', 'EX', 300)

-- ── 6. Update Exposure Hash ──────────────────────────────────────
-- ARGV[4] contains JSON like: [{"field":"3","inc":"500.00"},{"field":"total","inc":"1000.00"}]
-- We parse it manually since Lua has no JSON library by default in Redis.
-- Format is designed to be simple enough for a Lua pattern match.
local exposureJson = ARGV[4]
-- Strip outer brackets
exposureJson = string.sub(exposureJson, 2, -2)
-- Each entry is {"field":"X","inc":"Y.YY"}
for field, inc in string.gmatch(exposureJson, '"field":"([^"]+)","inc":"([^"]+)"') do
  redis.call('HINCRBYFLOAT', KEYS[3], field, inc)
end

-- ── 7. Append Event to Round Bets Stream ─────────────────────────
local streamKey = 'round:' .. ARGV[3] .. ':bets'
-- XADD with auto-generated ID ('*'), storing event as a single 'data' field
redis.call('XADD', streamKey, '*', 'data', ARGV[2])

-- ── 8. Return Success ────────────────────────────────────────────
return {1, newBalance}
