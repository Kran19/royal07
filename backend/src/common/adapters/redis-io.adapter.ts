import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger(RedisIoAdapter.name);

  async connectToRedis(): Promise<boolean> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      const pubClient = new Redis(redisUrl, {
        retryStrategy: (times) => {
          this.logger.warn(`Redis connection retry attempt ${times}... (Is Docker running?)`);
          if (times > 5) return null; // stop retrying and fallback if connection fully fails
          return Math.min(times * 50, 2000);
        },
      });

      const subClient = pubClient.duplicate();

      // Ensure connections actually resolve
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          pubClient.once('ready', () => resolve());
          pubClient.once('error', (err) => reject(err));
        }),
        new Promise<void>((resolve, reject) => {
          subClient.once('ready', () => resolve());
          subClient.once('error', (err) => reject(err));
        })
      ]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(`✅ Redis bound successfully: Websockets will now replicate globally.`);
      return true;

    } catch (error) {
      this.logger.error(`❌ Redis Adapter failed to connect: ${error}`);
      this.logger.warn(`⚠️ Falling back to localized In-Memory sockets (Local-Dev Mode)`);
      return false; // Tells main.ts not to use the adapter if it failed
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    
    return server;
  }
}
