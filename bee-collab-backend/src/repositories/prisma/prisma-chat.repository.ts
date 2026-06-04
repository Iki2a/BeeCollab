import { Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IChatRepository,
  ChatMessageWithSender,
} from '../interfaces/chat.repository.interface';

const WITH_SENDER = {
  include: {
    sender: { select: { id: true, name: true, avatarUrl: true } },
  },
};

@Injectable()
export class PrismaChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    meetingId: string,
    senderId: string,
    message: string,
    type: MessageType,
  ): Promise<ChatMessageWithSender> {
    return this.prisma.chatMessage.create({
      data: { meetingId, senderId, message, type },
      ...WITH_SENDER,
    }) as Promise<ChatMessageWithSender>;
  }

  async findMany(meetingId: string): Promise<ChatMessageWithSender[]> {
    return this.prisma.chatMessage.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
      ...WITH_SENDER,
    }) as Promise<ChatMessageWithSender[]>;
  }

  async deleteMany(meetingId: string): Promise<void> {
    await this.prisma.chatMessage.deleteMany({ where: { meetingId } });
  }
}
