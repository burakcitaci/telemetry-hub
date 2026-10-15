import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { Tenant } from '../auth/tenant-request.decorator';
import type { TenantScope } from '../auth/auth.types';
import { PlatformStore } from '../auth/platform-store.service';
import { AlertsQueryDto } from './dto/unified-monitor.dto';

@ApiTags('monitors')
@Controller('api/alerts')
@UseGuards(TenantJwtGuard)
export class AlertsController {
  constructor(private readonly store: PlatformStore) {}

  @Get() list(@Tenant() scope: TenantScope, @Query() query: AlertsQueryDto) {
    if (query.monitor_id) this.store.monitorRepository.history.load(scope.tenantSlug, query.monitor_id);
    else this.store.monitorRepository.records(scope.tenantSlug);
    return this.store.monitorRepository.history.list(scope.tenantSlug, query);
  }
}
