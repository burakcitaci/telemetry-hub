import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { MetricsQueryDto } from '../../../dto/metrics-query.dto';
import { TelemetryTimeWindowPipe } from '../../../common/pipes/telemetry-time-window.pipe';
import { TenantJwtGuard } from '../../auth/tenant-jwt.guard';
import { Tenant } from '../../auth/tenant-request.decorator';
import type { TenantScope } from '../../auth/auth.types';

@Controller('api/metrics')
@UseGuards(TenantJwtGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // ============= ROOT ENDPOINT =============

  /**
   * GET /api/metrics
   * Get all metrics flattened for UI table with pagination
   */
  @Get()
  async getAllMetricsFlattened(
    @Tenant() tenant: TenantScope,
    @Query(TelemetryTimeWindowPipe) query: MetricsQueryDto,
  ) {
    return this.metricsService.getAllMetricsFlattened(tenant, {
      limit: query.limit,
      offset: query.offset,
      service: query.service,
      from: query.from,
      to: query.to,
      env: query.env,
    });
  }

  // ============= NEW ENDPOINTS FOR DETAIL PAGE =============

  /**
   * GET /api/metrics/detail?service=backend-service&metric=http.response_time
   * Get detailed metric records with histogram data for the detail page
   * Must be BEFORE :serviceName route
   */
  @Get('detail')
  async getMetricDetail(
    @Tenant() tenant: TenantScope,
    @Query(TelemetryTimeWindowPipe) query: MetricsQueryDto,
  ) {
    return this.metricsService.getMetricDetail(
      tenant,
      query.service || '',
      query.metric || '',
      query.limit ?? 1000,
      { from: query.from, to: query.to, env: query.env },
    );
  }
  /**
   * GET /api/metrics/statistics?service=backend-service&metric=http.response_time
   * Get aggregated statistics for a specific metric
   * Must be BEFORE :serviceName route
   */
  @Get('statistics')
  async getMetricStatistics(
    @Tenant() tenant: TenantScope,
    @Query('service') serviceName: string,
    @Query('metric') metricName: string,
  ) {
    if (!serviceName || !metricName) {
      throw new Error('Missing required parameters: service, metric');
    }
    return this.metricsService.getMetricStatistics(tenant, serviceName, metricName);
  }

  // ============= DISCOVERY ENDPOINTS =============

  /**
   * GET /api/metrics/discovery/metric-names
   * Get all metric names globally
   * Must be BEFORE :serviceName route
   */
  @Get('discovery/metric-names')
  async getAllMetricNames(@Tenant() tenant: TenantScope) {
    return this.metricsService.getAllMetricNames(tenant);
  }

  /**
   * GET /api/metrics/discovery/services-overview
   * Get services with their metric counts
   * Must be BEFORE :serviceName route
   */
  @Get('discovery/services-overview')
  async getServicesWithMetricCounts(@Tenant() tenant: TenantScope) {
    return this.metricsService.getServicesWithMetricCounts(tenant);
  }

  // ============= SERVICE-LEVEL ENDPOINTS =============

  /**
   * GET /api/metrics/:serviceName
   * Get all metrics for a service
   */
  @Get(':serviceName')
  async getMetricsByService(
    @Tenant() tenant: TenantScope,
    @Param('serviceName') serviceName: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.metricsService.getMetricsByService(tenant, serviceName, {
      limit,
      offset,
    });
  }

  /**
   * GET /api/metrics/:serviceName/available
   * Get available metric names for a service
   * Must be BEFORE :serviceName/:metricName route
   */
  @Get(':serviceName/available')
  async getAvailableMetrics(
    @Tenant() tenant: TenantScope,
    @Param('serviceName') serviceName: string,
  ) {
    return this.metricsService.getAvailableMetrics(tenant, serviceName);
  }

  /**
   * GET /api/metrics/:serviceName/http/summary
   * Get HTTP metrics (client/server)
   * Must be BEFORE :serviceName/:metricName route
   */
  @Get(':serviceName/http/summary')
  async getHttpMetrics(
    @Tenant() tenant: TenantScope,
    @Param('serviceName') serviceName: string,
    @Query('type') type?: 'client' | 'server',
    @Query('limit') limit?: number,
  ) {
    return this.metricsService.getHttpMetrics(tenant, serviceName, { type, limit });
  }

  /**
   * GET /api/metrics/:serviceName/gc
   * Get garbage collection metrics
   * Must be BEFORE :serviceName/:metricName route
   */
  @Get(':serviceName/gc')
  async getGcMetrics(
    @Tenant() tenant: TenantScope,
    @Param('serviceName') serviceName: string,
  ) {
    return this.metricsService.getGcMetrics(tenant, serviceName);
  }

  /**
   * GET /api/metrics/:serviceName/memory
   * Get memory metrics
   * Must be BEFORE :serviceName/:metricName route
   */
  @Get(':serviceName/memory')
  async getMemoryMetrics(
    @Tenant() tenant: TenantScope,
    @Param('serviceName') serviceName: string,
  ) {
    return this.metricsService.getMemoryMetrics(tenant, serviceName);
  }

  /**
   * GET /api/metrics/:serviceName/statistics
   * Get metrics statistics summary for a service
   * Must be BEFORE :serviceName/:metricName route
   */
  @Get(':serviceName/statistics')
  async getMetricsStatistics(
    @Tenant() tenant: TenantScope,
    @Param('serviceName') serviceName: string,
  ) {
    return this.metricsService.getMetricsStatistics(tenant, serviceName);
  }

  /**
   * GET /api/metrics/:serviceName/scope
   * Get metrics grouped by scope
   * Must be BEFORE :serviceName/:metricName route
   */
  @Get(':serviceName/scope')
  async getMetricsByScope(
    @Tenant() tenant: TenantScope,
    @Param('serviceName') serviceName: string,
  ) {
    return this.metricsService.getMetricsByScope(tenant, serviceName);
  }

  // ============= METRIC-LEVEL ENDPOINTS =============

  /**
   * GET /api/metrics/:serviceName/:metricName
   * Get specific metric by name (legacy - use /detail instead for detail page)
   */
  @Get(':serviceName/:metricName')
  async getMetricByName(
    @Tenant() tenant: TenantScope,
    @Param('serviceName') serviceName: string,
    @Param('metricName') metricName: string,
  ) {
    return this.metricsService.getMetricByName(tenant, serviceName, metricName);
  }

  /**
   * GET /api/metrics/:serviceName/:metricName/compare?period=hour|day
   * Compare metrics between two time periods
   */
  @Get(':serviceName/:metricName/compare')
  async compareMetrics(
    @Tenant() tenant: TenantScope,
    @Param('serviceName') serviceName: string,
    @Param('metricName') metricName: string,
    @Query('period') period?: 'hour' | 'day',
  ) {
    return this.metricsService.compareMetrics(
      tenant,
      serviceName,
      metricName,
      period || 'hour',
    );
  }
}
