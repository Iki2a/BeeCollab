import { Inject, Injectable } from '@nestjs/common';
import { POLL_REPOSITORY } from '../repositories/tokens';
import type { IPollRepository, CreatePollData } from '../repositories/interfaces/poll.repository.interface';

@Injectable()
export class PollService {
  constructor(
    @Inject(POLL_REPOSITORY)
    private readonly pollRepository: IPollRepository,
  ) {}

  async createPoll(meetingId: string, question: string, options: string[]) {
    const data: CreatePollData = {
      meetingId,
      question,
      options: options.map((text) => ({ text })),
    };
    return this.pollRepository.create(data);
  }

  async getPolls(meetingId: string) {
    return this.pollRepository.findByMeetingId(meetingId);
  }

  async closePoll(pollId: string) {
    return this.pollRepository.update(pollId, { isActive: false });
  }

  async vote(userId: string, pollId: string, optionId: string) {
    return this.pollRepository.vote(userId, pollId, optionId);
  }
}
