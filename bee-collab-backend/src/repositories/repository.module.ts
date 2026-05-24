import { Global, Module } from '@nestjs/common';
import {
  USER_REPOSITORY,
  MEETING_REPOSITORY,
  PARTICIPANT_REPOSITORY,
  CHAT_REPOSITORY,
} from './tokens';
import { PrismaUserRepository } from './prisma/prisma-user.repository';
import { PrismaMeetingRepository } from './prisma/prisma-meeting.repository';
import { PrismaParticipantRepository } from './prisma/prisma-participant.repository';
import { PrismaChatRepository } from './prisma/prisma-chat.repository';

@Global()
@Module({
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: MEETING_REPOSITORY, useClass: PrismaMeetingRepository },
    { provide: PARTICIPANT_REPOSITORY, useClass: PrismaParticipantRepository },
    { provide: CHAT_REPOSITORY, useClass: PrismaChatRepository },
  ],
  exports: [
    USER_REPOSITORY,
    MEETING_REPOSITORY,
    PARTICIPANT_REPOSITORY,
    CHAT_REPOSITORY,
  ],
})
export class RepositoryModule {}
