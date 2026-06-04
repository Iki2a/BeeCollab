import { Reaction } from '@prisma/client';

export interface IReactionRepository {
  create(meetingId: string, type: string, userId?: string): Promise<Reaction>;
  findAggregated(meetingId: string): Promise<{ type: string; count: number }[]>;
  deleteByMeetingId(meetingId: string): Promise<void>;
}
