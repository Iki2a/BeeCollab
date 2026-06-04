import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { MeetingsCleanupService } from './meetings.cleanup.service';
import { SignalingModule } from '../signaling/signaling.module';
import { AgendaService } from './agenda.service';
import { PollService } from './poll.service';
import { ReactionService } from './reaction.service';

@Module({
  imports: [SignalingModule],
  controllers: [MeetingsController],
  providers: [
    MeetingsService,
    MeetingsCleanupService,
    AgendaService,
    PollService,
    ReactionService,
  ],
  exports: [MeetingsService, AgendaService, PollService, ReactionService],
})
export class MeetingsModule {}
