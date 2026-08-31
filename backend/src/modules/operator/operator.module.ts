import { Module } from '@nestjs/common';
import { OperatorController } from './operator.controller';
import { OperatorService } from './operator.service';
import { OperatorSignatureGuard } from './operator.guard';
import { WalletCallbackService } from './wallet-callback.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { B2bAnalyticsController } from './b2b-analytics.controller';
import { B2bAnalyticsService } from './b2b-analytics.service';
import { EventsModule } from '../../events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [OperatorController, B2bAnalyticsController],
  providers: [OperatorService, WalletCallbackService, OperatorSignatureGuard, B2bAnalyticsService],
  exports: [OperatorService, WalletCallbackService, B2bAnalyticsService],
})
export class OperatorModule {}
