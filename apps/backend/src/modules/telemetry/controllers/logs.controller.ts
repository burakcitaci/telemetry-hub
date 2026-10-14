import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantJwtGuard } from '../../auth/tenant-jwt.guard';
import { Tenant } from '../../auth/tenant-request.decorator';
import type { TenantScope } from '../../auth/auth.types';
import { TelemetryTimeWindowPipe } from '../../../common/pipes/telemetry-time-window.pipe';
import { LogsQueryDto } from '../../../dto/logs-query.dto';
import { ClickhouseService } from '../services/clickhouse.service';

@ApiTags('logs')
@Controller('api/logs')
@UseGuards(TenantJwtGuard)
export class LogsController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getLogs(
    @Tenant() tenant: TenantScope,
    @Query(TelemetryTimeWindowPipe) query: LogsQueryDto,
  ) {
    return this.clickhouse.getLogs(tenant, query);
  }
}
import { ApiTags } from '@nestjs/swagger';
