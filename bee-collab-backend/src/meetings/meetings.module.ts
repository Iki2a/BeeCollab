import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { MeetingsCleanupService } from './meetings.cleanup.service';
import { SignalingModule } from '../signaling/signaling.module';
<<<<<<< HEAD
import { AgendaService } from './agenda.service';
import { PollService } from './poll.service';
import { ReactionService } from './reaction.service';
=======
>>>>>>> d04c33778cc98a2c431fcf6907730064dd5707e4

@Module({
  imports: [SignalingModule],
  controllers: [MeetingsController],
<<<<<<< HEAD
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
=======
  providers: [MeetingsService, MeetingsCleanupService],
  exports: [MeetingsService],
})
export class MeetingsModule { }
>>>>>>> d04c33778cc98a2c431fcf6907730064dd5707e4
