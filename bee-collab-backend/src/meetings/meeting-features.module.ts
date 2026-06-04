import { Module } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { PollService } from './poll.service';
import { ReactionService } from './reaction.service';

/**
 * MeetingFeaturesModule
 *
 * Provides the Agenda / Poll / Reaction services and exports them so they
 * can be injected by both MeetingsModule and SignalingModule without
 * creating a circular dependency (MeetingsModule already imports
 * SignalingModule for the cleanup service → gateway).
 *
 * These services only depend on their repositories, which are provided
 * by the @Global() RepositoryModule — so this module needs no imports.
 */
@Module({
  providers: [AgendaService, PollService, ReactionService],
  exports: [AgendaService, PollService, ReactionService],
})
export class MeetingFeaturesModule {}
