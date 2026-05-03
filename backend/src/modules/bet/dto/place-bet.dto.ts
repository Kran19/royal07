import { IsEnum, IsNumber, IsArray, Min, Max, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { BetType } from '../../../common/enums';

export class PlaceBetDto {
  @IsEnum(BetType)
  betType!: BetType;

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  numbers!: number[];

  @IsNumber()
  @Min(10)
  @Max(100000)
  amount!: number;
}
