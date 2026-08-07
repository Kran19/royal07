import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameLifecycleService } from './game-lifecycle.service';
import { CrashRecoveryService } from './crash-recovery.service';
import { OpeningModule } from '../opening/opening.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SettingsModule } from '../settings/settings.module';
import { EventsModule } from '../../events/events.module';

@Module({
  imports: [OpeningModule, WebsocketModule, SettingsModule, EventsModule],
  controllers: [GameController],
  // CrashRecoveryService runs first (onModuleInit order = registration order).
  // It scans for and refunds any abandoned rounds BEFORE GameLifecycleService
  // starts a new round — guaranteeing players are never out of pocket.
  providers: [GameService, CrashRecoveryService, GameLifecycleService],
  exports: [GameService, GameLifecycleService]
})
export class GameModule {}
