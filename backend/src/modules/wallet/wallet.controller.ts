import { Controller, Get, Post, Body, Req, UseGuards, Param, UseInterceptors, UploadedFile, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionStatus } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { WalletService } from './wallet.service';
import { TransactionDto } from './dto/transaction.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.walletService.getBalance(userId);
  }

  @Post('deposit')
  async deposit(@Req() req: Request, @Body() dto: TransactionDto) {
    const userId = (req.user as any).userId;
    return this.walletService.deposit(userId, dto);
  }

  @Post('deposit/:id/proof')
  @UseInterceptors(FileInterceptor('proof', {
    storage: diskStorage({
      destination: './uploads/proofs',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new BadRequestException('Only image files are allowed!'), false);
      }
      callback(null, true);
    }
  }))
  async uploadProof(
    @Req() req: Request,
    @Param('id') transactionId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('Image proof is required');
    }
    const userId = (req.user as any).userId;
    return this.walletService.uploadProof(userId, transactionId, file);
  }

  @Post('withdraw')
  async withdraw(@Req() req: Request, @Body() dto: TransactionDto) {
    const userId = (req.user as any).userId;
    return this.walletService.withdraw(userId, dto);
  }

  @Get('history')
  async getHistory(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.walletService.getHistory(userId);
  }

  // --- Admin Endpoints ---

  @Get('admin/deposits')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getAdminDeposits(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: TransactionStatus,
  ) {
    return this.walletService.getAdminTransactions(
      'DEPOSIT',
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      status,
    );
  }

  @Get('admin/withdrawals')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getAdminWithdrawals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: TransactionStatus,
  ) {
    return this.walletService.getAdminTransactions(
      'WITHDRAW',
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      status,
    );
  }

  @Get('admin/transactions')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getAllAdminTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: string,
  ) {
    return this.walletService.getAllAdminTransactions(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      status,
      type
    );
  }

  @Post('admin/:id/:action')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async processTransaction(
    @Param('id') id: string,
    @Param('action') action: 'approve' | 'reject',
    @Body('adminNote') adminNote?: string
  ) {
    return this.walletService.processTransaction(id, action, adminNote);
  }
}
