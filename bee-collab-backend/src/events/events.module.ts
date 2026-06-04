import { Module } from '@nestjs/common';
import { MeetingEventsListener } from './meeting-events.listener';
import { SignalingModule } from '../signaling/signaling.module';

/**
 * EventsModule — wires all domain event listeners.
 *
 * Importing SignalingModule gives the listener access to SignalingGateway
 * so it can push WebSocket notifications when meetings auto-end.
 * The RepositoryModule is @Global(), so repositories are injected directly
 * without an explicit import here.
 */
@Module({
  imports: [SignalingModule],
  providers: [MeetingEventsListener],
})
export class EventsModule {}
