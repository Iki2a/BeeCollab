import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeetingStatus, ParticipantRole } from '@prisma/client';
import type { IMeetingRepository } from '../repositories/interfaces/meeting.repository.interface';
import type { IParticipantRepository } from '../repositories/interfaces/participant.repository.interface';
import type { IChatRepository } from '../repositories/interfaces/chat.repository.interface';
import {
  MEETING_REPOSITORY,
  PARTICIPANT_REPOSITORY,
  CHAT_REPOSITORY,
} from '../repositories/tokens';
import {
  MeetingEndedEvent,
  ParticipantJoinedEvent,
  ParticipantLeftEvent,
} from '../events/meeting.events';

@Injectable()
export class SignalingService {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: IMeetingRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IParticipantRepository,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Called on `meeting:join` WS event.
   * Updates participant socketId and sets meeting LIVE if it's still SCHEDULED.
   */
  async handleJoin(
    meetingId: string,
    userId: string,
    socketId: string,
    audioEnabled?: boolean,
    videoEnabled?: boolean,
  ) {
    const [participant] = await Promise.all([
      this.participantRepository.upsert(
        meetingId,
        userId,
        {
          meetingId,
          userId,
          socketId,
          role: ParticipantRole.PARTICIPANT,
          audioEnabled: audioEnabled ?? false,
          videoEnabled: videoEnabled ?? false,
        },
        {
          socketId,
          leftAt: null,
          ...(audioEnabled !== undefined ? { audioEnabled } : {}),
          ...(videoEnabled !== undefined ? { videoEnabled } : {}),
        },
      ),
      // Auto-start meeting when first participant joins
      this.meetingRepository.updateManyStatus(
        { id: meetingId, status: MeetingStatus.SCHEDULED },
        { status: MeetingStatus.LIVE, startedAt: new Date() },
      ),
    ]);

    // Publish: notify all observers that a participant has joined
    this.eventEmitter.emit(
      'participant.joined',
      new ParticipantJoinedEvent(meetingId, userId, socketId),
    );

    return participant;
  }

  /**
   * Called on WS `disconnect`.
   * Nullifies socketId and sets leftAt timestamp.
   */
  async handleDisconnect(socketId: string) {
    const participant = await this.participantRepository.findBySocketId(socketId);
    if (!participant) return null;

    await this.participantRepository.update(participant.id, {
      socketId: null,
      leftAt: new Date(),
    });

    // Publish: notify all observers that a participant has left.
    // The MeetingEventsListener will auto-end the meeting if no one remains.
    this.eventEmitter.emit(
      'participant.left',
      new ParticipantLeftEvent(participant.meetingId, participant.userId, socketId),
    );

    return participant;
  }

  /**
   * Toggle audio or video for a participant and persist to DB.
   */
  async toggleMedia(
    meetingId: string,
    userId: string,
    type: 'audio' | 'video',
    enabled: boolean,
  ) {
    return this.participantRepository.updateByMeetingAndUser(meetingId, userId, {
      ...(type === 'audio' ? { audioEnabled: enabled } : { videoEnabled: enabled }),
    });
  }

  async isHost(meetingId: string, userId: string) {
    const meeting = await this.meetingRepository.findById(meetingId);
    return Boolean(meeting && meeting.hostId === userId);
  }

  async isHostOrCoHost(meetingId: string, userId: string) {
    // Single query: check participant role first, fallback to meeting hostId
    const participant = await this.participantRepository.findByMeetingAndUser(meetingId, userId);
    if (participant?.role === ParticipantRole.HOST || participant?.role === ParticipantRole.CO_HOST) {
      return true;
    }
    const meeting = await this.meetingRepository.findById(meetingId);
    return Boolean(meeting && meeting.hostId === userId);
  }

  async setParticipantRole(meetingId: string, targetUserId: string, role: ParticipantRole) {
    return this.participantRepository.updateByMeetingAndUser(meetingId, targetUserId, { role });
  }

  async kickParticipant(meetingId: string, targetSocketId: string) {
    const participant = await this.participantRepository.findFirstByMeeting(meetingId, {
      socketId: targetSocketId,
    });
    if (!participant) return null;

    await this.participantRepository.update(participant.id, {
      socketId: null,
      leftAt: new Date(),
    });

    return participant;
  }

  async getParticipantBySocketId(meetingId: string, targetSocketId: string) {
    return this.participantRepository.findFirstByMeeting(meetingId, {
      socketId: targetSocketId,
    });
  }

  async forceMuteParticipant(meetingId: string, targetSocketId: string) {
    const participant = await this.participantRepository.findFirstByMeeting(meetingId, {
      socketId: targetSocketId,
    });
    if (!participant) return null;

    return this.participantRepository.update(participant.id, { audioEnabled: false });
  }

  /**
   * End meeting — only HOST can call this.
   */
  async endMeeting(meetingId: string, userId: string) {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting || meeting.hostId !== userId) return null;

    await this.participantRepository.deleteMany(meetingId);
    await this.chatRepository.deleteMany(meetingId);
    const deleted = await this.meetingRepository.delete(meetingId);

    // Publish: meeting ended via WebSocket by the host
    this.eventEmitter.emit(
      'meeting.ended',
      new MeetingEndedEvent(meetingId, 'ws_ended'),
    );

    return deleted;
  }
}
