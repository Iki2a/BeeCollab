import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IAgendaRepository,
  AgendaEntity,
  CreateAgendaData,
} from '../interfaces/agenda.repository.interface';

@Injectable()
export class PrismaAgendaRepository implements IAgendaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(data: CreateAgendaData[]): Promise<void> {
    await this.prisma.agenda.createMany({ data });
  }

  async findByMeetingId(meetingId: string): Promise<AgendaEntity[]> {
    return this.prisma.agenda.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });
  }

  async findById(id: string): Promise<AgendaEntity | null> {
    return this.prisma.agenda.findUnique({ where: { id } });
  }

  async update(id: string, data: Partial<AgendaEntity>): Promise<AgendaEntity> {
    return this.prisma.agenda.update({
      where: { id },
      data,
    });
  }

  async setActive(meetingId: string, agendaId: string): Promise<AgendaEntity> {
    await this.prisma.agenda.updateMany({
      where: { meetingId },
      data: { isActive: false },
    });
    return this.prisma.agenda.update({
      where: { id: agendaId },
      data: { isActive: true, startTime: new Date() },
    });
  }

  async deleteByMeetingId(meetingId: string): Promise<void> {
    await this.prisma.agenda.deleteMany({ where: { meetingId } });
  }
}
