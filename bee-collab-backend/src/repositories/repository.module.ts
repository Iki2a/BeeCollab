import { Global, Module } from '@nestjs/common';
import {
  USER_REPOSITORY,
  MEETING_REPOSITORY,
  PARTICIPANT_REPOSITORY,
  CHAT_REPOSITORY,
<<<<<<< HEAD
  AGENDA_REPOSITORY,
  POLL_REPOSITORY,
  REACTION_REPOSITORY,
=======
>>>>>>> d04c33778cc98a2c431fcf6907730064dd5707e4
} from './tokens';
import { PrismaUserRepository } from './prisma/prisma-user.repository';
import { PrismaMeetingRepository } from './prisma/prisma-meeting.repository';
import { PrismaParticipantRepository } from './prisma/prisma-participant.repository';
import { PrismaChatRepository } from './prisma/prisma-chat.repository';
<<<<<<< HEAD
import { PrismaAgendaRepository } from './prisma/prisma-agenda.repository';
import { PrismaPollRepository } from './prisma/prisma-poll.repository';
import { PrismaReactionRepository } from './prisma/prisma-reaction.repository';
=======
>>>>>>> d04c33778cc98a2c431fcf6907730064dd5707e4

@Global()
@Module({
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: MEETING_REPOSITORY, useClass: PrismaMeetingRepository },
    { provide: PARTICIPANT_REPOSITORY, useClass: PrismaParticipantRepository },
    { provide: CHAT_REPOSITORY, useClass: PrismaChatRepository },
<<<<<<< HEAD
    { provide: AGENDA_REPOSITORY, useClass: PrismaAgendaRepository },
    { provide: POLL_REPOSITORY, useClass: PrismaPollRepository },
    { provide: REACTION_REPOSITORY, useClass: PrismaReactionRepository },
=======
>>>>>>> d04c33778cc98a2c431fcf6907730064dd5707e4
  ],
  exports: [
    USER_REPOSITORY,
    MEETING_REPOSITORY,
    PARTICIPANT_REPOSITORY,
    CHAT_REPOSITORY,
<<<<<<< HEAD
    AGENDA_REPOSITORY,
    POLL_REPOSITORY,
    REACTION_REPOSITORY,
=======
>>>>>>> d04c33778cc98a2c431fcf6907730064dd5707e4
  ],
})
export class RepositoryModule {}
