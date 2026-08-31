import { Controller, Post, Get, Body, UseGuards, HttpCode, Query, Param, Patch } from '@nestjs/common';
import { OperatorService, LoginOperatorDto } from './operator.service';
import { OperatorSignatureGuard } from './operator.guard';
import { JwtAuthGuard } from '../../common/guards/auth.guard';

class CreateOperatorDto {
  name: string;
  operatorId: string;
  publicKey: string;
  callbackUrl: string;
  allowedIps?: string[];
  revSharePercent?: number;
}

@Controller('operator')
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(OperatorSignatureGuard)
  async login(@Body() loginDto: LoginOperatorDto) {
    return this.operatorService.processOperatorLogin(loginDto);
  }

  // --- Admin Endpoints ---

  @Get('list')
  @UseGuards(JwtAuthGuard)
  async listOperators() {
    return {
      success: true,
      data: await this.operatorService.listOperators()
    };
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createOperator(@Body() dto: CreateOperatorDto) {
    try {
      const operator = await this.operatorService.createOperator(dto);
      return { success: true, data: operator };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getOperatorTransactions(@Query() query: any) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    return {
      success: true,
      data: await this.operatorService.getOperatorTransactions(query.operatorId, page, limit, query.status, query.type)
    };
  }

  @Get(':id/transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactionsForOperator(@Param('id') id: string, @Query() query: any) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    return {
      success: true,
      data: await this.operatorService.getOperatorTransactions(id, page, limit, query.status, query.type)
    };
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  async getOperatorStats(@Param('id') id: string) {
    try {
      return {
        success: true,
        data: await this.operatorService.getOperatorStats(id)
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @Get('profit-summary')
  @UseGuards(JwtAuthGuard)
  async getProfitSummary() {
    return {
      success: true,
      data: await this.operatorService.getAllOperatorProfitSummary()
    };
  }

  @Post('transactions/:txnId/retry')
  @UseGuards(JwtAuthGuard)
  async retryTransaction(@Param('txnId') txnId: string) {
    try {
      const result = await this.operatorService.retryFailedTransaction(txnId);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateOperator(@Param('id') id: string, @Body() data: any) {
    try {
      const updated = await this.operatorService.updateOperator(id, data);
      return { success: true, data: updated };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
