import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantJwtGuard } from '../../auth/tenant-jwt.guard';
import { Tenant } from '../../auth/tenant-request.decorator';
import type { TenantScope } from '../../auth/auth.types';
import { ClickhouseService } from '../services/clickhouse.service';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { telemetryTimeWindow } from '../services/telemetry-time-window';
import { PlatformStore } from '../../auth/platform-store.service';
import { listFilteredMonitors } from '../../auth/monitors.controller';

export class FilterOptionsDto {
  @IsIn(['all', 'metrics', 'logs', 'traces', 'services', 'monitors']) source: string = 'all';
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}

@ApiTags('filters')
@Controller('api/filters')
@UseGuards(TenantJwtGuard)
export class FiltersController {
  constructor(private readonly clickhouse: ClickhouseService, private readonly store: PlatformStore) {}

  @Get() async options(@Tenant() scope: TenantScope, @Query() options: FilterOptionsDto) {
    const window = options.from || options.to ? { from: options.from, to: options.to }
      : { from: new Date(Date.now() - 300_000).toISOString(), to: new Date().toISOString() };
    const organization: TenantScope = { tenantSlug: scope.tenantSlug, role: scope.role };
    const isolation = this.clickhouse.buildTenantFilter(organization);
    const metricTables = ['otel_metrics_gauge', 'otel_metrics_sum', 'otel_metrics_histogram'];
    const tables = options.source === 'metrics' ? metricTables : options.source === 'logs' ? ['otel_logs']
      : ['traces', 'services'].includes(options.source) ? ['otel_traces'] : ['otel_traces', 'otel_logs', ...metricTables];
    const timeParams = telemetryTimeWindow(window, 'Timestamp', true).params;
    const branches = tables.map(table => {
      const time = telemetryTimeWindow(window, metricTables.includes(table) ? 'TimeUnix' : 'Timestamp', true);
      return `SELECT DISTINCT ServiceName AS service,
        ResourceAttributes['deployment.environment.name'] AS env FROM ${table} ${isolation.where} AND ${time.sql}`;
    });
    const rows = await this.clickhouse.executeTenantQuery<{ service: string; env: string }>(organization,
      `SELECT DISTINCT service, env FROM (${branches.join(' UNION ALL ')}) LIMIT 1000`, { ...isolation.params, ...timeParams });
    const statuses = await this.statuses({ ...scope, statusFilter: undefined }, options.source, window);
    return { services: [...new Set(rows.map(row => row.service).filter(Boolean))].sort(),
      environments: [...new Set(rows.map(row => row.env).filter(Boolean))].sort(), statuses };
  }

  private async statuses(scope: TenantScope, source: string, window: { from?: string; to?: string }): Promise<string[]> {
    if (source === 'monitors') {
      const from = Date.parse(window.from!), to = Date.parse(window.to!);
      const monitors = listFilteredMonitors(this.store, scope);
      return [...new Set(monitors.filter(m => typeof m.lastEvaluatedAt === 'string'
        && Date.parse(m.lastEvaluatedAt) >= from && Date.parse(m.lastEvaluatedAt) <= to)
        .map(m => String(m.isMuted ? 'Muted' : m.status || 'Unknown')))].sort();
    }
    if (!['traces', 'logs', 'services'].includes(source)) return [];
    const signal = source === 'logs' ? 'logs' : 'traces';
    const time = telemetryTimeWindow(window, 'Timestamp', true);
    const isolation = this.clickhouse.buildTenantFilter(scope, [time.sql]);
    const query = signal === 'logs'
      ? `SELECT DISTINCT ${this.clickhouse.statusColumn(signal)} AS status FROM otel_logs ${isolation.where} LIMIT 100`
      : `SELECT DISTINCT status FROM (SELECT multiIf(countIf(lowerUTF8(StatusCode) = 'error') > 0, 'ERROR', countIf(lowerUTF8(StatusCode) = 'ok') > 0, 'OK', 'UNSET') AS status FROM otel_traces ${isolation.where} GROUP BY TraceId) LIMIT 100`;
    const rows = await this.clickhouse.executeTenantQuery<{ status: string }>(scope, query, { ...isolation.params, ...time.params });
    return rows.map(row => row.status).sort();
  }
}
import { ApiTags } from '@nestjs/swagger';
