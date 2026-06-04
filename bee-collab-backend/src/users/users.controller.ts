import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user\'s profile' })
  @ApiResponse({ status: 200, description: 'Returns id, email, name, avatarUrl, createdAt.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT token.' })
  getProfile(@Req() req: Request & { user: { id: string } }) {
    return this.usersService.getProfile(req.user.id);
  }
}
