import type { Request } from 'express';
import type { FilterSelection } from './platform-filters';

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
  teamFilter?: FilterSelection;
  serviceFilter?: FilterSelection;
  envFilter?: FilterSelection;
  statusFilter?: FilterSelection;
}

export interface TenantRequest extends Request {
  tenant: string;
  userRole: UserRole;
  userTeam?: string;
  teamFilter?: FilterSelection;
  serviceFilter?: FilterSelection;
  envFilter?: FilterSelection;
  statusFilter?: FilterSelection;
  authSubject?: string;
  authVersion?: number;
  authExpiresAt?: number;
}

export interface AuthSession extends TenantJwtPayload {
  teams: string[];
}
