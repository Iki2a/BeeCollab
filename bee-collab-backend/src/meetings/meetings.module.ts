import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { MeetingsCleanupService } from './meetings.cleanup.service';
import { SignalingModule } from '../signaling/signaling.module';
import { MeetingFeaturesModule } from './meeting-features.module';

@Module({
  imports: [SignalingModule, MeetingFeaturesModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsCleanupService],
  exports: [MeetingsService, MeetingFeaturesModule],
})
export class MeetingsModule {}
