import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AdminService, OrgAdminGuard } from './admin.service';
import { PlatformStore } from './platform-store.service';
import { TenantJwtGuard } from './tenant-jwt.guard';
import { Tenant } from './tenant-request.decorator';
import type { TenantScope } from './auth.types';
import { CreateUserDto, PasswordDto, TeamDto, UpdateUserDto } from './dto/admin.dto';

@Controller('api/admin')
@UseGuards(TenantJwtGuard, OrgAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly store: PlatformStore) {}

  @Get('users') users(@Tenant() scope: TenantScope) { return this.admin.listUsers(scope.tenantSlug); }
  @Post('users') createUser(@Tenant() scope: TenantScope, @Body() dto: CreateUserDto) {
    return this.admin.createUser(scope.tenantSlug, dto);
  }
  @Patch('users/:id') updateUser(@Tenant() scope: TenantScope, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.admin.editUser(scope.tenantSlug, id, dto);
  }
  @Put('users/:id/password') password(@Tenant() scope: TenantScope, @Param('id') id: string, @Body() dto: PasswordDto) {
    return this.admin.resetPassword(scope.tenantSlug, id, dto.password);
  }
  @Delete('users/:id') deleteUser(@Tenant() scope: TenantScope, @Param('id') id: string) {
    return this.admin.deleteUser(scope.tenantSlug, id);
  }
  @Get('teams') teams(@Tenant() scope: TenantScope) { return this.store.teams(scope.tenantSlug); }
  @Post('teams') createTeam(@Tenant() scope: TenantScope, @Body() dto: TeamDto) {
    this.store.createTeam(scope.tenantSlug, { id: dto.id, name: dto.name });
    return { id: dto.id, name: dto.name };
  }
  @Delete('teams/:id') deleteTeam(@Tenant() scope: TenantScope, @Param('id') id: string) {
    this.store.deleteTeam(scope.tenantSlug, id);
    return { success: true };
  }
}
