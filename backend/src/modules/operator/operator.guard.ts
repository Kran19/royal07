import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class OperatorSignatureGuard implements CanActivate {
  private readonly logger = new Logger(OperatorSignatureGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['signature'] as string;
    
    if (!signature) {
      this.logger.warn('Missing Signature header');
      throw new UnauthorizedException('Missing Signature header');
    }

    const body = request.body;
    if (!body || !body.operatorId) {
      this.logger.warn('Missing operatorId in request body');
      throw new UnauthorizedException('Missing operatorId in request body');
    }

    const operator = await this.prisma.operator.findUnique({
      where: { operatorId: body.operatorId },
    });

    if (!operator) {
      this.logger.warn(`Unknown operatorId: ${body.operatorId}`);
      throw new UnauthorizedException('Unknown operator');
    }

    if (operator.status !== 'ACTIVE') {
      this.logger.warn(`Operator ${operator.operatorId} is not ACTIVE`);
      throw new UnauthorizedException('Operator inactive');
    }

    // IP Whitelist check (if any are configured)
    if (operator.allowedIps && operator.allowedIps.length > 0) {
      let clientIp = request.ip || request.connection?.remoteAddress || '';
      
      // Clean IPv6 mapped IPv4 address (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
      }

      // Allow 0.0.0.0 or * to mean "allow all"
      const allowsAny = operator.allowedIps.includes('0.0.0.0') || 
                        operator.allowedIps.includes('*') || 
                        operator.allowedIps.includes('0.0.0.0/0');

      if (!allowsAny && !operator.allowedIps.includes(clientIp)) {
        this.logger.warn(`IP ${clientIp} not in whitelist for operator ${operator.operatorId}`);
        throw new UnauthorizedException('IP not whitelisted');
      }
    }

    // Verify RSA-SHA256 signature
    try {
      const rawBody = request.rawBody; // Populated by NestJS because rawBody: true is in main.ts
      if (!rawBody) {
        this.logger.error('rawBody is not available on the request. Make sure NestFactory is configured with rawBody: true');
        throw new UnauthorizedException('Unable to verify signature (raw body missing)');
      }

      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(rawBody);
      
      const isVerified = verifier.verify(operator.publicKey, signature, 'base64');
      
      if (!isVerified) {
        this.logger.warn(`Invalid signature for operator ${operator.operatorId}`);
        throw new UnauthorizedException('Invalid signature');
      }

      // Attach operator to request for use in controllers
      request.operator = operator;
      return true;
    } catch (error) {
      this.logger.error(`Error verifying signature: ${error.stack}`);
      throw new UnauthorizedException(`Signature verification failed: ${error.message}`);
    }
  }
}
