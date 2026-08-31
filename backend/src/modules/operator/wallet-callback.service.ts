import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class WalletCallbackService implements OnModuleInit {
  private readonly logger = new Logger(WalletCallbackService.name);
  
  // We should read our own private key from env, but for now we simulate
  private get ourPrivateKey(): string {
    return process.env.GAP_PRIVATE_KEY || ''; // Needs to be set in .env
  }

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const key = this.ourPrivateKey;
    if (key && key.includes('RSA PRIVATE KEY')) {
      this.logger.log('✅ GAP_PRIVATE_KEY loaded (PKCS1 RSA). Callback signing is active.');
    } else if (key) {
      this.logger.warn('⚠️  GAP_PRIVATE_KEY found but format looks unexpected. Check .env.');
    } else {
      this.logger.error('❌ GAP_PRIVATE_KEY is NOT set. Operator callbacks cannot be signed!');
    }
  }

  private signRequest(body: any): string {
    if (!this.ourPrivateKey) {
      this.logger.warn('GAP_PRIVATE_KEY is not set. Cannot sign request properly.');
      return '';
    }
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(JSON.stringify(body));
    return sign.sign(this.ourPrivateKey, 'base64');
  }

  /**
   * sendRequestWithRetry — Async retry loop for WIN CREDIT callbacks
   * =================================================================
   * Used only by creditWin() (result/win payout) after round settlement.
   * Retries up to 10x with exponential backoff.
   * NOT used for bet placement — use debitBetSync() for that.
   */
  private async sendRequestWithRetry(url: string, body: any, transactionId: string): Promise<any> {
    const signature = this.signRequest(body);
    let attempts = 0;
    const maxRetries = 10;

    while (attempts < maxRetries) {
      try {
        const reqStartTime = performance.now();
        const response = await axios.post(url, body, {
          headers: { 'Content-Type': 'application/json', 'Signature': signature },
          timeout: 5000
        });
        const responseTimeMs = Math.round(performance.now() - reqStartTime);

        if (response.status === 200 && response.data.status === 'OP_SUCCESS') {
          await this.prisma.operatorTransaction.update({
            where: { transactionId },
            data: { status: 'SUCCESS', retries: attempts, responseTimeMs }
          });
          return response.data;
        } else {
          throw new Error(`Operator returned non-success: ${JSON.stringify(response.data)}`);
        }
      } catch (error) {
        attempts++;
        this.logger.error(`Attempt ${attempts} failed for txn ${transactionId}: ${error.message}`);
        await this.prisma.operatorTransaction.update({
          where: { transactionId },
          data: { retries: attempts, status: attempts >= maxRetries ? 'FAILED' : 'PENDING' }
        });
        if (attempts >= maxRetries) {
          await this.prisma.systemAlert.create({
            data: {
              type: 'CRITICAL',
              message: `Operator Webhook failed after ${maxRetries} retries for txn ${transactionId}. URL: ${url}`,
              source: 'WEBHOOK_SERVICE',
              operatorId: body.operatorId
            }
          });
          throw new Error(`Max retries reached for transaction ${transactionId}`);
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }

  /**
   * debitBetSync — Synchronous bet authorization (USED ON BET HOT PATH)
   * ====================================================================
   * This is called BEFORE the Lua script deducts balance from Redis.
   * It calls the operator's /betrequest with a 5s timeout and returns
   * success or failure immediately — NO retries.
   *
   * If the operator returns OP_SUCCESS → proceed with Redis deduction.
   * If the operator returns anything else → reject the bet entirely.
   *
   * Special case: If the user has NO operatorId (direct B2C user),
   * this method is skipped and returns { success: true } immediately.
   */
  async debitBetSync(
    userId: string,
    transactionId: string,
    roundId: string,
    debitAmount: number,
    token: string,
    roundNumber: number
  ): Promise<{ success: boolean; status: string; balance?: number; message?: string }> {
    // Find the user's linked operator
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { operatorId: true, operatorUserId: true }
    });

    // B2C user (no operator) — skip operator callback entirely
    if (!user?.operatorId) {
      return { success: true, status: 'B2C_USER' };
    }

    const operator = await this.prisma.operator.findUnique({
      where: { id: user.operatorId }
    });

    // No callback URL configured → skip (shouldn't happen in production)
    if (!operator?.callbackUrl) {
      this.logger.warn(`Operator ${user.operatorId} has no callbackUrl. Skipping bet auth.`);
      return { success: true, status: 'NO_CALLBACK' };
    }

    const body = {
      operatorId: operator.operatorId,
      userId: user.operatorUserId || userId, // Fallback to internal ID if missing
      token,
      reqId: transactionId, // Use same transactionId as reqId for idempotency
      transactionId,
      gameId: 'royalbet-elevator',
      roundId,
      debitAmount,
      betType: 'SINGLE',
      round_closed: false,
      eventName: `Elevator Round ${roundNumber}`,
    };

    const bodyString = JSON.stringify(body);
    const signature = this.signRequest(body);

    // Record in DB for audit trail
    await this.prisma.operatorTransaction.upsert({
      where: { transactionId },
      update: { status: 'PENDING' },
      create: {
        operatorId: user.operatorId,
        userId,
        transactionId,
        roundId,
        type: 'DEBIT',
        amount: debitAmount,
        status: 'PENDING'
      }
    });

    try {
      const startTime = performance.now();
      const response = await axios.post(`${operator.callbackUrl}/betrequest`, bodyString, {
        headers: {
          'Content-Type': 'application/json',
          'Signature': signature
        },
        timeout: 5000  // Hard 5s limit — if operator is slow, bet is rejected
      });
      const responseTimeMs = Math.round(performance.now() - startTime);
      const { status, balance } = response.data;

      if (response.status === 200 && status === 'OP_SUCCESS') {
        await this.prisma.operatorTransaction.update({
          where: { transactionId },
          data: { status: 'SUCCESS', retries: 0, responseTimeMs }
        });
        return { success: true, status, balance };
      }

      // Operator declined (INSUFFICIENT_FUNDS, USER_NOT_FOUND, etc.)
      await this.prisma.operatorTransaction.update({
        where: { transactionId },
        data: { status: 'FAILED', retries: 0, responseTimeMs }
      });
      this.logger.warn(`Operator declined bet ${transactionId}: ${status}`);
      return { success: false, status, balance, message: response.data.message };

    } catch (error) {
      await this.prisma.operatorTransaction.update({
        where: { transactionId },
        data: { status: 'FAILED', retries: 1 }
      });
      this.logger.error(`Operator betrequest failed for txn ${transactionId}: ${error.message}`);
      return { success: false, status: 'OPERATOR_UNREACHABLE', message: error.message };
    }
  }



  async debitBet(
    operatorId: string, 
    userId: string, 
    transactionId: string, 
    roundId: string, 
    debitAmount: number,
    token: string,
    roundNumber: number
  ) {
    const operator = await this.prisma.operator.findUnique({ where: { id: operatorId }});
    if (!operator || !operator.callbackUrl) return;

    await this.prisma.operatorTransaction.upsert({
      where: { transactionId },
      update: { status: 'PENDING' },
      create: {
        operatorId,
        userId,
        transactionId,
        roundId,
        type: 'DEBIT',
        amount: debitAmount,
        status: 'PENDING'
      }
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { operatorUserId: true }
    });

    const body = {
      operatorId: operator.operatorId,
      userId: user?.operatorUserId || userId,
      token,
      reqId: crypto.randomUUID(),
      transactionId,
      gameId: 'royalbet-elevator',
      roundId,
      debitAmount,
      betType: 'SINGLE',
      round_closed: false,
      eventName: `Elevator Round ${roundNumber}`
    };

    return this.sendRequestWithRetry(`${operator.callbackUrl}/betrequest`, body, transactionId);
  }

  async creditWin(
    operatorId: string, 
    userId: string, 
    transactionId: string, 
    roundId: string, 
    creditAmount: number,
    token: string,
    roundNumber: number
  ) {
    const operator = await this.prisma.operator.findUnique({ where: { id: operatorId }});
    if (!operator || !operator.callbackUrl) return;

    await this.prisma.operatorTransaction.upsert({
      where: { transactionId },
      update: { status: 'PENDING' },
      create: {
        operatorId,
        userId,
        transactionId,
        roundId,
        type: 'CREDIT',
        amount: creditAmount,
        status: 'PENDING'
      }
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { operatorUserId: true }
    });

    const body = {
      operatorId: operator.operatorId,
      userId: user?.operatorUserId || userId,
      token,
      reqId: crypto.randomUUID(),
      transactionId,
      gameId: 'royalbet-elevator',
      roundId,
      creditAmount,
      round_closed: true,
      eventName: `Elevator Round ${roundNumber}`
    };

    return this.sendRequestWithRetry(`${operator.callbackUrl}/resultrequest`, body, transactionId);
  }
}
