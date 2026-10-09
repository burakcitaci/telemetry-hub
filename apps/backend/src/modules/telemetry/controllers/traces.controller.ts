import { Controller, Get, Param, Query } from "@nestjs/common";
import { TelemetryQueryDto } from "../../../dto/query.dto";
import { TraceIdParamDto } from "../../../dto/trace.dto";
import { ClickhouseService } from "../services/clickhouse.service";

@Controller("api/traces")
export class TracesController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getTraces(@Query() query: TelemetryQueryDto) {
    return this.clickhouse.getTraces({
      limit: query.limit,
      offset: query.offset,
      service: query.service,
      env: query.env,
    });
  }

  @Get("detail")
  async getTraceDetail(
    @Query() params: TraceIdParamDto,
    @Query() query: TelemetryQueryDto,
  ) {
    return this.clickhouse.getTraceById(params.traceId, query.env);
  }

  @Get(":traceId")
  async getTrace(
    @Param() params: TraceIdParamDto,
    @Query() query: TelemetryQueryDto,
  ) {
    return this.clickhouse.getTraceById(params.traceId, query.env);
  }
}
