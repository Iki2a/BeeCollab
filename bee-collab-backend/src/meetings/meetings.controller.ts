import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto, JoinMeetingDto } from './dto/meeting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface AuthRequest extends Request {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  /** POST /meetings — Create a new meeting */
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateMeetingDto) {
    return this.meetingsService.createMeeting(req.user.id, dto);
  }

  /** GET /meetings — List my meetings */
  @Get()
  myMeetings(@Req() req: AuthRequest) {
    return this.meetingsService.getMyMeetings(req.user.id);
  }

  /** GET /meetings/:meetingId */
  @Get(':meetingId')
  findOne(@Param('meetingId') meetingId: string) {
    return this.meetingsService.getMeetingById(meetingId);
  }

  /** POST /meetings/:meetingId/join */
  @Post(':meetingId/join')
  join(
    @Req() req: AuthRequest,
    @Param('meetingId') meetingId: string,
    @Body() dto: JoinMeetingDto,
  ) {
    return this.meetingsService.joinMeeting(req.user.id, meetingId, dto);
  }

  /** GET /meetings/:meetingId/participants */
  @Get(':meetingId/participants')
  participants(@Param('meetingId') meetingId: string) {
    return this.meetingsService.getParticipants(meetingId);
  }

  /** DELETE /meetings/:meetingId — End a meeting (HOST only) */
  @Delete(':meetingId')
  end(@Req() req: AuthRequest, @Param('meetingId') meetingId: string) {
    return this.meetingsService.endMeeting(req.user.id, meetingId);
  }
}
