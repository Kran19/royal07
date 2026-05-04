// backend/src/modules/auth/dto/register.dto.ts
import { IsString, IsNotEmpty, MinLength, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'Mobile number must be 10 digits' })
  mobile!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
