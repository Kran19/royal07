import { Controller, Get, Req, UseGuards, Query, Param, Patch, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import type { Request } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.userService.getProfile(userId);
  }

  @Get()
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    return this.userService.getUsers(Number(page) || 1, Number(limit) || 20, search || '', status);
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Patch(':id/status')
  updateUserStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.userService.updateUserStatus(id, status);
  }
}
