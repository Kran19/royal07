import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly SETTINGS_ID = 'default-settings';

  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.adminSettings.findUnique({
      where: { id: this.SETTINGS_ID }
    });

    if (!settings) {
      // Auto-initialize with production defaults if missing
      settings = await this.prisma.adminSettings.create({
        data: {
          id: this.SETTINGS_ID,
          roundDuration: 30,
          minBetAmount: 10,
          maxBetAmount: 100000,
          maintenanceMode: false
        }
      });
    }

    return {
      success: true,
      data: settings
    };
  }

  async updateSettings(data: any) {
    const updated = await this.prisma.adminSettings.update({
      where: { id: this.SETTINGS_ID },
      data: {
        roundDuration: data.roundDuration,
        minBetAmount: data.minBetAmount,
        maxBetAmount: data.maxBetAmount,
        maintenanceMode: data.maintenanceMode,
      }
    });

    return {
      success: true,
      data: updated
    };
  }
}
