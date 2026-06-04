import { ParticipantRole } from '@prisma/client';

export interface ParticipantEntity {
  id: string;
  meetingId: string;
  userId: string;
  socketId: string | null;
  role: ParticipantRole;
  audioEnabled: boolean;
  videoEnabled: boolean;
<<<<<<< HEAD
  handRaisedAt: Date | null;
=======
>>>>>>> d04c33778cc98a2c431fcf6907730064dd5707e4
  leftAt: Date | null;
}

export interface ParticipantWithUser extends ParticipantEntity {
  user: { id: string; name: string; avatarUrl: string | null };
}

export interface CreateParticipantData {
  meetingId: string;
  userId: string;
  socketId?: string | null;
  role: ParticipantRole;
  audioEnabled: boolean;
  videoEnabled: boolean;
<<<<<<< HEAD
  handRaisedAt?: Date | null;
=======
>>>>>>> d04c33778cc98a2c431fcf6907730064dd5707e4
}

export interface UpdateParticipantData {
  socketId?: string | null;
  leftAt?: Date | null;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  role?: ParticipantRole;
<<<<<<< HEAD
  handRaisedAt?: Date | null;
=======
>>>>>>> d04c33778cc98a2c431fcf6907730064dd5707e4
}

export interface IParticipantRepository {
  upsert(
    meetingId: string,
    userId: string,
    create: CreateParticipantData,
    update: UpdateParticipantData,
  ): Promise<ParticipantWithUser>;
  findBySocketId(socketId: string): Promise<ParticipantWithUser | null>;
  findByMeetingAndUser(meetingId: string, userId: string): Promise<ParticipantWithUser | null>;
  findFirstByMeeting(meetingId: string, where: Partial<ParticipantEntity>): Promise<ParticipantWithUser | null>;
  findManyByMeeting(meetingId: string, activeOnly?: boolean): Promise<ParticipantWithUser[]>;
  update(id: string, data: UpdateParticipantData): Promise<ParticipantWithUser>;
  updateByMeetingAndUser(meetingId: string, userId: string, data: UpdateParticipantData): Promise<ParticipantWithUser>;
  deleteMany(meetingId: string): Promise<void>;
}
