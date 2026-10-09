import { Controller, Get, Query } from '@nestjs/common';
import { TelemetryTimeWindowPipe } from '../../../common/pipes/telemetry-time-window.pipe';
import { LogsQueryDto } from '../../../dto/logs-query.dto';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/logs')
export class LogsController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getLogs(@Query(TelemetryTimeWindowPipe) query: LogsQueryDto) {
    return this.clickhouse.getLogs(query);
  }
}
