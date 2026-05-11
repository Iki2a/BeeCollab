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
  audioEnabled?: boolean;
  videoEnabled?: boolean;
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

interface HandTogglePayload {
  meetingId: string;
  raised: boolean;
}

interface KickPayload {
  meetingId: string;
  targetSocketId: string;
}

interface AskUnmutePayload {
  meetingId: string;
  targetSocketId: string;
}

interface MakeCoHostPayload {
  meetingId: string;
  targetUserId: string;
}

interface RemoveCoHostPayload {
  meetingId: string;
  targetUserId: string;
}

// ─── Gateway ──────────────────────────────────────────────────────────────────

@WebSocketGateway({
  namespace: '/meetings',
  cors: { origin: '*' },
})
export class SignalingGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly signalingService: SignalingService,
    private readonly chatService: ChatService,
  ) { }

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
      payload.audioEnabled,
      payload.videoEnabled,
    );

    await client.join(payload.meetingId);

    client.to(payload.meetingId).emit('participant:joined', {
      socketId: client.id,
      userId: user.sub,
      user: participant.user,
      role: participant.role,
      audioEnabled: participant.audioEnabled,
      videoEnabled: participant.videoEnabled,
    });

    client.data.profile = {
      id: participant.user.id,
      name: participant.user.name,
      avatarUrl: participant.user.avatarUrl,
    };
    client.data.audioEnabled = participant.audioEnabled;
    client.data.videoEnabled = participant.videoEnabled;
    client.data.role = participant.role;

    const sockets = await this.server.in(payload.meetingId).fetchSockets();
    client.emit('meeting:state', {
      meetingId: payload.meetingId,
      participants: sockets.map((s) => ({
        socketId: s.id,
        userId: (s.data as SocketData).user?.sub,
        user: (s.data as SocketData).profile,
        role: (s.data as SocketData).role,
        audioEnabled: (s.data as SocketData).audioEnabled,
        videoEnabled: (s.data as SocketData).videoEnabled,
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

    if (payload.type === 'audio') {
      client.data.audioEnabled = payload.enabled;
    } else {
      client.data.videoEnabled = payload.enabled;
    }

    this.server.to(payload.meetingId).emit('media:updated', {
      socketId: client.id,
      userId: user.sub,
      user: updated.user,
      type: payload.type,
      enabled: payload.enabled,
    });
  }

  @SubscribeMessage('media:speaking')
  onMediaSpeaking(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { meetingId: string; speaking: boolean },
  ) {
    client.to(payload.meetingId).emit('media:speaking', {
      socketId: client.id,
      speaking: payload.speaking,
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

  // ── Hand raise ──────────────────────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('hand:toggle')
  onHandToggle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HandTogglePayload,
  ) {
    const user = getUser(client);

    this.server.to(payload.meetingId).emit('hand:updated', {
      userId: user.sub,
      raised: payload.raised,
    });
  }

  // ── Kick participant (HOST only) ──────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('meeting:kick')
  async onKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: KickPayload,
  ) {
    const user = getUser(client);
    const canKick = await this.signalingService.isHostOrCoHost(payload.meetingId, user.sub);
    if (!canKick) {
      client.emit('error', { message: 'Only host/co-host can kick participants' });
      return;
    }

    const target = await this.signalingService.getParticipantBySocketId(
      payload.meetingId,
      payload.targetSocketId,
    );
    if (!target) {
      client.emit('error', { message: 'Participant not found' });
      return;
    }
    const isTargetHost = await this.signalingService.isHost(payload.meetingId, target.userId);
    if (isTargetHost) {
      client.emit('error', { message: 'Host cannot be kicked' });
      return;
    }

    const participant = await this.signalingService.kickParticipant(
      payload.meetingId,
      payload.targetSocketId,
    );

    if (!participant) return;

    const targetSocket =
      (this.server as any).sockets?.get?.(payload.targetSocketId) ??
      (this.server as any).sockets?.sockets?.get?.(payload.targetSocketId);
    this.server.to(payload.targetSocketId).emit('meeting:kicked', { reason: 'Removed by host' });
    this.server.to(payload.meetingId).emit('participant:left', {
      socketId: payload.targetSocketId,
      userId: participant.userId,
      user: participant.user,
    });
    if (targetSocket) targetSocket.disconnect();
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('media:force-mute')
  async onForceMute(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: KickPayload,
  ) {
    const user = getUser(client);
    const canMute = await this.signalingService.isHostOrCoHost(payload.meetingId, user.sub);
    if (!canMute) {
      client.emit('error', { message: 'Only host/co-host can mute participants' });
      return;
    }

    const targetSocket =
      (this.server as any).sockets?.get?.(payload.targetSocketId) ??
      (this.server as any).sockets?.sockets?.get?.(payload.targetSocketId);
    if (!targetSocket) {
      client.emit('error', { message: 'Participant not found' });
      return;
    }

    const targetUserId = (targetSocket.data as SocketData).user?.sub;
    targetSocket.data.audioEnabled = false;
    if (targetUserId) {
      await this.signalingService.toggleMedia(
        payload.meetingId,
        targetUserId,
        'audio',
        false,
      );
    }
    this.server.to(payload.targetSocketId).emit('media:force-mute', {
      meetingId: payload.meetingId,
    });
    this.server.to(payload.meetingId).emit('media:updated', {
      socketId: payload.targetSocketId,
      userId: (targetSocket.data as SocketData).user?.sub,
      user: (targetSocket.data as SocketData).profile,
      type: 'audio',
      enabled: false,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('media:ask-unmute')
  async onAskUnmute(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AskUnmutePayload,
  ) {
    const user = getUser(client);
    const canAsk = await this.signalingService.isHostOrCoHost(payload.meetingId, user.sub);
    if (!canAsk) {
      client.emit('error', { message: 'Only host/co-host can ask to unmute' });
      return;
    }

    this.server.to(payload.targetSocketId).emit('media:ask-unmute', {
      meetingId: payload.meetingId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('meeting:make-cohost')
  async onMakeCoHost(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MakeCoHostPayload,
  ) {
    const user = getUser(client);
    const canPromote = await this.signalingService.isHost(payload.meetingId, user.sub);
    if (!canPromote) {
      client.emit('error', { message: 'Only host can assign co-host' });
      return;
    }

    const updated = await this.signalingService.setParticipantRole(
      payload.meetingId,
      payload.targetUserId,
      'CO_HOST',
    );
    const sockets = await this.server.in(payload.meetingId).fetchSockets();
    sockets.forEach((socket) => {
      const socketUserId = (socket.data as SocketData).user?.sub;
      if (socketUserId === payload.targetUserId) {
        socket.data.role = updated.role;
      }
    });

    this.server.to(payload.meetingId).emit('participant:role-updated', {
      userId: payload.targetUserId,
      role: updated.role,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('meeting:remove-cohost')
  async onRemoveCoHost(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RemoveCoHostPayload,
  ) {
    const user = getUser(client);
    const canDemote = await this.signalingService.isHost(payload.meetingId, user.sub);
    if (!canDemote) {
      client.emit('error', { message: 'Only host can remove co-host' });
      return;
    }

    const updated = await this.signalingService.setParticipantRole(
      payload.meetingId,
      payload.targetUserId,
      'PARTICIPANT',
    );
    const sockets = await this.server.in(payload.meetingId).fetchSockets();
    sockets.forEach((socket) => {
      const socketUserId = (socket.data as SocketData).user?.sub;
      if (socketUserId === payload.targetUserId) {
        socket.data.role = updated.role;
      }
    });

    this.server.to(payload.meetingId).emit('participant:role-updated', {
      userId: payload.targetUserId,
      role: updated.role,
    });
  }
}
