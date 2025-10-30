import { Controller, Get, Param, Query } from '@nestjs/common';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/traces')
export class TracesController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getTraces(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('service') service?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    return this.clickhouse.getTraces(limitNum, pageNum, service);
  }

  @Get(':traceId')
  async getTrace(@Param('traceId') traceId: string) {
    return this.clickhouse.getTraceById(traceId);
  }
}
