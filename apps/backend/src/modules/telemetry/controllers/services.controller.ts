import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServiceSummaryQueryDto } from '../../../dto/service-summary-query.dto';
import { TelemetryQueryDto } from '../../../dto/query.dto';
import { ServiceParamDto } from '../../../dto/service.dto';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/services')
export class ServicesController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getServices(@Query() query: TelemetryQueryDto) {
    return this.clickhouse.getServices(query.env);
  }

  @Get(':service/metrics')
  async getServiceMetrics(
    @Param() params: ServiceParamDto,
    @Query() query: ServiceSummaryQueryDto,
  ) {
    return this.clickhouse.getServiceMetrics(params.service, {
      from: query.from,
      to: query.to,
      env: query.env,
    });
  }
}
