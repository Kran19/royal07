import { Module } from '@nestjs/common';
import { BetController } from './bet.controller';
import { BetService } from './bet.service';
import { BetGateway } from './bet.gateway';
import { JwtModule } from '@nestjs/jwt';
import { GameModule } from '../game/game.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-royalbet!'
    }),
    GameModule,
  ],
  controllers: [BetController],
  providers: [BetService, BetGateway],
  exports: [BetService]
})
export class BetModule {}
