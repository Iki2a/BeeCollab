import { MeetingStatus, ParticipantRole } from '@prisma/client';

export interface MeetingEntity {
  id: string;
  title: string;
  roomCode: string;
  hostId: string;
  status: MeetingStatus;
  maxParticipants: number;
  duration: number;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}

export interface MeetingParticipantSummary {
  id: string;
  userId: string;
  role: ParticipantRole;
  leftAt: Date | null;
  user: { id: string; name: string; avatarUrl: string | null };
}

export interface MeetingWithParticipants extends MeetingEntity {
  participants: MeetingParticipantSummary[];
}

export interface MeetingWithDetails extends MeetingWithParticipants {
  host: { id: string; name: string; avatarUrl: string | null };
}

export interface MeetingLiveSummary {
  id: string;
  startedAt: Date | null;
  duration: number;
}

export interface CreateMeetingData {
  title: string;
  roomCode: string;
  hostId: string;
  maxParticipants: number;
  duration: number;
  status: MeetingStatus;
}

export interface IMeetingRepository {
  create(data: CreateMeetingData): Promise<MeetingWithParticipants>;
  findById(id: string): Promise<MeetingEntity | null>;
  findByIdWithParticipants(id: string): Promise<MeetingWithParticipants | null>;
  findByIdWithDetails(id: string): Promise<MeetingWithDetails | null>;
  findByRoomCode(roomCode: string): Promise<MeetingWithDetails | null>;
  findByHostId(hostId: string): Promise<MeetingEntity[]>;
  findLiveMeetings(): Promise<MeetingLiveSummary[]>;
  updateManyStatus(where: object, data: object): Promise<void>;
  delete(id: string): Promise<MeetingEntity>;
}
