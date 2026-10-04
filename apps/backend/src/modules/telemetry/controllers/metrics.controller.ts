import { Controller, Get, Param, Query } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { TelemetryQueryDto } from '../../../dto/query.dto';


@Controller('api/metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) { }


    @Get()
    async getAllMetricsFlattened(@Query() query: TelemetryQueryDto) {
        return this.metricsService.getAllMetricsFlattened({ limit: query.limit, offset: query.offset, service: query.service });
    }
    /**
     * GET /api/metrics/discovery/metric-names
     * Get all metric names globally
     */
    @Get('discovery/metric-names')
    async getAllMetricNames() {
        return this.metricsService.getAllMetricNames();
    }

    /**
     * GET /api/metrics/discovery/services-overview
     * Get services with their metric counts
     */
    @Get('discovery/services-overview')
    async getServicesWithMetricCounts() {
        return this.metricsService.getServicesWithMetricCounts();
    }

    /**
     * GET /api/metrics/:serviceName
     * Get all metrics for a service
     */
    @Get(':serviceName')
    async getMetricsByService(
        @Param('serviceName') serviceName: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        return this.metricsService.getMetricsByService(serviceName, { limit, offset });
    }

    /**
     * GET /api/metrics/:serviceName/:metricName
     * Get specific metric by name
     */
    @Get(':serviceName/:metricName')
    async getMetricByName(
        @Param('serviceName') serviceName: string,
        @Param('metricName') metricName: string,
    ) {
        return this.metricsService.getMetricByName(serviceName, metricName);
    }

    /**
     * GET /api/metrics/:serviceName/http?type=client|server
     * Get HTTP metrics (client/server)
     */
    @Get(':serviceName/http/summary')
    async getHttpMetrics(
        @Param('serviceName') serviceName: string,
        @Query('type') type?: 'client' | 'server',
        @Query('limit') limit?: number,
    ) {
        return this.metricsService.getHttpMetrics(serviceName, { type, limit });
    }

    /**
     * GET /api/metrics/:serviceName/gc
     * Get garbage collection metrics
     */
    @Get(':serviceName/gc')
    async getGcMetrics(@Param('serviceName') serviceName: string) {
        return this.metricsService.getGcMetrics(serviceName);
    }

    /**
     * GET /api/metrics/:serviceName/memory
     * Get memory metrics
     */
    @Get(':serviceName/memory')
    async getMemoryMetrics(@Param('serviceName') serviceName: string) {
        return this.metricsService.getMemoryMetrics(serviceName);
    }

    /**
     * GET /api/metrics/:serviceName/statistics
     * Get metrics statistics summary
     */
    @Get(':serviceName/statistics')
    async getMetricsStatistics(@Param('serviceName') serviceName: string) {
        return this.metricsService.getMetricsStatistics(serviceName);
    }

    /**
     * GET /api/metrics/:serviceName/available
     * Get available metric names for a service
     */
    @Get(':serviceName/available')
    async getAvailableMetrics(@Param('serviceName') serviceName: string) {
        return this.metricsService.getAvailableMetrics(serviceName);
    }

    /**
     * GET /api/metrics/:serviceName/:metricName/compare?period=hour|day
     * Compare metrics between two time periods
     */
    @Get(':serviceName/:metricName/compare')
    async compareMetrics(
        @Param('serviceName') serviceName: string,
        @Param('metricName') metricName: string,
        @Query('period') period?: 'hour' | 'day',
    ) {
        return this.metricsService.compareMetrics(
            serviceName,
            metricName,
            period || 'hour',
        );
    }

    /**
     * GET /api/metrics/:serviceName/scope
     * Get metrics grouped by scope
     */
    @Get(':serviceName/scope')
    async getMetricsByScope(@Param('serviceName') serviceName: string) {
        return this.metricsService.getMetricsByScope(serviceName);
    }
}