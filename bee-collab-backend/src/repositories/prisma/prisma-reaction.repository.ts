import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IReactionRepository } from '../interfaces/reaction.repository.interface';
import { Reaction } from '@prisma/client';

@Injectable()
export class PrismaReactionRepository implements IReactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(meetingId: string, type: string, userId?: string): Promise<Reaction> {
    return this.prisma.reaction.create({
      data: { meetingId, type, userId },
    });
  }

  async findAggregated(meetingId: string): Promise<{ type: string; count: number }[]> {
    const result = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { meetingId },
      _count: { type: true },
    });
    return result.map((r) => ({ type: r.type, count: r._count.type }));
  }

  async deleteByMeetingId(meetingId: string): Promise<void> {
    await this.prisma.reaction.deleteMany({ where: { meetingId } });
  }
}
