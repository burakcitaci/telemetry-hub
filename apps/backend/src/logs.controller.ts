import { Controller, Get, Query } from '@nestjs/common';
import { ClickhouseService } from './clickhouse.service';

@Controller('api/logs')
export class LogsController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getLogs(
    @Query('limit') limit: string = '100',
    @Query('service') service?: string,
  ) {
    return this.clickhouse.getLogs(parseInt(limit), service);
  }
}
