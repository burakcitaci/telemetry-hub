import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { TenantRequest, TenantScope } from './auth.types';

export const Tenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantScope => {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    return {
      tenantSlug: request.tenant,
      role: request.userRole,
      teamId: request.userTeam,
      teamFilter: request.teamFilter,
      serviceFilter: request.serviceFilter,
      envFilter: request.envFilter,
      statusFilter: request.statusFilter,
      sub: request.authSubject,
      version: request.authVersion,
      exp: request.authExpiresAt,
    };
  },
);
