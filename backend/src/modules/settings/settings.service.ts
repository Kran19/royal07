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
        roundDuration: data.roundDuration !== undefined ? data.roundDuration : undefined,
        minBetAmount: data.minBetAmount !== undefined ? data.minBetAmount : undefined,
        maxBetAmount: data.maxBetAmount !== undefined ? data.maxBetAmount : undefined,
        maintenanceMode: data.maintenanceMode !== undefined ? data.maintenanceMode : undefined,
        bankAccountName: data.bankAccountName !== undefined ? data.bankAccountName : undefined,
        bankAccountNumber: data.bankAccountNumber !== undefined ? data.bankAccountNumber : undefined,
        bankIfscCode: data.bankIfscCode !== undefined ? data.bankIfscCode : undefined,
        upiId: data.upiId !== undefined ? data.upiId : undefined,
        qrCodeUrl: data.qrCodeUrl !== undefined ? data.qrCodeUrl : undefined,
        paymentInstructions: data.paymentInstructions !== undefined ? data.paymentInstructions : undefined,
      }
    });

    return {
      success: true,
      data: updated
    };
  }
}
