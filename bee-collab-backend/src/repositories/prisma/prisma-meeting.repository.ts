import { Injectable } from '@nestjs/common';
import { MeetingStatus, ParticipantRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IMeetingRepository,
  MeetingEntity,
  MeetingWithParticipants,
  MeetingWithDetails,
  MeetingLiveSummary,
  CreateMeetingData,
} from '../interfaces/meeting.repository.interface';

const PARTICIPANT_WITH_USER = {
  include: {
    user: { select: { id: true, name: true, avatarUrl: true } },
  },
};

const MEETING_WITH_PARTICIPANTS = {
  include: {
    participants: PARTICIPANT_WITH_USER,
  },
};

const MEETING_WITH_DETAILS = {
  include: {
    host: { select: { id: true, name: true, avatarUrl: true } },
    participants: {
      where: { leftAt: null },
      ...PARTICIPANT_WITH_USER,
    },
  },
};

@Injectable()
export class PrismaMeetingRepository implements IMeetingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMeetingData): Promise<MeetingWithParticipants> {
    return this.prisma.meeting.create({
      data: {
        title: data.title,
        roomCode: data.roomCode,
        hostId: data.hostId,
        maxParticipants: data.maxParticipants,
        duration: data.duration,
        status: data.status,
        participants: {
          create: { userId: data.hostId, role: ParticipantRole.HOST },
        },
      },
      ...MEETING_WITH_PARTICIPANTS,
    }) as Promise<MeetingWithParticipants>;
  }

  async findById(id: string): Promise<MeetingEntity | null> {
    return this.prisma.meeting.findUnique({ where: { id } });
  }

  async findByIdWithParticipants(id: string): Promise<MeetingWithParticipants | null> {
    return this.prisma.meeting.findUnique({
      where: { id },
      ...MEETING_WITH_PARTICIPANTS,
    }) as Promise<MeetingWithParticipants | null>;
  }

  async findByIdWithDetails(id: string): Promise<MeetingWithDetails | null> {
    return this.prisma.meeting.findUnique({
      where: { id },
      ...MEETING_WITH_DETAILS,
    }) as Promise<MeetingWithDetails | null>;
  }

  async findByRoomCode(roomCode: string): Promise<MeetingWithDetails | null> {
    return this.prisma.meeting.findUnique({
      where: { roomCode },
      ...MEETING_WITH_DETAILS,
    }) as Promise<MeetingWithDetails | null>;
  }

  async findByHostId(hostId: string): Promise<MeetingEntity[]> {
    return this.prisma.meeting.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLiveMeetings(): Promise<MeetingLiveSummary[]> {
    return this.prisma.meeting.findMany({
      where: { status: MeetingStatus.LIVE, startedAt: { not: null } },
      select: { id: true, startedAt: true, duration: true },
    });
  }

  async updateManyStatus(where: object, data: object): Promise<void> {
    await this.prisma.meeting.updateMany({ where, data });
  }

  async delete(id: string): Promise<MeetingEntity> {
    return this.prisma.meeting.delete({ where: { id } });
  }
}
