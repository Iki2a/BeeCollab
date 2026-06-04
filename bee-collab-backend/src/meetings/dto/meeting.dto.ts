import {
  IsString,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMeetingDto {
  @ApiProperty({ example: 'Daily Standup', description: 'Meeting title (min 3 chars)' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ example: 10, description: 'Max participants allowed (2–500)', minimum: 2, maximum: 500, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(500)
  maxParticipants?: number;

  @ApiPropertyOptional({ example: 60, description: 'Meeting duration in minutes (1–1440)', minimum: 1, maximum: 1440, default: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  duration?: number;
}

export class JoinMeetingDto {
  @ApiProperty({ example: 'A1B2C3D4', description: '8-character room code shown in the meeting' })
  @IsString()
  roomCode: string;
}
