import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MeetingStatus, ParticipantRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { CreateMeetingDto, JoinMeetingDto } from './dto/meeting.dto';
import type { IMeetingRepository } from '../repositories/interfaces/meeting.repository.interface';
import type { IParticipantRepository } from '../repositories/interfaces/participant.repository.interface';
import type { IChatRepository } from '../repositories/interfaces/chat.repository.interface';
import {
  MEETING_REPOSITORY,
  PARTICIPANT_REPOSITORY,
  CHAT_REPOSITORY,
} from '../repositories/tokens';

@Injectable()
export class MeetingsService {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: IMeetingRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IParticipantRepository,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  /** Generate a short, unique, readable room code */
  private generateRoomCode(): string {
    return randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"
  }

  async createMeeting(hostId: string, dto: CreateMeetingDto) {
    return this.meetingRepository.create({
      title: dto.title,
      roomCode: this.generateRoomCode(),
      hostId,
      maxParticipants: dto.maxParticipants ?? 10,
      duration: dto.duration ?? 15,
      status: MeetingStatus.SCHEDULED,
    });
  }

  async joinMeeting(userId: string, meetingId: string, dto: JoinMeetingDto) {
    const meeting = await this.meetingRepository.findByIdWithParticipants(meetingId);

    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.status === MeetingStatus.ENDED)
      throw new BadRequestException('Meeting has ended');
    if (meeting.roomCode !== dto.roomCode)
      throw new ForbiddenException('Invalid room code');

    // Only count active participants (fix: was counting all including ones who left)
    const activeCount = meeting.participants.filter((p) => p.leftAt === null).length;
    if (activeCount >= meeting.maxParticipants)
      throw new BadRequestException('Meeting is full');

    const participant = await this.participantRepository.upsert(
      meetingId,
      userId,
      { meetingId, userId, role: ParticipantRole.PARTICIPANT, audioEnabled: false, videoEnabled: false },
      { leftAt: null },
    );

    return { meeting, participant };
  }

  async getParticipants(meetingId: string) {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');
    return this.participantRepository.findManyByMeeting(meetingId, true);
  }

  async endMeeting(hostId: string, meetingId: string) {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.hostId !== hostId)
      throw new ForbiddenException('Only the host can end the meeting');

    await this.participantRepository.deleteMany(meetingId);
    await this.chatRepository.deleteMany(meetingId);
    return this.meetingRepository.delete(meetingId);
  }

  async getMyMeetings(hostId: string) {
    return this.meetingRepository.findByHostId(hostId);
  }

  async getMeetingById(meetingId: string) {
    const meeting = await this.meetingRepository.findByIdWithDetails(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  async getMeetingByRoomCode(roomCode: string) {
    const meeting = await this.meetingRepository.findByRoomCode(roomCode);
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }
}
