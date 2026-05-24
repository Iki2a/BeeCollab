import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MeetingEndedEvent, ParticipantJoinedEvent, ParticipantLeftEvent } from './meeting.events';
import type { IMeetingRepository } from '../repositories/interfaces/meeting.repository.interface';
import type { IParticipantRepository } from '../repositories/interfaces/participant.repository.interface';
import type { IChatRepository } from '../repositories/interfaces/chat.repository.interface';
import {
  MEETING_REPOSITORY,
  PARTICIPANT_REPOSITORY,
  CHAT_REPOSITORY,
} from '../repositories/tokens';
import { SignalingGateway } from '../signaling/signaling.gateway';

/**
 * MeetingEventsListener — Observer Pattern
 *
 * This class is the concrete Observer in the Observer Pattern.
 * It subscribes to domain events emitted by various publishers and reacts
 * independently — publishers have no knowledge of this class.
 *
 * Key demonstrations of SE principles:
 *  - Observer Pattern: @OnEvent() registers this class as a subscriber
 *  - Open/Closed Principle: new reactions are added here, publishers never change
 *  - Single Responsibility: each handler owns exactly one reaction
 *  - Decoupling: SignalingService, MeetingsService, CleanupService do NOT import
 *    this file; they only emit an event string + payload
 */
@Injectable()
export class MeetingEventsListener {
  private readonly logger = new Logger(MeetingEventsListener.name);

  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: IMeetingRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IParticipantRepository,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly signalingGateway: SignalingGateway,
  ) {}

  // ─── meeting.ended ────────────────────────────────────────────────────────────

  /**
   * Audit log: records every meeting-end regardless of who triggered it
   * (host via REST, host via WebSocket, or the scheduled cleanup job).
   */
  @OnEvent('meeting.ended')
  handleMeetingEnded(event: MeetingEndedEvent): void {
    this.logger.log(
      `[AUDIT] Meeting ended — id: ${event.meetingId}, reason: ${event.reason}`,
    );
  }

  // ─── participant.joined ───────────────────────────────────────────────────────

  @OnEvent('participant.joined')
  handleParticipantJoined(event: ParticipantJoinedEvent): void {
    this.logger.log(
      `[AUDIT] Participant joined — userId: ${event.userId}, meetingId: ${event.meetingId}`,
    );
  }

  // ─── participant.left ─────────────────────────────────────────────────────────

  /**
   * Auto-end meeting when the last participant leaves.
   *
   * This is a NEW feature that was added WITHOUT modifying any publisher
   * (SignalingService, MeetingsService, CleanupService).  It is a direct
   * demonstration of the Observer Pattern enabling the Open/Closed Principle:
   * the system is open for extension (new behaviour here) and closed for
   * modification (no changes to publishers).
   *
   * Flow:
   *  1. Check how many active participants remain after this disconnect
   *  2. If zero: confirm the meeting still exists (guard against double-cleanup)
   *  3. Notify any lingering WebSocket clients with meeting:ended
   *  4. Delete participants → chat → meeting from the database
   */
  @OnEvent('participant.left', { async: true })
  async handleParticipantLeft(event: ParticipantLeftEvent): Promise<void> {
    this.logger.log(
      `[AUDIT] Participant left — userId: ${event.userId}, meetingId: ${event.meetingId}`,
    );

    // How many active (leftAt IS NULL) participants remain?
    const active = await this.participantRepository.findManyByMeeting(
      event.meetingId,
      true, // activeOnly
    );
    if (active.length > 0) return; // others still present — do nothing

    // Guard: meeting may have already been cleaned up by another path
    const meeting = await this.meetingRepository.findById(event.meetingId);
    if (!meeting) return;

    this.logger.log(
      `[AUTO-END] All participants left meeting ${event.meetingId} — auto-ending`,
    );

    // 1. Notify any lingering WebSocket clients before we wipe the room
    this.signalingGateway.emitMeetingEnded(
      event.meetingId,
      'All participants have left',
    );

    // 2. Cascade-delete: participants → chat → meeting
    await this.participantRepository.deleteMany(event.meetingId);
    await this.chatRepository.deleteMany(event.meetingId);
    await this.meetingRepository.delete(event.meetingId);

    this.logger.log(
      `[AUTO-END] Meeting ${event.meetingId} removed from database`,
    );
  }
}
