import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async saveMessage(
    meetingId: string,
    senderId: string,
    message: string,
    type: MessageType = MessageType.TEXT,
  ) {
    return this.prisma.chatMessage.create({
      data: { meetingId, senderId, message, type },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async getMessages(meetingId: string) {
    return this.prisma.chatMessage.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }
}
