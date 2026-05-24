import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'Display name (min 2 chars)' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'secret123', description: 'Password (min 6 chars)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', description: 'Optional avatar URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'Registered email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', description: 'Account password' })
  @IsString()
  password: string;
}
