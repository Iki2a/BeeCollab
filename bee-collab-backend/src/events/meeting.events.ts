/**
 * Domain event payload classes — Observer Pattern
 *
 * Each class is an immutable value object carrying the data any
 * subscriber needs when the corresponding domain event fires.
 *
 * Publishers (SignalingService, MeetingsService, CleanupService) emit these
 * objects via EventEmitter2 without knowing who (or how many observers) will
 * react.  New behaviour can be added by registering a new @OnEvent handler
 * anywhere in the application — zero changes to the publisher required.
 * This satisfies the Open/Closed Principle.
 */

export class MeetingEndedEvent {
  constructor(
    /** ID of the meeting that just ended */
    public readonly meetingId: string,
    /** Why the meeting ended — useful for audit logs and analytics */
    public readonly reason: 'host_ended' | 'ws_ended' | 'expired',
  ) {}
}

export class ParticipantJoinedEvent {
  constructor(
    public readonly meetingId: string,
    public readonly userId: string,
    public readonly socketId: string,
  ) {}
}

export class ParticipantLeftEvent {
  constructor(
    public readonly meetingId: string,
    public readonly userId: string,
    public readonly socketId: string,
  ) {}
}

export class ParticipantMediaChangedEvent {
  constructor(
    public readonly meetingId: string,
    public readonly userId: string,
    public readonly type: 'audio' | 'video',
    public readonly enabled: boolean,
  ) {}
}
