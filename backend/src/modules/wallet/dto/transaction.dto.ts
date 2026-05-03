import { IsNumber, Min } from 'class-validator';

export class TransactionDto {
  @IsNumber()
  @Min(10)
  amount!: number;
}
