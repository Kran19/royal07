import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';

export interface WebhookJobData {
  transactionId: string;
  operatorId: string;
  url: string;
  bodyString: string;
  signature: string;
}

@Processor('webhook-queue', {
  concurrency: 150,
})
@Injectable()
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<WebhookJobData, any, string>): Promise<any> {
    const { transactionId, operatorId, url, bodyString, signature } = job.data;
    
    // We start the timer here
    const startTime = performance.now();

    try {
      const response = await axios.post(url, bodyString, {
        headers: {
          'Content-Type': 'application/json',
          'Signature': signature
        },
        timeout: 5000 // 5 seconds timeout
      });

      const responseTimeMs = Math.round(performance.now() - startTime);

      // Successfully reached operator. Determine success or fail payload based on OP_SUCCESS
      if (response.status === 200 && response.data?.status === 'OP_SUCCESS') {
        await this.prisma.operatorTransaction.update({
          where: { transactionId },
          data: {
            status: 'SUCCESS',
            retries: job.attemptsMade,
            responseTimeMs,
            responsePayload: JSON.stringify(response.data)
          }
        });
        this.logger.log(`Webhook succeeded for txn ${transactionId}`);
        return response.data;
      } else {
        // Log the failure to DB but still let BullMQ retry it since the response wasn't OP_SUCCESS
        // Maybe the operator's system had a temporary failure
        throw new Error(`Operator returned non-success status: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      const errorPayload = error.response ? JSON.stringify(error.response.data) : error.message;
      
      // BullMQ tracks attemptsMade BEFORE the job succeeds/fails for this run.
      // E.g., first run is attemptsMade=1. So if opts.attempts is 10, final run is attemptsMade=10
      const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 10);
      
      await this.prisma.operatorTransaction.update({
        where: { transactionId },
        data: {
          retries: job.attemptsMade,
          status: isFinalAttempt ? 'FAILED' : 'PENDING',
          responsePayload: errorPayload
        }
      });

      if (isFinalAttempt) {
        await this.prisma.systemAlert.create({
          data: {
            type: 'CRITICAL',
            message: `Operator Webhook failed completely after max retries for txn ${transactionId}. URL: ${url}`,
            source: 'WEBHOOK_SERVICE',
            operatorId: operatorId
          }
        });
        this.logger.error(`Webhook FAILED max retries for txn ${transactionId}`);
      } else {
        this.logger.warn(`Webhook failed for txn ${transactionId}, retrying (Attempt ${job.attemptsMade}) - Error: ${error.message}`);
      }

      // Throw to BullMQ to trigger backoff
      throw error;
    }
  }
}
