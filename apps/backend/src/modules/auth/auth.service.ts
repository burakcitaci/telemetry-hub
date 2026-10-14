import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginDto } from './dto/login.dto';
import type { AuthSession, TenantJwtPayload } from './auth.types';
import { PlatformStore } from './platform-store.service';
import { passwordMatches } from './password';

@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly store: PlatformStore, private readonly jwt: JwtService) {}

  async login(credentials: LoginDto, source = 'unknown'): Promise<{ token: string; session: AuthSession }> {
    const key = `${source}:${credentials.tenantSlug}:${credentials.email.trim().toLowerCase()}`;
    this.assertLoginAllowed(key);
    const user = this.store.identity(credentials.tenantSlug, credentials.email);
    const matches = await passwordMatches(credentials.password, user?.passwordHash);
    if (!user || !matches) {
      this.recordFailedLogin(key);
      throw new UnauthorizedException('Invalid credentials or organization.');
    }
    this.attempts.delete(key);
    const payload: TenantJwtPayload = { tenantSlug: user.tenantSlug, role: user.role,
      teamId: user.teamId, sub: user.id, version: user.version };
    return { token: await this.jwt.signAsync(payload), session: this.session(payload) };
  }

  session(payload: TenantJwtPayload): AuthSession {
    return { tenantSlug: payload.tenantSlug, role: payload.role, teamId: payload.teamId,
      teams: this.store.teams(payload.tenantSlug).map(team => team.id) };
  }

  logout(payload: TenantJwtPayload): void {
    if (payload.sub) this.store.revokeSessions(payload.tenantSlug, payload.sub);
  }

  private assertLoginAllowed(key: string): void {
    const attempt = this.attempts.get(key);
    if (!attempt || attempt.resetAt <= Date.now()) return;
    if (attempt.count >= 5) throw new HttpException('Too many login attempts.', HttpStatus.TOO_MANY_REQUESTS);
  }

  private recordFailedLogin(key: string): void {
    const now = Date.now(), attempt = this.attempts.get(key);
    this.attempts.set(key, !attempt || attempt.resetAt <= now
      ? { count: 1, resetAt: now + 60_000 } : { ...attempt, count: attempt.count + 1 });
  }
}
