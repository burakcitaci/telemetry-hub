import type { Request } from 'express';

export type UserRole = 'admin' | 'user';

export interface TenantJwtPayload {
  tenantSlug: string;
  role: UserRole;
  teamId?: string;
  sub?: string;
  version?: number;
  exp?: number;
}

export interface TenantScope extends TenantJwtPayload {
  teamFilter?: string;
  serviceFilter?: string;
  envFilter?: string;
}

export interface TenantRequest extends Request {
  tenant: string;
  userRole: UserRole;
  userTeam?: string;
  teamFilter?: string;
  serviceFilter?: string;
  envFilter?: string;
  authSubject?: string;
  authVersion?: number;
  authExpiresAt?: number;
}

export interface AuthSession extends TenantJwtPayload {
  teams: string[];
}
