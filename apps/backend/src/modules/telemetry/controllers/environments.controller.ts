import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantJwtGuard } from '../../auth/tenant-jwt.guard';
import { Tenant } from '../../auth/tenant-request.decorator';
import type { TenantScope } from '../../auth/auth.types';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/environments')
@UseGuards(TenantJwtGuard)
export class EnvironmentsController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  getEnvironments(@Tenant() tenant: TenantScope, @Query('source') source: string) {
    if (source !== 'metrics' && source !== 'logs' && source !== 'traces') {
      throw new BadRequestException('source must be metrics, logs or traces');
    }
    return this.clickhouse.getEnvironments(tenant, source);
  }
}
