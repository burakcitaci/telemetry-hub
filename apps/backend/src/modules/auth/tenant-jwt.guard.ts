import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TenantJwtPayload, TenantRequest } from './auth.types';
import { PlatformStore } from './platform-store.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { authenticatedTelemetryScope } from '../../common/telemetry/tenant-context';

export const AUTH_COOKIE = 'telemetry_session';
const TENANT_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TEAM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

@Injectable()
export class TenantJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly store: PlatformStore,
    private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const origin = request.header('origin');
    const allowed = this.config.get<string[]>('cors.origin') ?? [];
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && origin && !allowed.includes(origin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }
    const token = this.cookie(request.headers.cookie, AUTH_COOKIE);
    if (!token) throw new UnauthorizedException('Authentication cookie missing.');

    let payload: TenantJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<TenantJwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Authentication cookie is invalid or expired.');
    }
    this.assertClaims(payload);
    if (!this.store.isSessionActive(payload)) {
      throw new UnauthorizedException('Session revoked. Please sign in again.');
    }

    request.tenant = payload.tenantSlug;
    request.userRole = payload.role;
    request.userTeam = payload.teamId;
    request.authSubject = payload.sub;
    request.authVersion = payload.version;
    request.authExpiresAt = payload.exp;
    authenticatedTelemetryScope(payload);

    // EventSource cannot send headers; accept the same filters as stream query parameters.
    request.teamFilter = this.filter(request.header('x-team-filter') ?? request.query.team, TEAM_PATTERN);
    request.serviceFilter = this.filter(request.header('x-service-filter') ?? request.query.globalService, /^\S.{0,254}$/);
    request.envFilter = this.filter(request.header('x-environment-filter') ?? request.query.globalEnv, TEAM_PATTERN);
    request.statusFilter = this.filter(request.header('x-status-filter') ?? request.query.globalStatus, /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/);
    return true;
  }

  private assertClaims(payload: TenantJwtPayload): void {
    const validRole =
      payload?.role === 'admin' || payload?.role === 'user';
    if (!validRole || !TENANT_PATTERN.test(payload.tenantSlug) || typeof payload.sub !== 'string'
      || !Number.isInteger(payload.version) || payload.version < 1) {
      throw new UnauthorizedException('Authentication claims are invalid.');
    }
    if (payload.teamId && !TEAM_PATTERN.test(payload.teamId)) {
      throw new UnauthorizedException('Team user claim is missing or invalid.');
    }
  }

  private filter(value: unknown, pattern: RegExp): string | string[] | undefined {
    if (value === undefined || value === '' || value === 'all') return undefined;
    if (typeof value === 'string' && value.startsWith('[')) {
      try { value = JSON.parse(value); } catch { throw new BadRequestException('Invalid unified filter.'); }
    }
    const values = Array.isArray(value) ? value : [value];
    if (values.length > 50 || values.some(item => typeof item !== 'string' || !pattern.test(item))) {
      throw new BadRequestException('Invalid unified filter.');
    }
    const unique = [...new Set(values)] as string[];
    return unique.length === 1 ? unique[0] : unique.length ? unique : undefined;
  }

  private cookie(header: string | undefined, name: string): string | undefined {
    return header
      ?.split(';')
      .map((part) => part.trim().split('='))
      .find(([key]) => key === name)
      ?.slice(1)
      .join('=');
  }
}
