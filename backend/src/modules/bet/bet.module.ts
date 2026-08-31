import { Module, forwardRef } from '@nestjs/common';
import { BetController } from './bet.controller';
import { BetService } from './bet.service';
import { BetGateway } from './bet.gateway';
import { JwtModule } from '@nestjs/jwt';
import { GameModule } from '../game/game.module';
import { SettingsModule } from '../settings/settings.module';
import { EventsModule } from '../../events/events.module';
import { OperatorModule } from '../operator/operator.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-royalbet!'
    }),
    GameModule,          // Still imported for BetGateway (GameLifecycleService phase check)
    SettingsModule,
    EventsModule,        // Provides EventStreamService for Redis-first bet placement
    forwardRef(() => OperatorModule), // WalletCallbackService for synchronous bet auth
  ],
  controllers: [BetController],
  providers: [BetService, BetGateway],
  exports: [BetService]
})
export class BetModule {}
