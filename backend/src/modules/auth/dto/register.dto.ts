// backend/src/modules/auth/dto/register.dto.ts
import { IsString, IsNotEmpty, IsEmail, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'Mobile number must be 10 digits' })
  mobile!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
