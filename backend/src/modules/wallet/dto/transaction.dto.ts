import { IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class TransactionDto {
  @IsNumber()
  @Min(10)
  amount!: number;

  @IsOptional()
  @IsString()
  upiOrAccount?: string;
}
