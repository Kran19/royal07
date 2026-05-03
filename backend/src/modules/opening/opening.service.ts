import { Injectable } from '@nestjs/common';
import { ProfitCalculatorService } from './calculator/profit-calculator.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class OpeningsService {
  constructor(
    private readonly profitCalculator: ProfitCalculatorService,
    private readonly redisService: RedisService,
  ) {}

  async getProfitableOpenings() {
    return { success: true, data: { status: 'mock' } };
  }

  async checkManualOpening(numbers: number[]) {
    return { success: true, data: { numbers, status: 'checked' } };
  }
}
