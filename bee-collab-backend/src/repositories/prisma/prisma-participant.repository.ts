import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IParticipantRepository,
  ParticipantEntity,
  ParticipantWithUser,
  CreateParticipantData,
  UpdateParticipantData,
} from '../interfaces/participant.repository.interface';

const WITH_USER = {
  include: {
    user: { select: { id: true, name: true, avatarUrl: true } },
  },
};

@Injectable()
export class PrismaParticipantRepository implements IParticipantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    meetingId: string,
    userId: string,
    create: CreateParticipantData,
    update: UpdateParticipantData,
  ): Promise<ParticipantWithUser> {
    return this.prisma.participant.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      create,
      update,
      ...WITH_USER,
    }) as Promise<ParticipantWithUser>;
  }

  async findBySocketId(socketId: string): Promise<ParticipantWithUser | null> {
    return this.prisma.participant.findFirst({
      where: { socketId },
      ...WITH_USER,
    }) as Promise<ParticipantWithUser | null>;
  }

  async findByMeetingAndUser(
    meetingId: string,
    userId: string,
  ): Promise<ParticipantWithUser | null> {
    return this.prisma.participant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
      ...WITH_USER,
    }) as Promise<ParticipantWithUser | null>;
  }

  async findFirstByMeeting(
    meetingId: string,
    where: Partial<ParticipantEntity>,
  ): Promise<ParticipantWithUser | null> {
    return this.prisma.participant.findFirst({
      where: { meetingId, ...where },
      ...WITH_USER,
    }) as Promise<ParticipantWithUser | null>;
  }

  async findManyByMeeting(
    meetingId: string,
    activeOnly = false,
  ): Promise<ParticipantWithUser[]> {
    return this.prisma.participant.findMany({
      where: { meetingId, ...(activeOnly ? { leftAt: null } : {}) },
      ...WITH_USER,
    }) as Promise<ParticipantWithUser[]>;
  }

  async update(id: string, data: UpdateParticipantData): Promise<ParticipantWithUser> {
    return this.prisma.participant.update({
      where: { id },
      data,
      ...WITH_USER,
    }) as Promise<ParticipantWithUser>;
  }

  async updateByMeetingAndUser(
    meetingId: string,
    userId: string,
    data: UpdateParticipantData,
  ): Promise<ParticipantWithUser> {
    return this.prisma.participant.update({
      where: { meetingId_userId: { meetingId, userId } },
      data,
      ...WITH_USER,
    }) as Promise<ParticipantWithUser>;
  }

  async deleteMany(meetingId: string): Promise<void> {
    await this.prisma.participant.deleteMany({ where: { meetingId } });
  }
}
