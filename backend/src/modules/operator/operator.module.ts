import { Module } from '@nestjs/common';
import { OperatorController } from './operator.controller';
import { OperatorService } from './operator.service';
import { OperatorSignatureGuard } from './operator.guard';
import { WalletCallbackService } from './wallet-callback.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OperatorController],
  providers: [OperatorService, WalletCallbackService, OperatorSignatureGuard],
  exports: [OperatorService, WalletCallbackService],
})
export class OperatorModule {}
