import {
  IsString,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(500)
  maxParticipants?: number;
}

export class JoinMeetingDto {
  @IsString()
  roomCode: string;
}
