import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { Tenant } from '../../auth/tenant-request.decorator';
import { TenantJwtGuard } from '../../auth/tenant-jwt.guard';
import type { TenantScope } from '../../auth/auth.types';
import { AdminService, OrgAdminGuard } from '../../auth/admin.service';
import { ClickhouseService } from '../services/clickhouse.service';

class ConnectionStatusQuery {
  @IsString() @IsNotEmpty() @MaxLength(100) service!: string;
  @Matches(/^[a-z0-9][a-z0-9._-]{0,63}$/) team!: string;
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/) env!: string;
}

@Controller('api/ingestion-status')
@UseGuards(TenantJwtGuard, OrgAdminGuard)
export class IngestionStatusController {
  constructor(private readonly clickhouse: ClickhouseService, private readonly admin: AdminService) {}

  @Get()
  status(@Tenant() scope: TenantScope, @Query() query: ConnectionStatusQuery) {
    this.admin.assertTeam(scope.tenantSlug, query.team);
    return this.clickhouse.getConnectionStatus(scope.tenantSlug, query);
  }
}
