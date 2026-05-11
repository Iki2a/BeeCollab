import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { SignalingService } from './signaling.service';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, ChatModule],
  providers: [SignalingGateway, SignalingService],
  exports: [SignalingGateway],
})
export class SignalingModule {}
