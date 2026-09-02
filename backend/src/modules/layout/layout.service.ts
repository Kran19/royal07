import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LayoutService {
  constructor(private prisma: PrismaService) {}

  async search(query: string) {
    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    const results: any[] = [];
    const searchStr = query.toLowerCase();

    // 1. Search Users (by username, mobile, ID, operatorUserId)
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: searchStr, mode: 'insensitive' } },
          { mobile: { contains: searchStr, mode: 'insensitive' } },
          { id: { contains: searchStr, mode: 'insensitive' } },
          { operatorUserId: { contains: searchStr, mode: 'insensitive' } },
        ]
      },
      take: 5
    });

    for (const u of users) {
      results.push({
        type: 'USER',
        id: u.id,
        label: u.username || u.mobile || u.id,
        subLabel: u.operatorUserId ? `Op ID: ${u.operatorUserId}` : 'B2C User',
        url: `/admin/users?search=${u.id}`
      });
    }

    // 2. Search Bets (by ID)
    const bets = await this.prisma.bet.findMany({
      where: {
        id: { contains: searchStr, mode: 'insensitive' }
      },
      take: 5
    });

    for (const b of bets) {
      results.push({
        type: 'BET',
        id: b.id,
        label: `Bet #${b.id.slice(-8)}`,
        subLabel: `₹${b.amount} on Round ${b.roundId.slice(-8)}`,
        url: `/admin/bets?search=${b.id}`
      });
    }

    // 3. Search Rounds (by roundNumber)
    let roundNum = parseInt(searchStr, 10);
    if (!isNaN(roundNum)) {
      const rounds = await this.prisma.gameRound.findMany({
        where: {
          roundNumber: roundNum
        },
        take: 3
      });
      for (const r of rounds) {
        results.push({
          type: 'ROUND',
          id: r.id,
          label: `Round #${r.roundNumber}`,
          subLabel: `Status: ${r.status}`,
          url: `/admin/rounds?search=${r.roundNumber}`
        });
      }
    }

    return { success: true, data: results };
  }

  async getNotifications() {
    const alerts = await this.prisma.systemAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return { success: true, data: alerts };
  }
}
