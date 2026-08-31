import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { B2bAnalyticsService } from './b2b-analytics.service';

@Controller('operator/analytics')
@UseGuards(JwtAuthGuard)
export class B2bAnalyticsController {
  constructor(private readonly b2bAnalyticsService: B2bAnalyticsService) {}

  @Get('health')
  async getHealth(@Query('currency') currency?: string) {
    return {
      success: true,
      data: await this.b2bAnalyticsService.getOperatorHealth(currency)
    };
  }

  @Get('ggr')
  async getGGR(@Query('currency') currency?: string) {
    return {
      success: true,
      data: await this.b2bAnalyticsService.getOperatorGGR(currency)
    };
  }

  @Get('settlement')
  async getSettlement(@Query('currency') currency?: string) {
    return {
      success: true,
      data: await this.b2bAnalyticsService.getSettlementSnapshot(currency)
    };
  }

  @Get('alerts')
  async getAlerts() {
    return {
      success: true,
      data: await this.b2bAnalyticsService.getSystemAlerts()
    };
  }
}
