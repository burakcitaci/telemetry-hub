import { Body, ConflictException, Controller, Delete, Get, NotFoundException, Optional, Param, Post, Put, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AdminService } from './admin.service';
import { PlatformStore } from './platform-store.service';
import { TenantJwtGuard } from './tenant-jwt.guard';
import { Tenant } from './tenant-request.decorator';
import type { TenantScope } from './auth.types';
import { MonitorDto } from './dto/monitor.dto';
import { filterValues } from './platform-filters';
import { IsBoolean } from 'class-validator';
import { MonitorEvaluatorService } from '../monitors/monitor-evaluator.service';
import { validateMonitor } from '../monitors/monitor-rule';
import { normalizeLogRule } from '../monitors/log-query';
import { Query } from '@nestjs/common';
import { IsISO8601 } from 'class-validator';
class MonitorHistoryDto { @IsISO8601() from!: string; @IsISO8601() to!: string; }

export class MonitorMuteDto { @IsBoolean() isMuted!: boolean; }

export function listFilteredMonitors(store: PlatformStore, scope: TenantScope) {
  const ownership = scope.teamFilter ? store.serviceOwnership(scope.tenantSlug, scope.teamFilter) : undefined;
  const teams = filterValues(scope.teamFilter), services = filterValues(scope.serviceFilter), envs = filterValues(scope.envFilter);
  const statuses = filterValues(scope.statusFilter);
  return store.monitors(scope.tenantSlug).map(m => m.evaluationEnabled && m.lastEvaluatedAt
    && Date.now() - Date.parse(m.lastEvaluatedAt) > 90_000
    ? { ...m, status: 'Unknown', evaluationError: 'Evaluation is overdue.' } : m).filter(m =>
    (!teams.length || (ownership?.assigned.includes(m.service)
      ? ownership.owned.includes(m.service) : teams.includes(m.teamId))) &&
    (!services.length || services.includes(m.service)) &&
    (!envs.length || envs.includes(m.env)) &&
    (!statuses.length || statuses.includes(m.isMuted ? 'Muted' : m.status || 'Unknown')));
}

@ApiTags('monitors')
@Controller('api/monitors')
@UseGuards(TenantJwtGuard)
export class MonitorsController {
  constructor(private readonly store: PlatformStore, private readonly admin: AdminService,
    @Optional() private readonly evaluator?: MonitorEvaluatorService) {}

  @Get() list(@Tenant() scope: TenantScope) {
    return listFilteredMonitors(this.store, scope);
  }

  @Post() create(@Tenant() scope: TenantScope, @Body() dto: MonitorDto) {
    if (this.store.monitors(scope.tenantSlug).length >= 100) throw new ConflictException('The limit is 100 monitors per organization.');
    const now = new Date().toISOString();
    const monitor = { ...this.configuration(scope, dto), id: randomUUID(), createdAt: now,
      updatedAt: now, configurationVersion: 1, status: 'No Data', lastEvaluatedAt: null, evaluationEnabled: !!this.evaluator, history: [], events: [] };
    this.store.saveMonitor(scope.tenantSlug, monitor);
    if (this.evaluator) void this.evaluator.evaluate(scope.tenantSlug, monitor.id);
    return monitor;
  }

  @Put(':id') update(@Tenant() scope: TenantScope, @Param('id') id: string, @Body() dto: MonitorDto) {
    const existing = this.requireMonitor(scope, id);
    const configuration = this.configuration(scope, dto);
    const measurementChanged = ['type', 'query', 'aggregation', 'metricType', 'logAttribute', 'signalStatus',
      'noDataPolicy', 'evaluationWindow', 'groupBy', 'teamId', 'service', 'env']
      .some(key => JSON.stringify(existing[key]) !== JSON.stringify(configuration[key as keyof typeof configuration]));
    const monitor = { ...existing, ...configuration, updatedAt: new Date().toISOString(),
      configurationVersion: (existing.configurationVersion ?? 0) + 1,
      status: 'No Data', lastEvaluatedAt: null, evaluationError: null, value: null, groups: [],
      history: measurementChanged ? [] : existing.history ?? [], events: existing.events ?? [], lastTriggeredAt: existing.lastTriggeredAt ?? null };
    this.store.saveMonitor(scope.tenantSlug, monitor);
    if (this.evaluator) void this.evaluator.evaluate(scope.tenantSlug, id);
    return monitor;
  }

  @Post('preview') preview(@Tenant() scope: TenantScope, @Body() dto: MonitorDto) {
    const configuration = this.configuration(scope, dto);
    if (!this.evaluator) throw new NotFoundException('Monitor evaluator unavailable.');
    return this.evaluator.preview(scope.tenantSlug, configuration as MonitorDto);
  }

  @Post(':id/evaluate') async evaluate(@Tenant() scope: TenantScope, @Param('id') id: string) {
    this.requireMonitor(scope, id);
    if (!this.evaluator) throw new NotFoundException('Monitor evaluator unavailable.');
    const result = await this.evaluator.evaluate(scope.tenantSlug, id);
    if (!result) throw new NotFoundException('Monitor not found.');
    return result;
  }

  @Get(':id/history') async history(@Tenant() scope: TenantScope, @Param('id') id: string, @Query() range: MonitorHistoryDto) {
    const monitor = this.requireMonitor(scope, id);
    if (!this.evaluator) throw new NotFoundException('Monitor evaluator unavailable.');
    return this.evaluator.history(scope.tenantSlug, monitor as MonitorDto, new Date(range.from), new Date(range.to));
  }

  @Post(':id/mute') mute(@Tenant() scope: TenantScope, @Param('id') id: string, @Body() dto: MonitorMuteDto) {
    const monitor = { ...this.requireMonitor(scope, id), isMuted: dto.isMuted, updatedAt: new Date().toISOString() };
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
    dto = normalizeLogRule(dto);
    validateMonitor(dto);
    this.admin.assertTeam(scope.tenantSlug, dto.teamId);
    return { name: dto.name, type: dto.type, query: dto.query, comparator: dto.comparator,
      threshold: dto.threshold, warnThreshold: dto.warnThreshold, evaluationWindow: dto.evaluationWindow,
      message: dto.message ?? '', targets: dto.targets ?? [], aggregation: dto.aggregation ?? (dto.type === 'log' ? 'count' : 'avg'),
      groupBy: [...new Set(dto.groupBy ?? [])], isMuted: dto.isMuted ?? false, teamId: dto.teamId || undefined,
      metricType: dto.metricType ?? 'gauge', signalStatus: dto.signalStatus || undefined,
      logAttribute: dto.logAttribute,
      noDataPolicy: dto.noDataPolicy ?? 'no_data',
      service: dto.service || undefined, env: dto.env === 'all' ? undefined : dto.env || undefined,
      datadogType: dto.type === 'log' ? 'log alert' : 'query alert' };
  }
}
import { ApiTags } from '@nestjs/swagger';
