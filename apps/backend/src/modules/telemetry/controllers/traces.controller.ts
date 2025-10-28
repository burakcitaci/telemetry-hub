import { Controller, Get, Param, Query } from '@nestjs/common';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/traces')
export class TracesController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getTraces(
    @Query('limit') limit: string = '100',
    @Query('service') service?: string,
  ) {
    return this.clickhouse.getTraces(parseInt(limit), service);
  }

  @Get(':traceId')
  async getTrace(@Param('traceId') traceId: string) {
    return this.clickhouse.getTraceById(traceId);
  }
}
