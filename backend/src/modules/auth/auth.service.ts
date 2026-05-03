// backend/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    // Check existing mobile
    const existingMobile = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
    if (existingMobile) {
      throw new ConflictException({ success: false, error: { message: 'Mobile number already registered' } });
    }
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        mobile: dto.mobile,
        passwordHash,
        balance: 10000, // 💸 10,000 Welcome Bonus
      }
    });

    // Create a transaction record for the welcome bonus
    await this.prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'ADJUSTMENT',
        amount: new Decimal(10000) as any,
        balanceBefore: new Decimal(0) as any,
        balanceAfter: new Decimal(10000) as any,
        status: 'COMPLETED',
        description: 'Welcome Bonus'
      }
    });

    return this.generateTokenResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
    
    if (!user) {
      throw new UnauthorizedException({ success: false, error: { message: 'Invalid credentials' } });
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({ success: false, error: { message: 'Invalid credentials' } });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({ success: false, error: { message: 'Account is inactive' } });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return this.generateTokenResponse(user);
  }

  async logout(userId: string, token: string) {
    await this.prisma.userSession.deleteMany({
      where: { token }
    });
    return { success: true };
  }

  private async generateTokenResponse(user: any) {
    try {
      console.log('Generating token for user:', user.id);
      const payload = { sub: user.id, mobile: user.mobile, role: user.role };
      const token = this.jwtService.sign(payload);
      console.log('Token signed.');
      
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded) throw new Error('Token decode failed');
      console.log('Token decoded.');

      // 🛡️ Robust Expiry Calculation
      const expInMs = decoded.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
      const expiresAt = new Date(expInMs);
      
      if (isNaN(expiresAt.getTime())) {
        throw new Error('Invalid expiration date generated');
      }

      await this.prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          expiresAt
        }
      });
      console.log('Session created.');

      return {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            mobile: user.mobile,
            username: user.username,
            role: user.role,
            balance: user.balance,
          },
          expiresAt: expiresAt.toISOString(),
        }
      };
    } catch (err: any) {
      console.error('CRITICAL: generateTokenResponse error:', err.message);
      throw err;
    }
  }
}
