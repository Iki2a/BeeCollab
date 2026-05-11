import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { SignalingService } from './signaling.service';
import { ChatService } from '../chat/chat.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { SocketData, WsUser } from './signaling.types';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Extract the verified user from socket.data (set by WsJwtGuard) */
function getUser(client: Socket): WsUser {
  const data = client.data as SocketData;
  if (!data?.user?.sub) throw new WsException('Unauthorized');
  return data.user;
}

// ─── Event Payload Interfaces ─────────────────────────────────────────────────

interface JoinPayload {
  meetingId: string;
}

interface WebRtcPayload {
  to: string;
  from: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface MediaTogglePayload {
  meetingId: string;
  type: 'audio' | 'video';
  enabled: boolean;
}

interface ChatPayload {
  meetingId: string;
  message: string;
}

interface EndMeetingPayload {
  meetingId: string;
}

interface KickPayload {
  meetingId: string;
  targetSocketId: string;
}

// ─── Gateway ──────────────────────────────────────────────────────────────────

@WebSocketGateway({
  namespace: '/meetings',
  cors: { origin: '*' },
})
export class SignalingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly signalingService: SignalingService,
    private readonly chatService: ChatService,
  ) {}

  emitMeetingEnded(meetingId: string, reason?: string) {
    if (!this.server) return;

    this.server
      .to(meetingId)
      .emit('meeting:ended', { meetingId, reason });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth as Record<string, string | undefined>).token ??
      client.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      client.emit('error', { message: 'No token provided' });
      client.disconnect();
      return;
    }

    console.log(`[WS] Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const participant = await this.signalingService.handleDisconnect(client.id);

    if (participant) {
      this.server.to(participant.meetingId).emit('participant:left', {
        socketId: client.id,
        userId: participant.userId,
        user: participant.user,
      });
    }

    console.log(`[WS] Client disconnected: ${client.id}`);
  }

  // ── meeting:join ─────────────────────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('meeting:join')
  async onMeetingJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    const user = getUser(client);

    // Disconnect any existing tabs/sockets for the same user in this meeting
    const existingSockets = await this.server.in(payload.meetingId).fetchSockets();
    for (const socket of existingSockets) {
      if ((socket.data as SocketData).user?.sub === user.sub && socket.id !== client.id) {
        socket.emit('error', { message: 'Membuka dari tab lain. Koneksi ini ditutup.' });
        socket.disconnect();
      }
    }

    const participant = await this.signalingService.handleJoin(
      payload.meetingId,
      user.sub,
      client.id,
    );

    await client.join(payload.meetingId);

    client.to(payload.meetingId).emit('participant:joined', {
      socketId: client.id,
      userId: user.sub,
      user: participant.user,
      audioEnabled: participant.audioEnabled,
      videoEnabled: participant.videoEnabled,
    });

    const sockets = await this.server.in(payload.meetingId).fetchSockets();
    client.emit('meeting:state', {
      meetingId: payload.meetingId,
      participants: sockets.map((s) => ({
        socketId: s.id,
        userId: (s.data as SocketData).user?.sub,
      })),
    });
  }

  // ── WebRTC relay ─────────────────────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('webrtc:offer')
  onOffer(@MessageBody() payload: WebRtcPayload) {
    this.server.to(payload.to).emit('webrtc:offer', payload);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('webrtc:answer')
  onAnswer(@MessageBody() payload: WebRtcPayload) {
    this.server.to(payload.to).emit('webrtc:answer', payload);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('webrtc:ice-candidate')
  onIceCandidate(@MessageBody() payload: WebRtcPayload) {
    this.server.to(payload.to).emit('webrtc:ice-candidate', payload);
  }

  // ── Media toggle ──────────────────────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('media:toggle')
  async onMediaToggle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MediaTogglePayload,
  ) {
    const user = getUser(client);
    const updated = await this.signalingService.toggleMedia(
      payload.meetingId,
      user.sub,
      payload.type,
      payload.enabled,
    );

    this.server.to(payload.meetingId).emit('media:updated', {
      socketId: client.id,
      userId: user.sub,
      user: updated.user,
      type: payload.type,
      enabled: payload.enabled,
    });
  }

  // ── Chat ──────────────────────────────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:message')
  async onChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatPayload,
  ) {
    const user = getUser(client);
    const saved = await this.chatService.saveMessage(
      payload.meetingId,
      user.sub,
      payload.message,
    );
    this.server.to(payload.meetingId).emit('chat:message', saved);
  }

  // ── Meeting end ───────────────────────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('meeting:end')
  async onEndMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: EndMeetingPayload,
  ) {
    const user = getUser(client);
    const meeting = await this.signalingService.endMeeting(
      payload.meetingId,
      user.sub,
    );

    if (!meeting) {
      client.emit('error', { message: 'Unauthorized or meeting not found' });
      return;
    }

    this.server
      .to(payload.meetingId)
      .emit('meeting:ended', { meetingId: payload.meetingId });
  }

  // ── Kick participant (HOST only) ──────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('meeting:kick')
  async onKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: KickPayload,
  ) {
    const user = getUser(client);
    const meeting = await this.signalingService.endMeeting(
      payload.meetingId,
      user.sub,
    );

    if (!meeting) {
      client.emit('error', { message: 'Only HOST can kick participants' });
      return;
    }

    this.server
      .to(payload.targetSocketId)
      .emit('meeting:kicked', { reason: 'Removed by host' });
  }
}
