import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AdminService } from './admin.service';
import { PlatformStore } from './platform-store.service';
import { TenantJwtGuard } from './tenant-jwt.guard';
import { Tenant } from './tenant-request.decorator';
import type { TenantScope } from './auth.types';
import { MonitorDto } from './dto/monitor.dto';
import { filterValues } from './platform-filters';

export function listFilteredMonitors(store: PlatformStore, scope: TenantScope) {
  const ownership = scope.teamFilter ? store.serviceOwnership(scope.tenantSlug, scope.teamFilter) : undefined;
  const teams = filterValues(scope.teamFilter), services = filterValues(scope.serviceFilter), envs = filterValues(scope.envFilter);
  const statuses = filterValues(scope.statusFilter);
  return store.monitors(scope.tenantSlug).filter(m =>
    (!teams.length || (ownership?.assigned.includes(m.service)
      ? ownership.owned.includes(m.service) : teams.includes(m.teamId))) &&
    (!services.length || services.includes(m.service)) &&
    (!envs.length || envs.includes(m.env)) &&
    (!statuses.length || statuses.includes(m.isMuted ? 'Muted' : m.status || 'Unknown')));
}

@Controller('api/monitors')
@UseGuards(TenantJwtGuard)
export class MonitorsController {
  constructor(private readonly store: PlatformStore, private readonly admin: AdminService) {}

  @Get() list(@Tenant() scope: TenantScope) {
    return listFilteredMonitors(this.store, scope);
  }

  @Post() create(@Tenant() scope: TenantScope, @Body() dto: MonitorDto) {
    const now = new Date().toISOString();
    const monitor = { ...this.configuration(scope, dto), id: randomUUID(),
      createdAt: now, updatedAt: now, status: 'No Data' };
    this.store.saveMonitor(scope.tenantSlug, monitor);
    return monitor;
  }

  @Put(':id') update(@Tenant() scope: TenantScope, @Param('id') id: string, @Body() dto: MonitorDto) {
    const existing = this.requireMonitor(scope, id);
    const monitor = { ...existing, ...this.configuration(scope, dto), updatedAt: new Date().toISOString() };
    this.store.saveMonitor(scope.tenantSlug, monitor);
    return monitor;
  }

  @Delete(':id') delete(@Tenant() scope: TenantScope, @Param('id') id: string) {
    this.requireMonitor(scope, id);
    this.store.deleteMonitor(scope.tenantSlug, id);
    return { success: true };
  }

  private requireMonitor(scope: TenantScope, id: string) {
    const monitor = this.store.monitors(scope.tenantSlug).find(m => m.id === id);
    if (!monitor) throw new NotFoundException('Monitor not found.');
    return monitor;
  }

  private configuration(scope: TenantScope, dto: MonitorDto) {
    this.admin.assertTeam(scope.tenantSlug, dto.teamId);
    return { name: dto.name, type: dto.type, query: dto.query, comparator: dto.comparator,
      threshold: dto.threshold, warnThreshold: dto.warnThreshold, evaluationWindow: dto.evaluationWindow,
      message: dto.message ?? '', targets: dto.targets ?? [], aggregation: dto.aggregation,
      groupBy: dto.groupBy, isMuted: dto.isMuted ?? false, teamId: dto.teamId || undefined,
      service: dto.service || undefined, env: dto.env === 'all' ? undefined : dto.env || undefined,
      datadogType: dto.type === 'log' ? 'log alert' : 'query alert' };
  }
}
