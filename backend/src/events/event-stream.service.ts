import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RedisService } from '../modules/redis/redis.service';
import { AnyGameEvent, RedisKeys } from './event.types';

/**
 * EventStreamService
 * ==================
 * Wraps all Redis Stream operations for the Event Sourcing architecture.
 *
 * Responsibilities:
 *  - Load and cache the place-bet Lua script (SCRIPT LOAD → EVALSHA)
 *  - Append events to Redis Streams (XADD)
 *  - Read event batches from Redis Streams (XREAD / XREADGROUP)
 *  - Acknowledge processed events (XACK)
 *  - Manage consumer groups (XGROUP CREATE)
 *  - Read exposure hash data (HGETALL)
 *  - Seed user balances into Redis on first login (SET)
 */
@Injectable()
export class EventStreamService implements OnModuleInit {
  private readonly logger = new Logger(EventStreamService.name);

  /** SHA1 of the loaded Lua script — used for EVALSHA (faster than EVAL) */
  private placeBetScriptSha: string | null = null;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    await this.loadPlaceBetScript();
  }

  // ─────────────────────────────────────────────────────────────
  // Lua Script Management
  // ─────────────────────────────────────────────────────────────

  private async loadPlaceBetScript(): Promise<void> {
    try {
      let luaPath = path.join(__dirname, 'lua', 'place-bet.lua');
      if (!fs.existsSync(luaPath)) {
        // Fallback for compiled dist structure where assets are at dist/events/lua/
        luaPath = path.join(__dirname, '..', '..', 'events', 'lua', 'place-bet.lua');
      }
      this.logger.log(`Loading Lua script from: ${luaPath}`);
      const script = fs.readFileSync(luaPath, 'utf8');
      const client = this.redisService.getClient();
      this.placeBetScriptSha = await client.script('LOAD', script);
      this.logger.log(`Lua place-bet script loaded. SHA: ${this.placeBetScriptSha}`);
    } catch (err) {
      this.logger.error('Failed to load place-bet Lua script', err);
      throw err;
    }
  }

  /**
   * Executes the atomic place-bet Lua script.
   *
   * @param userId        - The user placing the bet
   * @param eventId       - Client-generated UUID for idempotency
   * @param roundId       - Current active round ID
   * @param totalDeducted - Amount to deduct from balance (Decimal string)
   * @param eventPayload  - Full BetPlacedEvent JSON to append to stream
   * @param exposureFields - Array of { field, inc } pairs for HINCRBYFLOAT on exposure hash
   *
   * @returns { status: 1|-1|-2|-3, newBalance: string }
   */
  async executePlaceBet(params: {
    userId: string;
    eventId: string;
    roundId: string;
    totalDeducted: string;
    eventPayload: string;
    exposureFields: Array<{ field: string; inc: string }>;
  }): Promise<{ status: number; newBalance: string }> {
    const { userId, eventId, roundId, totalDeducted, eventPayload, exposureFields } = params;

    const client = this.redisService.getClient();

    // Expose exposure fields as a simple JSON string parseable by Lua pattern matching
    const exposureJson = JSON.stringify(
      exposureFields.map(e => ({ field: e.field, inc: e.inc }))
    );

    const keys = [
      RedisKeys.userBalance(userId),        // KEYS[1]
      RedisKeys.eventSeen(eventId),         // KEYS[2]
      RedisKeys.roundExposure(roundId),     // KEYS[3]
    ];

    const args = [
      totalDeducted,    // ARGV[1]
      eventPayload,     // ARGV[2]
      roundId,          // ARGV[3]
      exposureJson,     // ARGV[4]
    ];

    let result: [number, string];

    if (this.placeBetScriptSha) {
      try {
        result = await client.evalsha(this.placeBetScriptSha, keys.length, ...keys, ...args);
      } catch (err: any) {
        // Script was flushed from Redis (e.g. after FLUSHALL) — reload and retry
        if (err.message?.includes('NOSCRIPT')) {
          this.logger.warn('Lua script not found in Redis, reloading...');
          await this.loadPlaceBetScript();
          result = await client.evalsha(this.placeBetScriptSha!, keys.length, ...keys, ...args);
        } else {
          throw err;
        }
      }
    } else {
      throw new Error('Lua script SHA not loaded');
    }

    return { status: result[0], newBalance: result[1] };
  }

  // ─────────────────────────────────────────────────────────────
  // Balance Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Seeds a user's balance into Redis from the Postgres value.
   * Called on login or on first bet if the key is missing.
   * Only sets the key if it doesn't already exist (NX flag) to avoid
   * overwriting a fresher Redis value with a stale DB value.
   */
  async seedUserBalance(userId: string, balanceFromDb: string): Promise<void> {
    const client = this.redisService.getClient();
    const key = RedisKeys.userBalance(userId);
    // SET key value NX — only set if Not eXists
    const result = await client.set(key, balanceFromDb, 'NX');
    if (result === 'OK') {
      // Set version timestamp
      await client.set(
        RedisKeys.userBalanceVersion(userId),
        Date.now().toString(),
        'NX',
      );
      this.logger.debug(`Seeded Redis balance for user ${userId}: ${balanceFromDb}`);
    }
  }

  /**
   * Reads a user's live balance from Redis.
   * Returns null if not yet seeded (caller should fall back to Postgres).
   */
  async getLiveBalance(userId: string): Promise<string | null> {
    const client = this.redisService.getClient();
    return client.get(RedisKeys.userBalance(userId));
  }

  /**
   * Directly credits a user's balance in Redis (used during settlement).
   * Also updates the version timestamp.
   */
  async creditBalance(userId: string, amount: string): Promise<string> {
    const client = this.redisService.getClient();
    const pipeline = client.pipeline();
    pipeline.incrbyfloat(RedisKeys.userBalance(userId), parseFloat(amount));
    pipeline.set(RedisKeys.userBalanceVersion(userId), Date.now().toString());
    const results = await pipeline.exec();
    // incrbyfloat returns the new value as a string
    return results[0][1] as string;
  }

  // ─────────────────────────────────────────────────────────────
  // Stream Operations
  // ─────────────────────────────────────────────────────────────

  /**
   * Appends a game event to a Redis Stream.
   * Returns the stream entry ID (e.g. "1691234567890-0").
   */
  async appendEvent(streamKey: string, event: AnyGameEvent): Promise<string> {
    const client = this.redisService.getClient();
    return client.xadd(streamKey, '*', 'data', JSON.stringify(event));
  }

  /**
   * Reads a batch of events from a stream using consumer groups.
   * Consumer groups ensure each event is processed by exactly one worker instance.
   *
   * @param streamKey   - Redis Stream key
   * @param groupName   - Consumer group name
   * @param consumerName - Unique name for this worker instance
   * @param count       - Max events to read in one call
   */
  async readBatch(
    streamKey: string,
    groupName: string,
    consumerName: string,
    count = 500,
  ): Promise<Array<{ id: string; data: string }>> {
    const client = this.redisService.getClient();
    const results = await client.xreadgroup(
      'GROUP', groupName, consumerName,
      'COUNT', count,
      'BLOCK', 100,    // Wait up to 100ms for new messages
      'STREAMS', streamKey, '>',  // '>' means only undelivered messages
    );

    if (!results || results.length === 0) return [];

    const [, entries] = results[0];
    return (entries as any[]).map(([id, fields]: [string, string[]]) => ({
      id,
      // Fields come as flat array: ['data', '{...json...}']
      data: fields[1],
    }));
  }

  /**
   * Reads ALL events from a stream without a consumer group (for settlement).
   * Used when we need the complete picture of a round's bets.
   */
  async readAllEvents(streamKey: string): Promise<Array<{ id: string; data: string }>> {
    const client = this.redisService.getClient();
    const results = await client.xrange(streamKey, '-', '+');
    if (!results || results.length === 0) return [];
    return (results as any[]).map(([id, fields]: [string, string[]]) => ({
      id,
      data: fields[1],
    }));
  }

  /**
   * Acknowledges a list of stream entries so they won't be re-delivered.
   */
  async acknowledge(streamKey: string, groupName: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const client = this.redisService.getClient();
    await client.xack(streamKey, groupName, ...ids);
  }

  /**
   * Creates a consumer group for a stream if it doesn't already exist.
   * @param startId - '$' = only new messages, '0' = all existing messages
   */
  async ensureConsumerGroup(
    streamKey: string,
    groupName: string,
    startId: '$' | '0' = '$',
  ): Promise<void> {
    const client = this.redisService.getClient();
    try {
      await client.xgroup('CREATE', streamKey, groupName, startId, 'MKSTREAM');
      this.logger.log(`Consumer group '${groupName}' created for stream '${streamKey}'`);
    } catch (err: any) {
      // BUSYGROUP means group already exists — not an error
      if (!err.message?.includes('BUSYGROUP')) {
        throw err;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Exposure Hash Operations
  // ─────────────────────────────────────────────────────────────

  /**
   * Returns the full exposure map for a round.
   * { "1": "5000.00", "2": "0.00", ..., "total": "150000.00" }
   */
  async getExposure(roundId: string): Promise<Record<string, string>> {
    const client = this.redisService.getClient();
    return client.hgetall(RedisKeys.roundExposure(roundId)) || {};
  }

  /**
   * Resets exposure hash at the start of a new round.
   * Initialises all 12 floors to "0" and "total" to "0".
   */
  async initExposure(roundId: string): Promise<void> {
    const client = this.redisService.getClient();
    const key = RedisKeys.roundExposure(roundId);
    const pipeline = client.pipeline();
    for (let floor = 1; floor <= 12; floor++) {
      pipeline.hset(key, floor.toString(), '0');
    }
    pipeline.hset(key, 'total', '0');
    // Expire after 2 hours (long after the round has ended)
    pipeline.expire(key, 7200);
    await pipeline.exec();
  }

  // ─────────────────────────────────────────────────────────────
  // Settlement Guards
  // ─────────────────────────────────────────────────────────────

  /**
   * Returns true if this round has already been settled.
   * Prevents double-settlement if the game engine fires twice.
   */
  async isRoundAlreadySettled(roundId: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const val = await client.get(RedisKeys.settlementDone(roundId));
    return val === '1';
  }

  /**
   * Marks a round as settled in Redis. TTL = 1 hour.
   */
  async markRoundSettled(roundId: string): Promise<void> {
    const client = this.redisService.getClient();
    await client.set(RedisKeys.settlementDone(roundId), '1', 'EX', 3600);
    await client.set(RedisKeys.activeRound(), '');
  }

  /**
   * Sets the active round ID in Redis when a new round starts.
   */
  async setActiveRound(roundId: string): Promise<void> {
    const client = this.redisService.getClient();
    await client.set(RedisKeys.activeRound(), roundId);
  }

  /**
   * Returns the current active round ID from Redis.
   */
  async getActiveRound(): Promise<string | null> {
    const client = this.redisService.getClient();
    const val = await client.get(RedisKeys.activeRound());
    return val || null;
  }
}
