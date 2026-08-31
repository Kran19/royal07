// backend/src/common/guards/auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // If it is a UUID (B2B session token)
      if (token && token.length === 36 && token.includes('-')) {
        const session = await this.prisma.userSession.findFirst({
          where: {
            token: token,
            expiresAt: { gt: new Date() }
          },
          include: { user: true }
        });

        if (session && session.user) {
          request.user = {
            userId: session.user.id,
            username: session.user.username,
            role: session.user.role
          };
          return true;
        }
      }
    }

    // Otherwise, fall back to standard JWT strategy
    const result = await super.canActivate(context);
    return result as boolean;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Invalid or missing token',
        }
      });
    }
    return user;
  }
}
