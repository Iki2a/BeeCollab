import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { MeetingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SignalingGateway } from '../signaling/signaling.gateway';

@Injectable()
export class MeetingsCleanupService {
  private readonly logger = new Logger(MeetingsCleanupService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalingGateway: SignalingGateway,
  ) { }

  @Interval(30000)
  async closeExpiredMeetings() {
    if (this.running) return;

    this.running = true;
    try {
      const now = new Date();
      const meetings = await this.prisma.meeting.findMany({
        where: { status: MeetingStatus.LIVE, startedAt: { not: null } },
        select: { id: true, startedAt: true, duration: true },
      });

      const expired = meetings.filter((meeting) => {
        if (!meeting.startedAt) return false;
        const endsAt = new Date(
          meeting.startedAt.getTime() + meeting.duration * 60_000,
        );
        return endsAt <= now;
      });

      for (const meeting of expired) {
        this.signalingGateway.emitMeetingEnded(
          meeting.id,
          'Pertemuan berakhir karena durasi habis.',
        );

        await this.prisma.$transaction([
          this.prisma.participant.deleteMany({
            where: { meetingId: meeting.id },
          }),
          this.prisma.chatMessage.deleteMany({ where: { meetingId: meeting.id } }),
          this.prisma.meeting.delete({ where: { id: meeting.id } }),
        ]);
      }

      if (expired.length > 0) {
        this.logger.log(`Auto-ended ${expired.length} meeting(s)`);
      }
    } finally {
      this.running = false;
    }
  }
}
