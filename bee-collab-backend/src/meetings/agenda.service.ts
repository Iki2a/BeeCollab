import { Inject, Injectable } from '@nestjs/common';
import { AGENDA_REPOSITORY } from '../repositories/tokens';
import type { IAgendaRepository, CreateAgendaData } from '../repositories/interfaces/agenda.repository.interface';

@Injectable()
export class AgendaService {
  constructor(
    @Inject(AGENDA_REPOSITORY)
    private readonly agendaRepository: IAgendaRepository,
  ) {}

  async createAgendas(meetingId: string, items: { title: string; duration: number }[]) {
    const data: CreateAgendaData[] = items.map((item, index) => ({
      meetingId,
      title: item.title,
      duration: item.duration,
      order: index,
    }));
    await this.agendaRepository.createMany(data);
    return this.agendaRepository.findByMeetingId(meetingId);
  }

  async getAgendas(meetingId: string) {
    return this.agendaRepository.findByMeetingId(meetingId);
  }

  async startAgendaItem(meetingId: string, agendaId: string) {
    return this.agendaRepository.setActive(meetingId, agendaId);
  }

  async updateAgendaItem(agendaId: string, data: { title?: string; duration?: number; order?: number }) {
    return this.agendaRepository.update(agendaId, data);
  }
}
