import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { OrgAdminGuard } from '../auth/admin.service';
import { InfrastructureService } from './infrastructure.service';

@Controller('api/v1/infrastructure')
@UseGuards(TenantJwtGuard, OrgAdminGuard)
export class InfrastructureController {
  constructor(private readonly infrastructure: InfrastructureService) {}

  @Get('status')
  async status(@Res() response: Response): Promise<void> {
    const hosts = await this.infrastructure.status();
    response.setHeader('Cache-Control', 'private, no-store');
    response.json(hosts);
  }
}
