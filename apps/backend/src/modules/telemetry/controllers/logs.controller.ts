import { Controller, Get, Query } from "@nestjs/common";
import { TelemetryQueryDto } from "../../../dto/query.dto";
import { ClickhouseService } from "../services/clickhouse.service";

@Controller('api/logs')
export class LogsController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getLogs(@Query() query: TelemetryQueryDto) {
    return this.clickhouse.getLogs({
      limit: query.limit,
      offset: query.offset,
      service: query.service,
    });
  }
}
