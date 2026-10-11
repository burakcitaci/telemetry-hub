import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TenantJwtGuard } from '../../auth/tenant-jwt.guard';
import { Tenant } from '../../auth/tenant-request.decorator';
import type { TenantScope } from '../../auth/auth.types';
import { ServiceSummaryQueryDto } from '../../../dto/service-summary-query.dto';
import { TelemetryQueryDto } from '../../../dto/query.dto';
import { ServiceParamDto } from '../../../dto/service.dto';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/services')
@UseGuards(TenantJwtGuard)
export class ServicesController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getServices(@Tenant() tenant: TenantScope, @Query() query: TelemetryQueryDto) {
    return this.clickhouse.getServices(tenant, query.env);
  }

  @Get(':service/metrics')
  async getServiceMetrics(
    @Tenant() tenant: TenantScope,
    @Param() params: ServiceParamDto,
    @Query() query: ServiceSummaryQueryDto,
  ) {
    return this.clickhouse.getServiceMetrics(tenant, params.service, {
      from: query.from,
      to: query.to,
      env: query.env,
    });
  }
}
