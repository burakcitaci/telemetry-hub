import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/environments')
export class EnvironmentsController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  getEnvironments(@Query('source') source: string) {
    if (source !== 'metrics' && source !== 'logs' && source !== 'traces') {
      throw new BadRequestException('source must be metrics, logs or traces');
    }
    return this.clickhouse.getEnvironments(source);
  }
}
