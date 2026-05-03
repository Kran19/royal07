import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameLifecycleService } from './game-lifecycle.service';
import { OpeningModule } from '../opening/opening.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [OpeningModule, WebsocketModule, SettingsModule],
  controllers: [GameController],
  providers: [GameService, GameLifecycleService],
  exports: [GameService, GameLifecycleService]
})
export class GameModule {}
