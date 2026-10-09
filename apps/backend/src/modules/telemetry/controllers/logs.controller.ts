import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { LogsQueryDto } from '../../../dto/logs-query.dto';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/logs')
export class LogsController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getLogs(@Query() query: LogsQueryDto) {
    if (query.from !== undefined || query.to !== undefined) {
      const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i;
      if (
        !query.from ||
        !query.to ||
        !zoned.test(query.from) ||
        !zoned.test(query.to) ||
        !Number.isFinite(Date.parse(query.from)) ||
        !Number.isFinite(Date.parse(query.to)) ||
        Date.parse(query.from) > Date.parse(query.to)
      ) {
        throw new BadRequestException(
          'from and to must be ordered ISO timestamps with timezone',
        );
      }
    }
    return this.clickhouse.getLogs({
      limit: query.limit,
      offset: query.offset,
      service: query.service,
      from: query.from,
      to: query.to,
    });
  }
}
