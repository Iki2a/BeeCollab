import { Agenda } from '@prisma/client';

export type AgendaEntity = Agenda;

export interface CreateAgendaData {
  meetingId: string;
  title: string;
  duration: number;
  order: number;
}

export interface IAgendaRepository {
  createMany(data: CreateAgendaData[]): Promise<void>;
  findByMeetingId(meetingId: string): Promise<AgendaEntity[]>;
  findById(id: string): Promise<AgendaEntity | null>;
  update(id: string, data: Partial<AgendaEntity>): Promise<AgendaEntity>;
  setActive(meetingId: string, agendaId: string): Promise<AgendaEntity>;
  deleteByMeetingId(meetingId: string): Promise<void>;
}
