import { Controller, Get, Query } from '@nestjs/common';
import { LayoutService } from './layout.service';

@Controller('layout')
export class LayoutController {
  constructor(private readonly layoutService: LayoutService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    return this.layoutService.search(q);
  }

  @Get('notifications')
  async getNotifications() {
    return this.layoutService.getNotifications();
  }
}
