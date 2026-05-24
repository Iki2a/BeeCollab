import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '../repositories/interfaces/user.repository.interface';
import { USER_REPOSITORY } from '../repositories/tokens';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findProfile(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
