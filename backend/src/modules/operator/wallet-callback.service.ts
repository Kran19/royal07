import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class WalletCallbackService {
  private readonly logger = new Logger(WalletCallbackService.name);
  
  // We should read our own private key from env, but for now we simulate
  private get ourPrivateKey(): string {
    return process.env.GAP_PRIVATE_KEY || ''; // Needs to be set in .env
  }

  constructor(private prisma: PrismaService) {}

  private signRequest(body: any): string {
    if (!this.ourPrivateKey) {
      this.logger.warn('GAP_PRIVATE_KEY is not set. Cannot sign request properly.');
      return '';
    }
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(JSON.stringify(body));
    return sign.sign(this.ourPrivateKey, 'base64');
  }

  async sendRequestWithRetry(url: string, body: any, transactionId: string): Promise<any> {
    const signature = this.signRequest(body);
    let attempts = 0;
    const maxRetries = 10;

    while (attempts < maxRetries) {
      try {
        const response = await axios.post(url, body, {
          headers: {
            'Content-Type': 'application/json',
            'Signature': signature
          },
          timeout: 5000 // 5 seconds per attempt
        });

        if (response.status === 200 && response.data.status === 'OP_SUCCESS') {
          // Success!
          await this.prisma.operatorTransaction.update({
            where: { transactionId },
            data: { status: 'SUCCESS', retries: attempts }
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
          throw new Error(`Max retries reached for transaction ${transactionId}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
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

    const body = {
      operatorId: operator.operatorId,
      userId,
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

    const body = {
      operatorId: operator.operatorId,
      userId,
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
