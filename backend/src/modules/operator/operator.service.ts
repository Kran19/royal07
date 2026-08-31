import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { WalletCallbackService } from './wallet-callback.service';

import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class LoginOperatorDto {
  @IsString()
  @IsNotEmpty()
  operatorId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  platformId: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsBoolean()
  @IsOptional()
  lobby: boolean;

  @IsString()
  @IsNotEmpty()
  gameId: string;

  @IsString()
  @IsNotEmpty()
  clientIp: string;

  @IsNumber()
  @IsNotEmpty()
  balance: number;

  @IsString()
  @IsOptional()
  redirectUrl: string;

  @IsString()
  @IsOptional()
  subOperatorId?: string;

  @IsString()
  @IsOptional()
  partnerId?: string;
}

@Injectable()
export class OperatorService {
  private readonly logger = new Logger(OperatorService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WalletCallbackService))
    private walletCallbackService: WalletCallbackService
  ) { }

  async processOperatorLogin(data: LoginOperatorDto) {
    this.logger.log(`Processing operator login for operator=${data.operatorId} user=${data.userId}`);

    const operator = await this.prisma.operator.findUnique({
      where: { operatorId: data.operatorId },
    });

    if (!operator) {
      return { status: 0, errorDescription: 'Invalid Operator ID' };
    }

    // Upsert the federated user
    // We synthesize a unique stable mobile number from operatorId+userId so we satisfy
    // the NOT NULL + UNIQUE constraint on User.mobile without changing the schema.
    const fakeMobile = `OP-${data.operatorId}-${data.userId}`;

    let user = await this.prisma.user.findFirst({
      where: {
        operatorId: operator.id,
        operatorUserId: data.userId,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          operatorId: operator.id,
          operatorUserId: data.userId,
          username: data.username,
          mobile: fakeMobile,
          passwordHash: 'FEDERATED_NO_PASSWORD',
          balance: data.balance,
          currency: data.currency,
        },
      });
      this.logger.log(`Created federated user ${user.id} for operator ${operator.operatorId}`);
    } else {
      // Sync balance from operator (their wallet is source of truth)
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          balance: data.balance,
          currency: data.currency
        },
      });
    }

    // Create a standard UserSession so the game front-end can use it
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    await this.prisma.userSession.create({
      data: { userId: user.id, token, expiresAt },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    return {
      userId: data.userId,
      token,
      url: `${frontendUrl}/play?session=${token}`,
      providerId: 'royalbet',
      providerName: 'RoyalBet Elevator',
      status: 1,
      errorDescription: '',
    };
  }

  async listOperators() {
    return this.prisma.operator.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        operatorId: true,
        callbackUrl: true,
        status: true,
        createdAt: true,
        allowedIps: true,
      }
    });
  }

  async createOperator(data: { name: string, operatorId: string, publicKey: string, callbackUrl: string, allowedIps?: string[], revSharePercent?: number }) {
    // Basic format check for public key
    if (!data.publicKey.includes('BEGIN PUBLIC KEY') && !data.publicKey.includes('BEGIN RSA PUBLIC KEY')) {
      throw new Error('Public key must be in PEM format (e.g. -----BEGIN PUBLIC KEY-----...)');
    }

    return this.prisma.operator.create({
      data: {
        name: data.name,
        operatorId: data.operatorId,
        publicKey: data.publicKey.trim(),
        callbackUrl: data.callbackUrl,
        allowedIps: data.allowedIps || [],
        ...(data.revSharePercent !== undefined ? { revSharePercent: data.revSharePercent } : {})
      }
    });
  }

  async getOperatorTransactions(operatorId?: string, page: number = 1, limit: number = 50, status?: string, type?: string) {
    const where: any = {};
    if (operatorId) where.operatorId = operatorId;
    if (status) where.status = status;
    if (type) where.type = type;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.operatorTransaction.findMany({
        where,
        include: { operator: { select: { name: true, operatorId: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.operatorTransaction.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOperatorStats(operatorId: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!operator) throw new Error('Operator not found');

    const transactions = await this.prisma.operatorTransaction.findMany({
      where: { operatorId },
      select: { type: true, status: true, amount: true },
    });

    let totalDebit = 0;
    let totalCredit = 0;
    let failedCount = 0;
    let successCount = 0;

    for (const txn of transactions) {
      const amount = Number(txn.amount);
      if (txn.status === 'SUCCESS') {
        successCount++;
        if (txn.type === 'DEBIT') totalDebit += amount;
        if (txn.type === 'CREDIT') totalCredit += amount;
      } else if (txn.status === 'FAILED') {
        failedCount++;
      }
    }

    return {
      totalUsers: operator._count.users,
      totalWagered: totalDebit,
      totalCredited: totalCredit,
      failedCallbacks: failedCount,
      successCallbacks: successCount,
    };
  }

  async getAllOperatorProfitSummary() {
    const operators = await this.prisma.operator.findMany({
      include: {
        _count: {
          select: { users: true },
        },
        users: {
          include: {
            bets: {
              where: { status: 'SETTLED' },
              select: { amount: true, settlementAmount: true },
            },
          },
        },
      },
    });

    return operators.map(op => {
      let totalStake = 0;
      let totalPayout = 0;

      op.users.forEach(user => {
        user.bets.forEach(bet => {
          totalStake += Number(bet.amount);
          totalPayout += Number(bet.settlementAmount || 0);
        });
      });

      return {
        id: op.id,
        name: op.name,
        operatorId: op.operatorId,
        userCount: op._count.users,
        totalStake,
        totalPayout,
        profit: totalStake - totalPayout,
        status: op.status,
      };
    }).sort((a, b) => b.profit - a.profit);
  }

  async retryFailedTransaction(txnId: string) {
    const txn = await this.prisma.operatorTransaction.findUnique({
      where: { id: txnId },
      include: { operator: true },
    });

    if (!txn) throw new Error('Transaction not found');
    if (txn.status !== 'FAILED') throw new Error('Can only retry failed transactions');

    // Need to reconstruct the original payload based on whether it was CREDIT or DEBIT.
    // For DEBIT, it's typically tied to a bet placement. For CREDIT, it's tied to settlement.
    // We would need the token from userSession, which is hard to get here. 
    // Ideally we store the original payload in the DB, but since we don't have it, 
    // we can pass a dummy token or lookup the latest active token for the user.
    const userSession = await this.prisma.userSession.findFirst({
      where: { userId: txn.userId },
      orderBy: { createdAt: 'desc' }
    });
    const token = userSession ? userSession.token : 'retry-token';

    // We don't have roundNumber directly on txn, we'd have to look it up via roundId
    const round = await this.prisma.gameRound.findUnique({ where: { id: txn.roundId } });
    const roundNumber = round ? round.roundNumber : 0;

    if (txn.type === 'DEBIT') {
      return this.walletCallbackService.debitBet(txn.operator.id, txn.userId, txn.transactionId, txn.roundId, Number(txn.amount), token, roundNumber);
    } else if (txn.type === 'CREDIT') {
      return this.walletCallbackService.creditWin(txn.operator.id, txn.userId, txn.transactionId, txn.roundId, Number(txn.amount), token, roundNumber);
    } else {
      throw new Error(`Retry not implemented for transaction type ${txn.type}`);
    }
  }

  async updateOperator(id: string, data: any) {
    return this.prisma.operator.update({
      where: { id },
      data,
    });
  }
}
