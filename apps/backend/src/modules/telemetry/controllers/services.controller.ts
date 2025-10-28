import { Controller, Get, Param } from '@nestjs/common';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/services')
export class ServicesController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getServices() {
    return this.clickhouse.getServices();
  }

  @Get(':service/metrics')
  async getServiceMetrics(@Param('service') service: string) {
    return this.clickhouse.getServiceMetrics(service);
  }

  @Get('health')
  async getHealth() {
    return { status: 'ok', service: 'backend-api' };
  }
}
