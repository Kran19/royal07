import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStreamService } from '../../events/event-stream.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private eventStream: EventStreamService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        balance: true,
        totalBets: true,
        totalWon: true,
        createdAt: true,
        operatorId: true
      }
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Read live balance from Redis first (source of truth)
    const redisBalance = await this.eventStream.getLiveBalance(userId);
    if (redisBalance !== null) {
      (user as any).balance = parseFloat(redisBalance);
    } else {
      // Seed Redis with the Postgres balance for future reads
      await this.eventStream.seedUserBalance(userId, user.balance.toFixed(2));
      (user as any).balance = user.balance.toNumber();
    }
    
    return { success: true, data: user };
  }

  async getUsers(page: number = 1, limit: number = 20, search: string = '', status?: string) {
    const skip = (page - 1) * limit;
    
    // Construct Prisma where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } }
      ];
    }
    
    if (status && status.trim() !== '') {
      where.isActive = status === 'ACTIVE';
    }

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          mobile: true,
          role: true,
          balance: true,
          totalBets: true,
          totalWon: true,
          totalDeposit: true,
          totalWithdraw: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          operatorId: true,
          operatorUserId: true,
          operator: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    return {
      success: true,
      data: {
        items: users.map(u => ({
          ...u,
          status: u.isActive ? 'ACTIVE' : 'BANNED'
        })),
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        mobile: true,
        role: true,
        balance: true,
        totalBets: true,
        totalWon: true,
        totalDeposit: true,
        totalWithdraw: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) throw new BadRequestException('User not found');

    return {
      success: true,
      data: {
        ...user,
        status: user.isActive ? 'ACTIVE' : 'BANNED'
      }
    };
  }

  async updateUserStatus(userId: string, status: string) {
    const isActive = status === 'ACTIVE';
    
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        isActive: true,
        username: true
      }
    });

    return {
      success: true,
      data: {
        ...user,
        status: user.isActive ? 'ACTIVE' : 'BANNED'
      }
    };
  }
}
