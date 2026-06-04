import { Poll, PollOption, PollResponse } from '@prisma/client';

export interface PollOptionWithResponses extends PollOption {
  responses: PollResponse[];
}

export interface PollWithDetails extends Poll {
  options: PollOptionWithResponses[];
}

export interface CreatePollData {
  meetingId: string;
  question: string;
  options: { text: string }[];
}

export interface IPollRepository {
  create(data: CreatePollData): Promise<PollWithDetails>;
  findById(id: string): Promise<PollWithDetails | null>;
  findByMeetingId(meetingId: string): Promise<PollWithDetails[]>;
  update(id: string, data: { isActive: boolean }): Promise<Poll>;
  vote(userId: string, pollId: string, optionId: string): Promise<PollResponse>;
}
