import { Inject, Injectable } from '@nestjs/common';
import { REACTION_REPOSITORY } from '../repositories/tokens';
import type { IReactionRepository } from '../repositories/interfaces/reaction.repository.interface';

@Injectable()
export class ReactionService {
  constructor(
    @Inject(REACTION_REPOSITORY)
    private readonly reactionRepository: IReactionRepository,
  ) {}

  async sendReaction(meetingId: string, type: string, userId?: string) {
    return this.reactionRepository.create(meetingId, type, userId);
  }

  async getAggregatedReactions(meetingId: string) {
    return this.reactionRepository.findAggregated(meetingId);
  }

  async clearReactions(meetingId: string) {
    return this.reactionRepository.deleteByMeetingId(meetingId);
  }
}
