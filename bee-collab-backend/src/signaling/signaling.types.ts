/**
 * Shape of the JWT payload attached to socket.data.user
 * by WsJwtGuard after token verification.
 */
export interface WsUser {
  sub: string;
  email: string;
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
}
