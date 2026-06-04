import { MessageType } from '@prisma/client';

export interface ChatMessageEntity {
  id: string;
  meetingId: string;
  senderId: string;
  message: string;
  type: MessageType;
  createdAt: Date;
}

export interface ChatMessageWithSender extends ChatMessageEntity {
  sender: { id: string; name: string; avatarUrl: string | null };
}

export interface IChatRepository {
  create(
    meetingId: string,
    senderId: string,
    message: string,
    type: MessageType,
  ): Promise<ChatMessageWithSender>;
  findMany(meetingId: string): Promise<ChatMessageWithSender[]>;
  deleteMany(meetingId: string): Promise<void>;
}
