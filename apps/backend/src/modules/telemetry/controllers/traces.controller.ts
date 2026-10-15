import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { TenantJwtGuard } from '../../auth/tenant-jwt.guard';
import { Tenant } from '../../auth/tenant-request.decorator';
import type { TenantScope } from '../../auth/auth.types';
import { LogsQueryDto } from "../../../dto/logs-query.dto";
import { TelemetryQueryDto } from "../../../dto/query.dto";
import { TraceDetailQueryDto, TraceIdParamDto } from "../../../dto/trace.dto";
import { ClickhouseService } from "../services/clickhouse.service";

@ApiTags('traces')
@Controller("api/traces")
@UseGuards(TenantJwtGuard)
export class TracesController {
  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get()
  async getTraces(@Tenant() tenant: TenantScope, @Query() query: LogsQueryDto) {
    return this.clickhouse.getTraces(tenant, {
      limit: query.limit,
      offset: query.offset,
      service: query.service,
      env: query.env,
      from: query.from,
      to: query.to,
    });
  }

  @Get("detail")
  async getTraceDetail(
    @Tenant() tenant: TenantScope,
    @Query() query: TraceDetailQueryDto,
  ) {
    return this.clickhouse.getTraceById(tenant, query.traceId, query.env);
  }

  @Get(":traceId")
  async getTrace(
    @Tenant() tenant: TenantScope,
    @Param() params: TraceIdParamDto,
    @Query() query: TelemetryQueryDto,
  ) {
    return this.clickhouse.getTraceById(tenant, params.traceId, query.env);
  }
}
import { ApiTags } from '@nestjs/swagger';
