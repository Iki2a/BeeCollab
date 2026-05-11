import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto, JoinMeetingDto } from './dto/meeting.dto';
import { randomBytes } from 'crypto';
import { MeetingStatus, ParticipantRole } from '@prisma/client';

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Generate a short, unique, readable room code */
  private generateRoomCode(): string {
    return randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"
  }

  async createMeeting(hostId: string, dto: CreateMeetingDto) {
    const roomCode = this.generateRoomCode();

    const meeting = await this.prisma.meeting.create({
      data: {
        title: dto.title,
        roomCode,
        hostId,
        maxParticipants: dto.maxParticipants ?? 10,
        duration: dto.duration ?? 15,
        status: MeetingStatus.SCHEDULED,
        participants: {
          create: {
            userId: hostId,
            role: ParticipantRole.HOST,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    return meeting;
  }

  async joinMeeting(userId: string, meetingId: string, dto: JoinMeetingDto) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { participants: true },
    });

    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.status === MeetingStatus.ENDED)
      throw new BadRequestException('Meeting has ended');
    if (meeting.roomCode !== dto.roomCode)
      throw new ForbiddenException('Invalid room code');
    if (meeting.participants.length >= meeting.maxParticipants)
      throw new BadRequestException('Meeting is full');

    // Upsert participant (handles re-join case)
    const participant = await this.prisma.participant.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      create: { meetingId, userId, role: ParticipantRole.PARTICIPANT },
      update: { leftAt: null }, // re-activate if they left before
    });

    return { meeting, participant };
  }

  async getParticipants(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.participant.findMany({
      where: { meetingId, leftAt: null },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async endMeeting(hostId: string, meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.hostId !== hostId)
      throw new ForbiddenException('Only the host can end the meeting');

    await this.prisma.participant.deleteMany({ where: { meetingId } });
    await this.prisma.chatMessage.deleteMany({ where: { meetingId } });

    return this.prisma.meeting.delete({
      where: { id: meetingId },
    });
  }

  async getMyMeetings(hostId: string) {
    return this.prisma.meeting.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMeetingById(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        host: { select: { id: true, name: true, avatarUrl: true } },
        participants: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }
}
