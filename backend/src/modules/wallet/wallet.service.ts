import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionDto } from './dto/transaction.dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true }
    });
    
    return {
      success: true,
      data: { balance: user ? (user as any).balance.toNumber() : 0 }
    };
  }

  async deposit(userId: string, dto: TransactionDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException({ success: false, error: { message: 'User not found' } });
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount: new Decimal(dto.amount) as any,
        balanceBefore: (user as any).balance as any,
        balanceAfter: (user as any).balance as any, // Will be updated on approval
        status: 'PENDING'
      }
    });

    return {
      success: true,
      data: {
        id: transaction.id,
        transactionId: transaction.id,
        balanceBefore: user.balance,
        amount: dto.amount,
        status: 'PENDING'
      }
    };
  }

  async uploadProof(userId: string, transactionId: string, file: Express.Multer.File) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    
    if (!transaction || transaction.userId !== userId || transaction.status !== 'PENDING') {
      throw new BadRequestException({ success: false, error: { message: 'Invalid transaction for upload' } });
    }

    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'WAITING_APPROVAL',
        description: `/uploads/proofs/${file.filename}` // Store the local path reference
      }
    });

    return {
      success: true,
      data: {
        transactionId,
        status: 'WAITING_APPROVAL',
        proofUrl: updated.description
      }
    };
  }

  async withdraw(userId: string, dto: TransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      const amount = new Decimal(dto.amount);
      if (!user || (user as any).balance.lt(amount)) {
        throw new BadRequestException({ success: false, error: { message: 'Insufficient balance' } });
      }

      const updatedUser = await tx.user.update({
        where: { 
          id: userId,
          version: (user as any).version // Optimistic Lock
        } as any,
        data: {
          balance: { decrement: amount as any },
          totalWithdraw: { increment: amount as any },
          version: { increment: 1 }
        } as any
      });

      if (!updatedUser) {
        throw new ConflictException({ success: false, error: { message: 'Transaction conflict, please try again' } });
      }

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'WITHDRAW',
          amount: amount as any,
          balanceBefore: (user as any).balance as any,
          balanceAfter: (updatedUser as any).balance as any,
          status: 'PENDING'
        }
      });

      return {
        success: true,
        data: {
          transactionId: transaction.id,
          balanceBefore: user.balance,
          balanceAfter: updatedUser.balance,
          status: 'COMPLETED',
          newBalance: updatedUser.balance
        }
      };
    });
  }

  async getHistory(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return {
      success: true,
      data: {
        deposits: transactions.filter(t => t.type === 'DEPOSIT'),
        withdrawals: transactions.filter(t => t.type === 'WITHDRAW').map(t => ({
          ...t,
          upiOrAccount: t.description || 'N/A'
        })),
        transactions: transactions.filter(t => !['DEPOSIT', 'WITHDRAW'].includes(t.type))
      }
    };
  }

  // --- Admin Methods ---

  async getAdminTransactions(
    type: TransactionType,
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: TransactionStatus
  ) {
    const skip = (page - 1) * limit;

    const where: any = { type };
    if (status) where.status = status;
    if (search) {
      where.user = {
        mobile: { contains: search, mode: 'insensitive' }
      };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: { mobile: true, balance: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.transaction.count({ where })
    ]);

    return {
      success: true,
      data: {
        items: transactions.map(t => ({
          ...t,
          proofImageUrl: t.description?.startsWith('/uploads') ? t.description : undefined
        })),
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    };
  }

  async processTransaction(id: string, action: 'approve' | 'reject', adminNote?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!transaction) {
      throw new BadRequestException({ success: false, error: { message: 'Transaction not found' } });
    }

    if (transaction.status === 'COMPLETED' || transaction.status === 'FAILED') {
      throw new BadRequestException({ success: false, error: { message: 'Transaction already processed' } });
    }

    return this.prisma.$transaction(async (tx) => {
      if (action === 'approve') {
        if (transaction.type === 'DEPOSIT') {
          // Update user balance
          await tx.user.update({
            where: { id: transaction.userId },
            data: {
              balance: { increment: transaction.amount },
              totalDeposit: { increment: transaction.amount },
              version: { increment: 1 }
            }
          });

          // Update transaction
          const updated = await tx.transaction.update({
            where: { id },
            data: {
              status: 'COMPLETED',
              description: adminNote || transaction.description,
              settledAt: new Date(),
              balanceAfter: transaction.balanceBefore.add(transaction.amount) as any
            }
          });

          return { success: true, data: updated };
        } 
        
        // For withdrawals, balance is usually already deducted at request time
        const updated = await tx.transaction.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            description: adminNote || transaction.description,
            settledAt: new Date()
          }
        });
        return { success: true, data: updated };

      } else {
        // Reject
        if (transaction.type === 'WITHDRAW') {
          // Refund balance if it was a withdrawal
          await tx.user.update({
            where: { id: transaction.userId },
            data: {
              balance: { increment: transaction.amount },
              totalWithdraw: { decrement: transaction.amount },
              version: { increment: 1 }
            }
          });
        }

        const updated = await tx.transaction.update({
          where: { id },
          data: {
            status: 'FAILED',
            description: adminNote || 'Rejected by admin',
            settledAt: new Date()
          }
        });

        return { success: true, data: updated };
      }
    });
  }
}
