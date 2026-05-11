import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingStatus } from '@prisma/client';

@Injectable()
export class SignalingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Called on `meeting:join` WS event.
   * Updates participant socketId and sets meeting LIVE if it's still SCHEDULED.
   */
  async handleJoin(meetingId: string, userId: string, socketId: string) {
    const [participant] = await Promise.all([
      this.prisma.participant.upsert({
        where: { meetingId_userId: { meetingId, userId } },
        create: { meetingId, userId, socketId, role: 'PARTICIPANT' },
        update: { socketId, leftAt: null },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      // Auto-start meeting when first real participant joins
      this.prisma.meeting.updateMany({
        where: { id: meetingId, status: MeetingStatus.SCHEDULED },
        data: { status: MeetingStatus.LIVE, startedAt: new Date() },
      }),
    ]);
    return participant;
  }

  /**
   * Called on WS `disconnect`.
   * Nullifies socketId and sets leftAt timestamp.
   */
  async handleDisconnect(socketId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { socketId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!participant) return null;

    await this.prisma.participant.update({
      where: { id: participant.id },
      data: { socketId: null, leftAt: new Date() },
    });

    return participant;
  }

  /**
   * Toggle audio or video for a participant and persist to DB.
   */
  async toggleMedia(
    meetingId: string,
    userId: string,
    type: 'audio' | 'video',
    enabled: boolean,
  ) {
    return this.prisma.participant.update({
      where: { meetingId_userId: { meetingId, userId } },
      data:
        type === 'audio'
          ? { audioEnabled: enabled }
          : { videoEnabled: enabled },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * End meeting — only HOST can call this.
   */
  async endMeeting(meetingId: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting || meeting.hostId !== userId) return null;

    return this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.ENDED, endedAt: new Date() },
    });
  }
}
