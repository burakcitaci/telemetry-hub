import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginDto } from './dto/login.dto';
import type { AuthSession, TenantJwtPayload } from './auth.types';
import { PlatformStore } from './platform-store.service';
import { passwordMatches } from './password';

@Injectable()
export class AuthService {
  constructor(private readonly store: PlatformStore, private readonly jwt: JwtService) {}

  async login(credentials: LoginDto): Promise<{ token: string; session: AuthSession }> {
    const user = this.store.identity(credentials.tenantSlug, credentials.email);
    const matches = await passwordMatches(credentials.password, user?.passwordHash);
    if (!user || !matches) throw new UnauthorizedException('Invalid credentials or organization.');
    const payload: TenantJwtPayload = { tenantSlug: user.tenantSlug, role: user.role,
      teamId: user.teamId, sub: user.id, version: user.version };
    return { token: await this.jwt.signAsync(payload), session: this.session(payload) };
  }

  session(payload: TenantJwtPayload): AuthSession {
    return { tenantSlug: payload.tenantSlug, role: payload.role, teamId: payload.teamId,
      teams: this.store.teams(payload.tenantSlug).map(team => team.id) };
  }
}
