import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { WsUser } from '../../signaling/signaling.types';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();

    const token: string | undefined =
      (client.handshake.auth as Record<string, string | undefined>).token ??
      client.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('WS: No token provided');
    }

    try {
      const payload = this.jwtService.verify<WsUser>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      // Attach typed payload to socket data
      client.data = { user: payload };
      return true;
    } catch {
      throw new UnauthorizedException('WS: Invalid token');
    }
  }
}
