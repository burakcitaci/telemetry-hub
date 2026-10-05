import { Controller, Get, Param, Query } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { TelemetryQueryDto } from '../../../dto/query.dto';

@Controller('api/metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    // ============= ROOT ENDPOINT =============

    /**
     * GET /api/metrics
     * Get all metrics flattened for UI table with pagination
     */
    @Get()
    async getAllMetricsFlattened(@Query() query: TelemetryQueryDto) {
        return this.metricsService.getAllMetricsFlattened({
            limit: query.limit,
            offset: query.offset,
            service: query.service,
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
    @Query('service') serviceName: string,
    @Query('metric') metricName: string,
    @Query('limit') limit?: string,
) {
    console.log('=== GET /api/metrics/detail ===');
    console.log({
        serviceName,
        metricName,
        limit,
    });



    try {
        const result = await this.metricsService.getMetricDetail(
            serviceName,
            metricName,
            Number(limit) || 1000,
        );

        console.log('=== METRIC DETAIL SUCCESS ===');
        console.log({
            totalRecords: result.totalRecords,
            metricType: result.metricType,
        });

        return result;
    } catch (error) {
        console.error('=== METRIC DETAIL ERROR ===');
        console.error(error);

        throw error;
    }
}
    /**
     * GET /api/metrics/statistics?service=backend-service&metric=http.response_time
     * Get aggregated statistics for a specific metric
     * Must be BEFORE :serviceName route
     */
    @Get('statistics')
    async getMetricStatistics(
        @Query('service') serviceName: string,
        @Query('metric') metricName: string,
    ) {
        if (!serviceName || !metricName) {
            throw new Error('Missing required parameters: service, metric');
        }
        return this.metricsService.getMetricStatistics(serviceName, metricName);
    }

    // ============= DISCOVERY ENDPOINTS =============

    /**
     * GET /api/metrics/discovery/metric-names
     * Get all metric names globally
     * Must be BEFORE :serviceName route
     */
    @Get('discovery/metric-names')
    async getAllMetricNames() {
        return this.metricsService.getAllMetricNames();
    }

    /**
     * GET /api/metrics/discovery/services-overview
     * Get services with their metric counts
     * Must be BEFORE :serviceName route
     */
    @Get('discovery/services-overview')
    async getServicesWithMetricCounts() {
        return this.metricsService.getServicesWithMetricCounts();
    }

    // ============= SERVICE-LEVEL ENDPOINTS =============

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
        return this.metricsService.getMetricsByService(serviceName, {
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
    async getAvailableMetrics(@Param('serviceName') serviceName: string) {
        return this.metricsService.getAvailableMetrics(serviceName);
    }

    /**
     * GET /api/metrics/:serviceName/http/summary
     * Get HTTP metrics (client/server)
     * Must be BEFORE :serviceName/:metricName route
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
     * Must be BEFORE :serviceName/:metricName route
     */
    @Get(':serviceName/gc')
    async getGcMetrics(@Param('serviceName') serviceName: string) {
        return this.metricsService.getGcMetrics(serviceName);
    }

    /**
     * GET /api/metrics/:serviceName/memory
     * Get memory metrics
     * Must be BEFORE :serviceName/:metricName route
     */
    @Get(':serviceName/memory')
    async getMemoryMetrics(@Param('serviceName') serviceName: string) {
        return this.metricsService.getMemoryMetrics(serviceName);
    }

    /**
     * GET /api/metrics/:serviceName/statistics
     * Get metrics statistics summary for a service
     * Must be BEFORE :serviceName/:metricName route
     */
    @Get(':serviceName/statistics')
    async getMetricsStatistics(@Param('serviceName') serviceName: string) {
        return this.metricsService.getMetricsStatistics(serviceName);
    }

    /**
     * GET /api/metrics/:serviceName/scope
     * Get metrics grouped by scope
     * Must be BEFORE :serviceName/:metricName route
     */
    @Get(':serviceName/scope')
    async getMetricsByScope(@Param('serviceName') serviceName: string) {
        return this.metricsService.getMetricsByScope(serviceName);
    }

    // ============= METRIC-LEVEL ENDPOINTS =============

    /**
     * GET /api/metrics/:serviceName/:metricName
     * Get specific metric by name (legacy - use /detail instead for detail page)
     */
    @Get(':serviceName/:metricName')
    async getMetricByName(
        @Param('serviceName') serviceName: string,
        @Param('metricName') metricName: string,
    ) {
        return this.metricsService.getMetricByName(serviceName, metricName);
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
}