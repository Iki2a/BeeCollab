import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingStatus, ParticipantRole } from '@prisma/client';

@Injectable()
export class SignalingService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Called on `meeting:join` WS event.
   * Updates participant socketId and sets meeting LIVE if it's still SCHEDULED.
   */
  async handleJoin(meetingId: string, userId: string, socketId: string, audioEnabled?: boolean, videoEnabled?: boolean) {
    const [participant] = await Promise.all([
      this.prisma.participant.upsert({
        where: { meetingId_userId: { meetingId, userId } },
        create: {
          meetingId,
          userId,
          socketId,
          role: 'PARTICIPANT',
          audioEnabled: audioEnabled ?? true,
          videoEnabled: videoEnabled ?? true
        },
        update: {
          socketId,
          leftAt: null,
          ...(audioEnabled !== undefined ? { audioEnabled } : {}),
          ...(videoEnabled !== undefined ? { videoEnabled } : {})
        },
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

  async getParticipantRole(meetingId: string, userId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
      select: { role: true },
    });
    return participant?.role ?? null;
  }

  async isHost(meetingId: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { hostId: true },
    });
    return Boolean(meeting && meeting.hostId === userId);
  }

  async isHostOrCoHost(meetingId: string, userId: string) {
    const role = await this.getParticipantRole(meetingId, userId);
    if (role === 'HOST' || role === 'CO_HOST') return true;
    return this.isHost(meetingId, userId);
  }

  async setParticipantRole(meetingId: string, targetUserId: string, role: ParticipantRole) {
    return this.prisma.participant.update({
      where: { meetingId_userId: { meetingId, userId: targetUserId } },
      data: { role },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async kickParticipant(meetingId: string, targetSocketId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { meetingId, socketId: targetSocketId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!participant) return null;

    await this.prisma.participant.update({
      where: { id: participant.id },
      data: { socketId: null, leftAt: new Date() },
    });

    return participant;
  }

  async getParticipantBySocketId(meetingId: string, targetSocketId: string) {
    return this.prisma.participant.findFirst({
      where: { meetingId, socketId: targetSocketId },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async forceMuteParticipant(meetingId: string, targetSocketId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { meetingId, socketId: targetSocketId },
    });
    if (!participant) return null;

    return this.prisma.participant.update({
      where: { id: participant.id },
      data: { audioEnabled: false },
      include: { user: { select: { id: true, name: true } } },
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

    await this.prisma.participant.deleteMany({ where: { meetingId } });
    await this.prisma.chatMessage.deleteMany({ where: { meetingId } });

    return this.prisma.meeting.delete({
      where: { id: meetingId },
    });
  }
}
