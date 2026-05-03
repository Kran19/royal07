import { Module } from '@nestjs/common';
import { ProfitCalculatorService } from './calculator/profit-calculator.service';
import { OpeningController } from './opening.controller';
import { OpeningsService } from './opening.service';
import { StatsModule } from '../stats/stats.module';

@Module({
  controllers: [OpeningController],
  imports: [StatsModule],
  providers: [ProfitCalculatorService, OpeningsService],
  exports: [ProfitCalculatorService, OpeningsService]
})
export class OpeningModule {}
