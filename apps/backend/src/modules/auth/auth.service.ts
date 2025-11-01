
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './user.service';
import { JwtService } from '@nestjs/jwt';
import { CentralLoggerService } from '@/common/logger/central-logger.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private loggerService: CentralLoggerService,
  ) {}

  async signIn(
    username: string,
    pass: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(username);

    this.loggerService.log(`AuthService: signIn attempt for user ${username} and ${pass}`, 'AuthService');
    if (user?.password !== pass) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.userId, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
