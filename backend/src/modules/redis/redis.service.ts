import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
const Redis = require('ioredis');

/**
 * RedisService
 * ============
 * Wraps ioredis with typed helper methods.
 * Extended to support Redis Streams, Hashes, Pipelines, and Lua scripts
 * required by the Event Sourcing architecture.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: any;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      // Enable keepalive to prevent stale connections under load
      keepAlive: 30000,
    });

    this.client.on('error', (err: Error) => console.error('Redis Client Error', err));
    this.client.on('connect', () => console.log('Redis Connected Successfully'));
  }

  async onModuleInit() {
    // ioredis connects automatically
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ─────────────────────────────────────────────
  // Core String Operations
  // ─────────────────────────────────────────────

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incrbyfloat(key: string, increment: number): Promise<string> {
    return this.client.incrbyfloat(key, increment);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  // ─────────────────────────────────────────────
  // Hash Operations (for exposure maps)
  // ─────────────────────────────────────────────

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key) || {};
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  async hincrbyfloat(key: string, field: string, increment: number): Promise<string> {
    return this.client.hincrbyfloat(key, field, increment);
  }

  // ─────────────────────────────────────────────
  // List Operations (for settlement queue)
  // ─────────────────────────────────────────────

  async rpush(key: string, value: string): Promise<void> {
    await this.client.rpush(key, value);
  }

  async lpop(key: string): Promise<string | null> {
    return this.client.lpop(key);
  }

  // ─────────────────────────────────────────────
  // Stream Operations (Redis Streams)
  // ─────────────────────────────────────────────

  async xadd(key: string, id: string, ...fieldValues: string[]): Promise<string> {
    return this.client.xadd(key, id, ...fieldValues);
  }

  async xrange(key: string, start: string, end: string): Promise<any[]> {
    return this.client.xrange(key, start, end);
  }

  async xreadgroup(
    group: string,
    consumer: string,
    count: number,
    blockMs: number,
    streamKey: string,
    id: string,
  ): Promise<any[]> {
    return this.client.xreadgroup(
      'GROUP', group, consumer,
      'COUNT', count,
      'BLOCK', blockMs,
      'STREAMS', streamKey, id,
    );
  }

  async xack(key: string, group: string, ...ids: string[]): Promise<number> {
    return this.client.xack(key, group, ...ids);
  }

  async xgroup(command: string, ...args: string[]): Promise<void> {
    await this.client.xgroup(command, ...args);
  }

  async xlen(key: string): Promise<number> {
    return this.client.xlen(key);
  }

  // ─────────────────────────────────────────────
  // Pipeline (batch operations)
  // ─────────────────────────────────────────────

  /**
   * Returns a Pipeline instance for batching multiple Redis commands
   * into a single network roundtrip.
   *
   * Usage:
   *   const pipeline = redisService.pipeline();
   *   pipeline.set('key1', 'val1');
   *   pipeline.incr('counter');
   *   const results = await pipeline.exec();
   */
  pipeline() {
    return this.client.pipeline();
  }

  // ─────────────────────────────────────────────
  // Lua Script Operations
  // ─────────────────────────────────────────────

  /**
   * Loads a Lua script into Redis and returns its SHA1 hash.
   * The SHA is used with EVALSHA for faster repeated execution.
   */
  async scriptLoad(script: string): Promise<string> {
    return this.client.script('LOAD', script);
  }

  /**
   * Executes a Lua script by its SHA1 hash.
   * Faster than EVAL because Redis doesn't need to parse the script each time.
   */
  async evalsha(sha: string, numkeys: number, ...args: string[]): Promise<any> {
    return this.client.evalsha(sha, numkeys, ...args);
  }

  /**
   * Executes a Lua script directly (slower than EVALSHA, use for one-offs).
   */
  async eval(script: string, numkeys: number, ...args: string[]): Promise<any> {
    return this.client.eval(script, numkeys, ...args);
  }

  // ─────────────────────────────────────────────
  // Raw Client Access (for advanced use cases)
  // ─────────────────────────────────────────────

  getClient(): any {
    return this.client;
  }
}
