import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IPollRepository,
  PollWithDetails,
  CreatePollData,
} from '../interfaces/poll.repository.interface';
import { Poll, PollResponse } from '@prisma/client';

@Injectable()
export class PrismaPollRepository implements IPollRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePollData): Promise<PollWithDetails> {
    return this.prisma.poll.create({
      data: {
        meetingId: data.meetingId,
        question: data.question,
        options: {
          create: data.options.map((opt) => ({ text: opt.text })),
        },
      },
      include: {
        options: {
          include: { responses: true },
        },
      },
    }) as Promise<PollWithDetails>;
  }

  async findById(id: string): Promise<PollWithDetails | null> {
    return this.prisma.poll.findUnique({
      where: { id },
      include: {
        options: {
          include: { responses: true },
        },
      },
    }) as Promise<PollWithDetails | null>;
  }

  async findByMeetingId(meetingId: string): Promise<PollWithDetails[]> {
    return this.prisma.poll.findMany({
      where: { meetingId },
      include: {
        options: {
          include: { responses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<PollWithDetails[]>;
  }

  async update(id: string, data: { isActive: boolean }): Promise<Poll> {
    return this.prisma.poll.update({
      where: { id },
      data,
    });
  }

  async vote(userId: string, pollId: string, optionId: string): Promise<PollResponse> {
    return this.prisma.pollResponse.upsert({
      where: { pollId_userId: { pollId, userId } },
      update: { optionId },
      create: { pollId, optionId, userId },
    });
  }
}
