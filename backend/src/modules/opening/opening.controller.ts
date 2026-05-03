import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OpeningsService } from './opening.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';

@Controller('stats')
export class OpeningController {
  constructor(private readonly openingsService: OpeningsService) {}

  @Get('profitable-openings')
  async getProfitableOpenings() {
    return this.openingsService.getProfitableOpenings();
  }

  @Post('manual-opening-check')
  @UseGuards(JwtAuthGuard)
  async checkManualOpening(@Body('numbers') numbers: number[] = []) {
    return this.openingsService.checkManualOpening(numbers);
  }
}
