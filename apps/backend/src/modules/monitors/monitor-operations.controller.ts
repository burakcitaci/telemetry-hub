import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrgAdminGuard } from '../auth/admin.service';
import { PlatformStore } from '../auth/platform-store.service';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { Tenant } from '../auth/tenant-request.decorator';
import type { TenantScope } from '../auth/auth.types';
import { CreateMaintenanceDto, TeamDestinationDto } from './dto/monitor-operations.dto';
import { TeamMonitorOperations } from './team-monitor-operations';

@Controller('api/admin')
@UseGuards(TenantJwtGuard, OrgAdminGuard)
export class MonitorOperationsController {
  constructor(private readonly store: PlatformStore, private readonly operations: TeamMonitorOperations) {}

  @Get('teams/:team/overview') overview(@Tenant() scope: TenantScope, @Param('team') id: string) {
    const org = scope.tenantSlug;
    const team = this.operations.team(org, id);
    const monitors = this.store.monitors(org).filter(monitor => this.operations.effectiveTeam(org, monitor) === id);
    return {
      team,
      members: this.store.users(org).filter(user => user.teamId === id).map(({ id, email, role }) => ({ id, email, role })),
      services: this.store.serviceOwnership(org, id).owned.sort(),
      monitors: monitors.map(({ id, name, enabled, runtime, status }) => ({
        id, name, enabled: enabled ?? true, state: runtime?.state ?? status,
        firing: (enabled ?? true) && (runtime ? runtime.state === 'FIRING' : status === 'Alert'),
      })),
      ingestion_keys: this.store.ingestionKeys(org).filter(key => key.teamId === id)
        .map(({ id, name, env, expiresAt, revokedAt }) => ({ id, name, env, expiresAt, revokedAt })),
    };
  }

  @Get('teams/:team/notifications') routing(@Tenant() scope: TenantScope, @Param('team') team: string) {
    return this.operations.routing(scope.tenantSlug, team);
  }

  @Patch('teams/:team/notifications') route(@Tenant() scope: TenantScope, @Param('team') team: string, @Body() dto: TeamDestinationDto) {
    return this.operations.setDestination(scope.tenantSlug, team, dto.destination ?? null);
  }

  @Post('teams/:team/notifications/test') test(@Tenant() scope: TenantScope, @Param('team') team: string) {
    return this.operations.testDestination(scope.tenantSlug, team);
  }

  @Get('maintenance') list(@Tenant() scope: TenantScope) {
    return this.store.monitorOperations.windows(scope.tenantSlug);
  }

  @Post('maintenance') create(@Tenant() scope: TenantScope, @Body() dto: CreateMaintenanceDto) {
    return this.operations.createWindow(scope.tenantSlug, dto);
  }

  @Post('maintenance/:id/cancel') cancel(@Tenant() scope: TenantScope, @Param('id') id: string) {
    if (!this.store.monitorOperations.cancelWindow(scope.tenantSlug, id, new Date().toISOString()))
      throw new NotFoundException('Active or scheduled maintenance window not found.');
    return { success: true };
  }
}
