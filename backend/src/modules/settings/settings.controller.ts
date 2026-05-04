import { Controller, Get, Patch, Body, UseGuards, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('status')
  async getPublicStatus() {
    return this.settingsService.getSettings(); // Or a subset if needed, but getSettings handles defaults
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateSettings(@Body() dto: any) {
    return this.settingsService.updateSettings(dto);
  }

  @Post('qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('qrCode', {
    storage: diskStorage({
      destination: './uploads/settings',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        callback(null, `qr-${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return callback(new BadRequestException('Only image files are allowed!'), false);
      }
      callback(null, true);
    }
  }))
  async uploadQrCode(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('QR image is required');
    }
    
    const qrCodeUrl = `/uploads/settings/${file.filename}`;
    
    // Save to settings
    await this.settingsService.updateSettings({ qrCodeUrl });
    
    return {
      success: true,
      data: { qrCodeUrl }
    };
  }
}
