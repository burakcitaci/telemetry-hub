import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService, OrgAdminGuard } from '../auth/admin.service';
import type { TenantScope } from '../auth/auth.types';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { Tenant } from '../auth/tenant-request.decorator';
import { CreateIngestionKeyDto } from './ingestion-key.dto';
import { IngestionKeysService } from './ingestion-keys.service';

@ApiTags('admin')
@Controller('api/admin/ingestion-keys')
@UseGuards(TenantJwtGuard, OrgAdminGuard)
export class IngestionKeysController {
  constructor(private readonly keys: IngestionKeysService, private readonly admin: AdminService) {}

  @Get() list(@Tenant() scope: TenantScope) { return this.keys.list(scope.tenantSlug); }

  @Post() create(@Tenant() scope: TenantScope, @Body() dto: CreateIngestionKeyDto) {
    this.admin.assertTeam(scope.tenantSlug, dto.teamId);
    return this.keys.create(scope.tenantSlug, dto);
  }

  @Delete(':id') revoke(@Tenant() scope: TenantScope, @Param('id') id: string) {
    return this.keys.revoke(scope.tenantSlug, id);
  }
}
