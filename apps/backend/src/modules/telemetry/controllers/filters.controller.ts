import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantJwtGuard } from '../../auth/tenant-jwt.guard';
import { Tenant } from '../../auth/tenant-request.decorator';
import type { TenantScope } from '../../auth/auth.types';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/filters')
@UseGuards(TenantJwtGuard)
export class FiltersController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get() async options(@Tenant() scope: TenantScope) {
    const organization: TenantScope = { tenantSlug: scope.tenantSlug, role: scope.role };
    const isolation = this.clickhouse.buildTenantFilter(organization);
    const tables = ['otel_traces', 'otel_logs', 'otel_metrics_gauge', 'otel_metrics_sum', 'otel_metrics_histogram'];
    const branches = tables.map(table => `SELECT DISTINCT ServiceName AS service,
      ResourceAttributes['deployment.environment.name'] AS env FROM ${table} ${isolation.where}`);
    const rows = await this.clickhouse.executeTenantQuery<{ service: string; env: string }>(organization,
      `SELECT DISTINCT service, env FROM (${branches.join(' UNION ALL ')}) LIMIT 1000`, isolation.params);
    return { services: [...new Set(rows.map(row => row.service).filter(Boolean))].sort(),
      environments: [...new Set(rows.map(row => row.env).filter(Boolean))].sort() };
  }
}
