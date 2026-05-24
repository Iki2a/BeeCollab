import { Inject, Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import type { IChatRepository } from '../repositories/interfaces/chat.repository.interface';
import { CHAT_REPOSITORY } from '../repositories/tokens';

@Injectable()
export class ChatService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async saveMessage(
    meetingId: string,
    senderId: string,
    message: string,
    type: MessageType = MessageType.TEXT,
  ) {
    return this.chatRepository.create(meetingId, senderId, message, type);
  }

  async getMessages(meetingId: string) {
    return this.chatRepository.findMany(meetingId);
  }
}
