import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { context, trace } from '@opentelemetry/api';
import { ClickhouseService } from './clickhouse.service';
import type { TelemetryListOptions } from './clickhouse.service';
import { metricTimeWindow, type TelemetryTimeWindow } from './telemetry-time-window';
import { CentralLoggerService } from '../../../common/logger/central-logger.service';
import type { TenantScope } from '../../auth/auth.types';

// ============= TYPES & INTERFACES =============

export interface MetricSummary {
    metricName: string;
    metricDescription: string;
    metricUnit: string;
    serviceName: string;
    attributes: Record<string, string>;
    count: number;
    sum: number;
    min: number;
    max: number;
    average: number;
    bucketCounts: number[];
    explicitBounds: number[];
    timeUnix: string;
}

export interface ServiceMetricsOverview {
    serviceName: string;
    metricsCount: number;
    metrics: MetricSummary[];
}

export interface MetricsByScopeResult {
    scopeName: string;
    scopeVersion: string;
    metrics: MetricSummary[];
}

export interface MetricDetailRecord {
    serviceName: string;
    metricName: string;
    metricType: 'histogram' | 'sum' | 'gauge' | 'summary' | 'unknown';
    metricDescription: string;
    metricUnit: string;
    attributes: Record<string, string>;
    resourceAttributes: Record<string, string>;
    tableName: string;
    timeUnix: string;
    startTimeUnix: string;
    count: number;
    sum: number;
    min: number;
    max: number;
    bucketCounts: number[];
    explicitBounds: number[];
    aggregationTemporality?: number;
}

export interface MetricDetailResponse {
    serviceName: string;
    metricName: string;
    metricType: string;
    returnedRecords: number;
    truncated: boolean;
    records: MetricDetailRecord[];
}

export interface MetricStatistics {
    count: number;
    sum: number;
    min: number;
    max: number;
    mean: number;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    stdDev: number | null;
    distributionComplete: boolean;
}

interface WeightedValue { value: number; count: number }

export function summarizeDistribution(records: MetricDetailRecord[], mean: number) {
    const values: WeightedValue[] = [];
    let overflowCount = 0;
    for (const record of records) {
        if (!record.bucketCounts.length) {
            values.push({ value: record.sum / (record.count || 1), count: 1 });
            continue;
        }
        record.bucketCounts.forEach((count, index) => {
            const bound = record.explicitBounds[index];
            if (bound === undefined) overflowCount += count;
            else if (count > 0) values.push({ value: bound, count });
        });
    }
    values.sort((left, right) => left.value - right.value);
    const finiteCount = values.reduce((total, item) => total + item.count, 0);
    const percentile = (ratio: number) => weightedPercentile(values, finiteCount + overflowCount, ratio);
    const variance = overflowCount ? null : values.reduce((total, item) =>
        total + item.count * Math.pow(item.value - mean, 2), 0) / Math.max(1, finiteCount);
    return { p50: percentile(.5), p95: percentile(.95), p99: percentile(.99),
        stdDev: variance === null ? null : Math.sqrt(variance), distributionComplete: overflowCount === 0 };
}

function weightedPercentile(values: WeightedValue[], total: number, ratio: number): number | null {
    const target = Math.ceil(total * ratio);
    let cumulative = 0;
    for (const item of values) {
        cumulative += item.count;
        if (cumulative >= target) return item.value;
    }
    return null;
}

// ============= SERVICE =============

@Injectable()
export class MetricsService {
    constructor(
        private readonly clickhouseService: ClickhouseService,
        private readonly logger: CentralLoggerService,
    ) { }

    // ============= NEW METHODS FOR DETAIL PAGE =============

    /**
     * Get detailed metric records with all histogram data
     * Used by the detail page to display charts and tables
     */
 async getMetricDetail(
    scope: TenantScope,
    serviceName: string,
    metricName: string,
    limit: number = 1000,
    window: TelemetryTimeWindow = {},
): Promise<MetricDetailResponse> {
    const timeWindow = metricTimeWindow(window);
    const isolation = this.clickhouseService.buildTenantFilter(scope, [
        'ServiceName = {serviceName:String}',
        'MetricName = {metricName:String}',
        ...(timeWindow.sql ? [timeWindow.sql] : []),
    ]);
    // ── Table-specific queries, matching each real schema ─────────────────────
    const queries = {
        // Gauge table: Value only
        gauge: `
            SELECT
                ServiceName, MetricName, MetricDescription, MetricUnit,
                ResourceAttributes, Attributes,
                toString(TimeUnix) AS TimeUnixText,
                toString(StartTimeUnix) AS StartTimeUnix,
                Value,
                0 AS Count, Value AS Sum, Value AS Min, Value AS Max,
                [] AS BucketCounts, [] AS ExplicitBounds,
                0 AS AggregationTemporality
            FROM otel_metrics_gauge
            ${isolation.where}
            ORDER BY TimeUnix DESC
            LIMIT {limit:UInt32}
        `,
        // Sum table: Value + AggregationTemporality (typical OTel schema)
        sum: `
            SELECT
                ServiceName, MetricName, MetricDescription, MetricUnit,
                ResourceAttributes, Attributes,
                toString(TimeUnix) AS TimeUnixText,
                toString(StartTimeUnix) AS StartTimeUnix,
                Value,
                1 AS Count, Value AS Sum, Value AS Min, Value AS Max,
                [] AS BucketCounts, [] AS ExplicitBounds,
                AggregationTemporality
            FROM otel_metrics_sum
            ${isolation.where}
            ORDER BY TimeUnix DESC
            LIMIT {limit:UInt32}
        `,
        // Histogram table: Count, Sum, Min, Max, BucketCounts, ExplicitBounds
        histogram: `
            SELECT
                ServiceName, MetricName, MetricDescription, MetricUnit,
                ResourceAttributes, Attributes,
                toString(TimeUnix) AS TimeUnixText,
                toString(StartTimeUnix) AS StartTimeUnix,
                0 AS Value,
                Count, Sum, Min, Max,
                BucketCounts, ExplicitBounds,
                AggregationTemporality
            FROM otel_metrics_histogram
            ${isolation.where}
            ORDER BY TimeUnix DESC
            LIMIT {limit:UInt32}
        `,
    };

    type RawRow = {
        ServiceName: string;
        MetricName: string;
        MetricDescription: string;
        MetricUnit: string;
        ResourceAttributes: Record<string, string> | string;
        Attributes: Record<string, string> | string;
        TimeUnixText: string;
        StartTimeUnix: string;
        Value: number;
        Count: number;
        Sum: number;
        Min: number;
        Max: number;
        BucketCounts: number[];
        ExplicitBounds: number[];
        AggregationTemporality: number;
    };

    const runQuery = async (sql: string, label: string): Promise<RawRow[]> => {
        try {
            const rows = await this.query<RawRow>(scope, sql, {
                serviceName, metricName, limit, ...timeWindow.params,
            });
            this.logger.log(`[getMetricDetail:${label}] ${rows.length} rows for ${serviceName}/${metricName}`);
            return rows;
        } catch (cause) {
            const traceId = trace.getSpan(context.active())?.spanContext().traceId;
            throw new ServiceUnavailableException({
                code: 'TELEMETRY_QUERY_FAILED',
                message: 'Metrik-Daten sind momentan nicht verfügbar.',
                ...(traceId ? { traceId } : {}),
            }, { cause: cause instanceof Error ? cause : new Error(String(cause)) });
        }
    };

    const [gaugeRows, sumRows, histogramRows] = await Promise.all([
        runQuery(queries.gauge, 'gauge'),
        runQuery(queries.sum, 'sum'),
        runQuery(queries.histogram, 'histogram'),
    ]);

    // ── Normalize into MetricDetailRecord ────────────────────────────────────
    const mapRow = (
        row: RawRow,
        type: 'gauge' | 'sum' | 'histogram',
        table: string,
    ): MetricDetailRecord => ({
        serviceName: row.ServiceName,
        metricName: row.MetricName,
        metricType: type,
        metricDescription: row.MetricDescription || '',
        metricUnit: row.MetricUnit || '',
        attributes:
            typeof row.Attributes === 'string'
                ? (this.parseJson(row.Attributes) ?? {})
                : (row.Attributes ?? {}),
        resourceAttributes:
            typeof row.ResourceAttributes === 'string'
                ? (this.parseJson(row.ResourceAttributes) ?? {})
                : (row.ResourceAttributes ?? {}),
        tableName: table,
        timeUnix: row.TimeUnixText,
        startTimeUnix: row.StartTimeUnix,
        count: Number(row.Count) || 1,
        sum: Number(row.Sum),
        min: Number(row.Min),
        max: Number(row.Max),
        bucketCounts: Array.isArray(row.BucketCounts) ? row.BucketCounts : [],
        explicitBounds: Array.isArray(row.ExplicitBounds) ? row.ExplicitBounds : [],
        aggregationTemporality: row.AggregationTemporality,
    });

    const allRecords: MetricDetailRecord[] = [
        ...gaugeRows.map((r) => mapRow(r, 'gauge', 'otel_metrics_gauge')),
        ...sumRows.map((r) => mapRow(r, 'sum', 'otel_metrics_sum')),
        ...histogramRows.map((r) => mapRow(r, 'histogram', 'otel_metrics_histogram')),
    ];

    allRecords.sort(
        (a, b) => new Date(b.timeUnix).getTime() - new Date(a.timeUnix).getTime(),
    );

    const metricType: string =
        histogramRows.length > 0 ? 'histogram' :
        sumRows.length > 0       ? 'sum' :
        gaugeRows.length > 0     ? 'gauge' :
        'unknown';

    return {
        serviceName,
        metricName,
        metricType,
        returnedRecords: allRecords.length,
        truncated: [gaugeRows, sumRows, histogramRows].some(rows => rows.length === limit),
        records: allRecords,
    };
}
    /**
     * Get aggregated statistics for a specific metric
     * Calculates percentiles, standard deviation, etc.
     */
    async getMetricStatistics(
        scope: TenantScope,
        serviceName: string,
        metricName: string,
    ): Promise<MetricStatistics> {
        // First get all records
        const detail = await this.getMetricDetail(scope, serviceName, metricName, 10000);

        if (detail.records.length === 0) {
            return {
                count: 0,
                sum: 0,
                min: 0,
                max: 0,
                mean: 0,
                p50: 0,
                p95: 0,
                p99: 0,
                stdDev: 0,
                distributionComplete: true,
            };
        }

        const records = detail.records;

        // Aggregate statistics
        const totalCount = records.reduce((sum, r) => sum + r.count, 0);
        const totalSum = records.reduce((sum, r) => sum + r.sum, 0);
        const minVal = Math.min(...records.map((r) => r.min));
        const maxVal = Math.max(...records.map((r) => r.max));
        const mean = totalCount > 0 ? totalSum / totalCount : 0;

        const distribution = summarizeDistribution(records, mean);
        const round = (value: number | null) => value === null ? null : Math.round(value * 100) / 100;

        return {
            count: totalCount,
            sum: totalSum,
            min: minVal,
            max: maxVal,
            mean: Math.round(mean * 100) / 100,
            p50: round(distribution.p50),
            p95: round(distribution.p95),
            p99: round(distribution.p99),
            stdDev: round(distribution.stdDev),
            distributionComplete: distribution.distributionComplete,
        };
    }

    // ============= EXISTING METHODS =============

    /**
     * Get unique metric definitions from all tables - flattened for UI table display
     */
    async getAllMetricsFlattened(
        scope: TenantScope,
        options: TelemetryListOptions & TelemetryTimeWindow = {},
    ) {
        const { limit, offset } = this.normalizeListOptions(options);
        const timeWindow = metricTimeWindow(options);
        const predicates = [options.service ? 'ServiceName = {service:String}' : '', timeWindow.sql].filter(Boolean);
        const isolation = this.clickhouseService.buildTenantFilter(scope, predicates);
        const queryParams: Record<string, unknown> = { limit, offset, ...timeWindow.params };

        if (options.service) {
            queryParams.service = options.service;
        }

        const tables = await this.getMetricTables();
        const allMetrics: Array<{
            tableName: string;
            metricType: string;
            serviceName: string;
            metricName: string;
        }> = [];

        const failures: string[] = [];
        for (const table of tables) {
            const metricType = this.extractMetricType(table.table_name);

            const query = `
        SELECT DISTINCT
          ServiceName,
          MetricName
        FROM ${table.table_name}
        ${isolation.where}
        ORDER BY ServiceName, MetricName
      `;

            try {
                const rows = await this.query<{
                    ServiceName: string;
                    MetricName: string;
                }>(scope, query, queryParams);

                rows.forEach((row) => {
                    allMetrics.push({
                        tableName: table.table_name,
                        metricType,
                        serviceName: row.ServiceName,
                        metricName: row.MetricName,
                    });
                });
            } catch (error) {
                failures.push(table.table_name);
                this.logger.warn(
                    `Failed to query ${table.table_name}: ${(error as Error).message}`,
                );
            }
        }

        if (failures.length) {
            throw new ServiceUnavailableException({ message: 'Metric inventory is incomplete.',
                failedTables: failures, successfulTables: tables.length - failures.length });
        }

        // Apply pagination to combined results
        const paginatedMetrics = allMetrics.slice(offset, offset + limit);

        return {
            total: allMetrics.length,
            limit,
            offset,
            service: options.service || null,
            metrics: paginatedMetrics,
        };
    }

    /**
     * Get all metrics for a specific service
     */
    async getMetricsByService(
        scope: TenantScope,
        serviceName: string,
        options: TelemetryListOptions = {},
    ) {
        const { limit, offset } = this.normalizeListOptions(options);

        const query = `
      SELECT
        MetricName,
        MetricDescription,
        MetricUnit,
        ServiceName,
        Attributes,
        Count,
        Sum,
        Min,
        Max,
        BucketCounts,
        ExplicitBounds,
        toString(TimeUnix) AS TimeUnix
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope, ['ServiceName = {serviceName:String}']).where}
      ORDER BY TimeUnix DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

        const results = await this.query<{
            MetricName: string;
            MetricDescription: string;
            MetricUnit: string;
            ServiceName: string;
            Attributes: Record<string, string>;
            Count: number;
            Sum: number;
            Min: number;
            Max: number;
            BucketCounts: number[];
            ExplicitBounds: number[];
            TimeUnix: string;
        }>(scope, query, { serviceName, limit, offset });

        return results.map((row) => this.normalizeMetric(row));
    }

    /**
     * Get specific metric by name for a service
     */
    async getMetricByName(scope: TenantScope, serviceName: string, metricName: string) {
        const query = `
      SELECT
        MetricName,
        MetricDescription,
        MetricUnit,
        ServiceName,
        Attributes,
        Count,
        Sum,
        Min,
        Max,
        BucketCounts,
        ExplicitBounds,
        toString(TimeUnix) AS TimeUnix
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope, [
          'ServiceName = {serviceName:String}',
          'MetricName = {metricName:String}',
      ]).where}
      ORDER BY TimeUnix DESC
      LIMIT 100
    `;

        return this.query(scope, query, { serviceName, metricName });
    }

    /**
     * Get metrics aggregated by scope
     */
    async getMetricsByScope(scope: TenantScope, serviceName: string) {
        const query = `
      SELECT
        ScopeName,
        ScopeVersion,
        groupArray(tuple(
          MetricName, MetricDescription, MetricUnit, Count, Sum, Min, Max,
          if(Count = 0, null, Sum / Count)
        )) AS metrics
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope, ['ServiceName = {serviceName:String}']).where}
      GROUP BY ScopeName, ScopeVersion
    `;

        return this.query(scope, query, { serviceName });
    }

    /**
     * Get HTTP metrics (client and server)
     */
    async getHttpMetrics(
        scope: TenantScope,
        serviceName: string,
        options: { type?: 'client' | 'server'; limit?: number } = {},
    ) {
        const { limit = 100 } = options;
        const typeFilter =
            options.type === 'client'
                ? "AND MetricName LIKE '%client%'"
                : options.type === 'server'
                    ? "AND MetricName LIKE '%server%'"
                    : '';

        const query = `
      SELECT
        MetricName,
        MetricDescription,
        MetricUnit,
        ServiceName,
        Attributes,
        Count,
        Sum,
        Min,
        Max,
        (Sum / Count) AS Average,
        BucketCounts,
        ExplicitBounds,
        toString(TimeUnix) AS TimeUnix
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope, [
          'ServiceName = {serviceName:String}',
          "(MetricName LIKE 'http.%')",
          typeFilter.replace(/^AND\s+/, ''),
      ]).where}
      ORDER BY TimeUnix DESC
      LIMIT {limit:UInt32}
    `;

        const results = await this.query(scope, query, { serviceName, limit });
        return results.map((row) => this.normalizeMetric(row));
    }

    /**
     * Get garbage collection metrics
     */
    async getGcMetrics(scope: TenantScope, serviceName: string) {
        const query = `
      SELECT
        MetricName,
        MetricDescription,
        MetricUnit,
        ServiceName,
        Attributes,
        Count,
        Sum,
        Min,
        Max,
        (Sum / Count) AS Average,
        BucketCounts,
        ExplicitBounds,
        toString(TimeUnix) AS TimeUnix
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope, [
          'ServiceName = {serviceName:String}',
          "MetricName LIKE '%gc%'",
      ]).where}
      ORDER BY TimeUnix DESC
      LIMIT 100
    `;

        const results = await this.query(scope, query, { serviceName });
        return results.map((row) => this.normalizeMetric(row));
    }

    /**
     * Get memory metrics
     */
    async getMemoryMetrics(scope: TenantScope, serviceName: string) {
        const query = `
      SELECT
        MetricName,
        MetricDescription,
        MetricUnit,
        ServiceName,
        Attributes,
        Count,
        Sum,
        Min,
        Max,
        (Sum / Count) AS Average,
        BucketCounts,
        ExplicitBounds,
        toString(TimeUnix) AS TimeUnix
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope, [
          'ServiceName = {serviceName:String}',
          "(MetricName LIKE '%memory%' OR MetricName LIKE '%heap%')",
      ]).where}
      ORDER BY TimeUnix DESC
      LIMIT 100
    `;

        const results = await this.query(scope, query, { serviceName });
        return results.map((row) => this.normalizeMetric(row));
    }

    /**
     * Get metric statistics summary for a service
     */
    async getMetricsStatistics(scope: TenantScope, serviceName: string) {
        const query = `
      SELECT
        count(DISTINCT MetricName) AS total_metrics,
        count() AS total_measurements,
        uniqExact(ScopeName) AS unique_scopes,
        min(TimeUnix) AS earliest_timestamp,
        max(TimeUnix) AS latest_timestamp
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope, ['ServiceName = {serviceName:String}']).where}
    `;

        const [result] = await this.query<{
            total_metrics: number;
            total_measurements: number;
            unique_scopes: number;
            earliest_timestamp: string;
            latest_timestamp: string;
        }>(scope, query, { serviceName });

        return result || {};
    }

    /**
     * Get metric names available for a service
     */
    async getAvailableMetrics(scope: TenantScope, serviceName: string) {
        const isolation = this.clickhouseService.buildTenantFilter(scope, ['ServiceName = {serviceName:String}']);
        const query = `
      SELECT DISTINCT MetricName, MetricDescription, MetricUnit FROM (
        SELECT MetricName, MetricDescription, MetricUnit FROM otel_metrics_gauge ${isolation.where}
        UNION ALL
        SELECT MetricName, MetricDescription, MetricUnit FROM otel_metrics_sum ${isolation.where}
        UNION ALL
        SELECT MetricName, MetricDescription, MetricUnit FROM otel_metrics_histogram ${isolation.where}
      )
      ORDER BY MetricName
    `;

        return this.query(scope, query, { serviceName });
    }

    /**
     * Get all service names that have metrics
     */
    async getServiceNames(scope: TenantScope) {
        const query = `
      SELECT DISTINCT ServiceName
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope).where}
      ORDER BY ServiceName
    `;

        const results = await this.query<{ ServiceName: string }>(scope, query);
        return results.map((row) => row.ServiceName);
    }

    /**
     * Get all metric names globally
     */
    async getAllMetricNames(scope: TenantScope) {
        const query = `
      SELECT DISTINCT
        MetricName,
        MetricDescription,
        MetricUnit
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope).where}
      ORDER BY MetricName
    `;

        return this.query(scope, query);
    }

    /**
     * Get services with their metric counts
     */
    async getServicesWithMetricCounts(scope: TenantScope) {
        const query = `
      SELECT
        ServiceName,
        count(DISTINCT MetricName) AS metric_count,
        count() AS total_measurements,
        max(TimeUnix) AS latest_timestamp
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope).where}
      GROUP BY ServiceName
      ORDER BY ServiceName
    `;

        return this.query<{
            ServiceName: string;
            metric_count: number;
            total_measurements: number;
            latest_timestamp: string;
        }>(scope, query);
    }

    /**
     * Get all tables from default database
     */
    async getAllTables() {
        const query = `
      SELECT
        name AS table_name,
        engine,
        total_bytes,
        total_rows
      FROM system.tables
      WHERE database = currentDatabase()
      ORDER BY name
    `;

        return this.systemQuery<{
            table_name: string;
            engine: string;
            total_bytes: number;
            total_rows: number;
        }>(query);
    }

    /**
     * Get all metric tables (containing 'metric' in name)
     */
    async getMetricTables() {
        const query = `
      SELECT
        name AS table_name,
        engine,
        total_bytes,
        total_rows
      FROM system.tables
      WHERE database = currentDatabase() AND name LIKE '%metric%'
      ORDER BY name
    `;

        return this.systemQuery<{
            table_name: string;
            engine: string;
            total_bytes: number;
            total_rows: number;
        }>(query);
    }

    /**
     * Get service names and metric names from all metric tables
     */
    async getAllMetricsFromTables(scope: TenantScope) {
        // First get all metric table names
        const tables = await this.getMetricTables();

        const result = [];

        // Query each metric table for service names and metric names
        for (const table of tables) {
            const query = `
        SELECT DISTINCT
          ServiceName,
          MetricName
        FROM ${table.table_name}
        ${this.clickhouseService.buildTenantFilter(scope).where}
        ORDER BY ServiceName, MetricName
      `;

            try {
                const rows = await this.query<{
                    ServiceName: string;
                    MetricName: string;
                }>(scope, query);

                result.push({
                    table: table.table_name,
                    metrics: rows,
                    count: rows.length,
                });
            } catch (error) {
                // Skip if table doesn't have these columns
                result.push({
                    table: table.table_name,
                    metrics: [],
                    error: `Could not query table: ${(error as Error).message}`,
                    count: 0,
                });
            }
        }

        return result;
    }

    /**
     * Get service/metric pairs from specific metric table
     */
    async getMetricsFromTable(scope: TenantScope, tableName: string) {
        // Validate table name to prevent SQL injection
        if (!/^[a-z_0-9]*metric[a-z_0-9]*$/i.test(tableName)) {
            throw new Error('Invalid table name');
        }

        const query = `
      SELECT DISTINCT
        ServiceName,
        MetricName
      FROM ${tableName}
      ${this.clickhouseService.buildTenantFilter(scope).where}
      ORDER BY ServiceName, MetricName
    `;

        return this.query<{
            ServiceName: string;
            MetricName: string;
        }>(scope, query);
    }

    /**
     * Compare metrics between two time periods
     */
    async compareMetrics(
        scope: TenantScope,
        serviceName: string,
        metricName: string,
        timePeriod: 'hour' | 'day',
    ) {
        const intervalFunc =
            timePeriod === 'hour' ? 'toIntervalHour' : 'toIntervalDay';

        const query = `
      SELECT
        MetricName,
        Attributes,
        Count,
        Sum,
        Min,
        Max,
        (Sum / Count) AS Average,
        toString(TimeUnix) AS TimeUnix
      FROM otel_metrics_histogram
      ${this.clickhouseService.buildTenantFilter(scope, [
          'ServiceName = {serviceName:String}',
          'MetricName = {metricName:String}',
          `TimeUnix > now() - ${intervalFunc}(2)`,
      ]).where}
      ORDER BY TimeUnix DESC
    `;

        const results = await this.query(scope, query, { serviceName, metricName });
        return this.groupByTimePeriod(results);
    }

    // ============= PRIVATE HELPER METHODS =============

    private async query<T = Record<string, unknown>>(
        scope: TenantScope,
        query: string,
        queryParams: Record<string, unknown> = {},
    ): Promise<T[]> {
        return this.clickhouseService.executeTenantQuery<T>(scope, query, queryParams);
    }

    private async systemQuery<T = Record<string, unknown>>(
        query: string,
        queryParams: Record<string, unknown> = {},
    ): Promise<T[]> {
        return this.clickhouseService.executeSystemQuery<T>(query, queryParams);
    }

    private normalizeMetric(row: any): MetricSummary {
        return {
            metricName: row.MetricName,
            metricDescription: row.MetricDescription || '',
            metricUnit: row.MetricUnit || '',
            serviceName: row.ServiceName,
            attributes: row.Attributes || {},
            count: Number(row.Count),
            sum: Number(row.Sum),
            min: Number(row.Min),
            max: Number(row.Max),
            average: Number(row.Sum) / Number(row.Count),
            bucketCounts: row.BucketCounts || [],
            explicitBounds: row.ExplicitBounds || [],
            timeUnix: row.TimeUnix,
        };
    }

    private normalizeListOptions(options: TelemetryListOptions) {
        const DEFAULT_LIMIT = 100;
        const MAX_LIMIT = 500;

        return {
            limit: Math.min(
                Math.max(Math.trunc(options.limit ?? DEFAULT_LIMIT), 1),
                MAX_LIMIT,
            ),
            offset: Math.max(options.offset ?? 0, 0),
        };
    }

    private groupByTimePeriod(results: any[]) {
        const grouped = new Map<string, any[]>();

        results.forEach((row) => {
            const key = row.TimeUnix;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(row);
        });

        return Array.from(grouped.entries()).map(([period, metrics]) => ({
            period,
            metrics,
            avgMetric:
                metrics.reduce((sum, m) => sum + (m.Sum / m.Count), 0) /
                metrics.length,
        }));
    }

    /**
     * Extract metric type from table name
     */
    private extractMetricType(tableName: string): string {
        // Extract type from table name like otel_metrics_histogram -> histogram
        const match = tableName.match(/metrics_(\w+)$/);
        if (match && match[1]) {
            return match[1];
        }
        return 'unknown';
    }

    /**
     * Helper method to parse JSON strings safely
     */
    private parseJson(jsonString: string | Record<string, unknown>): Record<string, string> | null {
        if (!jsonString) return null;

        // Already parsed
        if (typeof jsonString === 'object') {
            return jsonString as Record<string, string>;
        }

        try {
            return JSON.parse(jsonString);
        } catch (error) {
            this.logger.warn(`Failed to parse metric attribute JSON (${jsonString.length} characters): ${(error as Error).name}`);
            return null;
        }
    }
}
