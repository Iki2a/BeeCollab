import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('meetings/:meetingId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Get chat history for a meeting', description: 'Returns all messages stored for the given meeting, ordered by creation time. The WebSocket `chat:history` event also delivers this on join.' })
  @ApiParam({ name: 'meetingId', description: 'UUID of the meeting' })
  @ApiResponse({ status: 200, description: 'Array of ChatMessage objects with sender info.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getHistory(@Param('meetingId') meetingId: string) {
    return this.chatService.getMessages(meetingId);
  }
}
