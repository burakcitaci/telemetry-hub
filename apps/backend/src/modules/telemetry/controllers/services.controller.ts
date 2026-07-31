import { Controller, Get, Param } from '@nestjs/common';
import { ServiceParamDto } from '../../../dto/service.dto';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/services')
export class ServicesController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getServices() {
    return this.clickhouse.getServices();
  }

  @Get(':service/metrics')
  async getServiceMetrics(@Param() params: ServiceParamDto) {
    return this.clickhouse.getServiceMetrics(params.service);
  }
}
