import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { MeetingsCleanupService } from './meetings.cleanup.service';
import { SignalingModule } from '../signaling/signaling.module';

@Module({
  imports: [SignalingModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsCleanupService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
