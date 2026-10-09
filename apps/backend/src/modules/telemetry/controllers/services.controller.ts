import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServiceSummaryQueryDto } from '../../../dto/service-summary-query.dto';
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
  async getServiceMetrics(
    @Param() params: ServiceParamDto,
    @Query() query: ServiceSummaryQueryDto,
  ) {
    return this.clickhouse.getServiceMetrics(params.service, {
      from: query.from,
      to: query.to,
    });
  }
}
