import { BadRequestException, Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { PlatformStore } from './platform-store.service';
import { TenantJwtGuard } from './tenant-jwt.guard';
import { Tenant } from './tenant-request.decorator';
import type { TenantScope } from './auth.types';

export class ServiceMetadataDto {
  @IsString() @MinLength(1) @MaxLength(255) serviceName!: string;
  @IsString() @MaxLength(255) team!: string;
  @IsIn(['Web', 'DB', 'Cache', 'Function', 'Custom', 'Browser', 'Mobile']) type!: string;
  @IsString() @MaxLength(255) onCall!: string;
  @IsString() @MaxLength(255) contact!: string;
  @IsString() @MaxLength(2000) repo!: string;
  @IsIn(['UI', 'API', 'Terraform']) metadataSource!: string;
}

export class ServiceMetadataKeyDto {
  @IsString() @MinLength(1) @MaxLength(255) serviceName!: string;
}

// Catalog ownership is descriptive metadata, never an authorization boundary.
@Controller('api/service-metadata')
@UseGuards(TenantJwtGuard)
export class ServiceMetadataController {
  constructor(private readonly store: PlatformStore) {}
  @Get() list(@Tenant() scope: TenantScope) { return this.store.serviceMetadata(scope.tenantSlug); }
  @Get('teams') teams(@Tenant() scope: TenantScope) { return this.store.teams(scope.tenantSlug); }
  @Put() save(@Tenant() scope: TenantScope, @Body() dto: ServiceMetadataDto) {
    if (dto.team && !this.store.teams(scope.tenantSlug).some(team => team.id === dto.team)) {
      throw new BadRequestException('Select an existing organization team.');
    }
    this.store.saveServiceMetadata(scope.tenantSlug, dto.serviceName, { ...dto });
    return dto;
  }
  @Delete() remove(@Tenant() scope: TenantScope, @Body() dto: ServiceMetadataKeyDto) {
    this.store.deleteServiceMetadata(scope.tenantSlug, dto.serviceName);
    return { success: true };
  }
}
