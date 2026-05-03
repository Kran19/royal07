import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { HealthController } from './health.controller';

import { AuthModule } from './modules/auth/auth.module';
import { BetModule } from './modules/bet/bet.module';
import { GameModule } from './modules/game/game.module';
import { StatsModule } from './modules/stats/stats.module';
import { UserModule } from './modules/user/user.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { RedisModule } from './modules/redis/redis.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { OpeningModule } from './modules/opening/opening.module';
import { WorkerModule } from './workers/worker.module';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    WebsocketModule,
    AuthModule,
    BetModule,
    GameModule,
    StatsModule,
    UserModule,
    WalletModule,
    OpeningModule,
    WorkerModule,
    SettingsModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
