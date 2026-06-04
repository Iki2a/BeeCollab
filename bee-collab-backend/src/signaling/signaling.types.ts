/**
 * Shape of the JWT payload attached to socket.data.user
 * by WsJwtGuard after token verification.
 */
export interface WsUser {
  sub: string;
  email?: string;
  /** Guest display name — present only on guest tokens */
  name?: string;
  /** True when the socket belongs to a guest (no DB user record) */
  isGuest?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Typed socket data — extend Socket's data property
 */
export interface SocketData {
  user: WsUser;
  profile?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  role?: 'HOST' | 'CO_HOST' | 'PARTICIPANT';
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  /** Meeting room ID — stored on join so disconnect can reference it */
  meetingId?: string;
  /**
   * Guest hand-raise timestamp (ISO string) or null.
   * Guests have no DB Participant row, so their speaking-queue state lives here.
   */
  handRaisedAt?: string | null;
}
