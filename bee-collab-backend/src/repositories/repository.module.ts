import { Global, Module } from '@nestjs/common';
import {
  USER_REPOSITORY,
  MEETING_REPOSITORY,
  PARTICIPANT_REPOSITORY,
  CHAT_REPOSITORY,
  AGENDA_REPOSITORY,
  POLL_REPOSITORY,
  REACTION_REPOSITORY,
} from './tokens';
import { PrismaUserRepository } from './prisma/prisma-user.repository';
import { PrismaMeetingRepository } from './prisma/prisma-meeting.repository';
import { PrismaParticipantRepository } from './prisma/prisma-participant.repository';
import { PrismaChatRepository } from './prisma/prisma-chat.repository';
import { PrismaAgendaRepository } from './prisma/prisma-agenda.repository';
import { PrismaPollRepository } from './prisma/prisma-poll.repository';
import { PrismaReactionRepository } from './prisma/prisma-reaction.repository';

@Global()
@Module({
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: MEETING_REPOSITORY, useClass: PrismaMeetingRepository },
    { provide: PARTICIPANT_REPOSITORY, useClass: PrismaParticipantRepository },
    { provide: CHAT_REPOSITORY, useClass: PrismaChatRepository },
    { provide: AGENDA_REPOSITORY, useClass: PrismaAgendaRepository },
    { provide: POLL_REPOSITORY, useClass: PrismaPollRepository },
    { provide: REACTION_REPOSITORY, useClass: PrismaReactionRepository },
  ],
  exports: [
    USER_REPOSITORY,
    MEETING_REPOSITORY,
    PARTICIPANT_REPOSITORY,
    CHAT_REPOSITORY,
    AGENDA_REPOSITORY,
    POLL_REPOSITORY,
    REACTION_REPOSITORY,
  ],
})
export class RepositoryModule {}
