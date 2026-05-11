import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('meetings/:meetingId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  getHistory(@Param('meetingId') meetingId: string) {
    return this.chatService.getMessages(meetingId);
  }
}
