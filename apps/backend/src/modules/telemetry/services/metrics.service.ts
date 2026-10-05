import { Injectable } from '@nestjs/common';
import { ClickhouseService } from './clickhouse.service';
import type { TelemetryListOptions } from './clickhouse.service';
import { CentralLoggerService } from '../../../common/logger/central-logger.service';

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
    totalRecords: number;
    records: MetricDetailRecord[];
}

export interface MetricStatistics {
    count: number;
    sum: number;
    min: number;
    max: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    stdDev: number;
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
    serviceName: string,
    metricName: string,
    limit: number = 1000,
): Promise<MetricDetailResponse> {
    // ── Table-specific queries, matching each real schema ─────────────────────
    const queries = {
        // Gauge table: Value only
        gauge: `
            SELECT
                ServiceName, MetricName, MetricDescription, MetricUnit,
                ResourceAttributes, Attributes,
                toString(TimeUnix) AS TimeUnix,
                toString(StartTimeUnix) AS StartTimeUnix,
                Value,
                0 AS Count, Value AS Sum, Value AS Min, Value AS Max,
                [] AS BucketCounts, [] AS ExplicitBounds,
                0 AS AggregationTemporality
            FROM otel_metrics_gauge
            WHERE ServiceName = {serviceName:String}
              AND MetricName = {metricName:String}
            ORDER BY TimeUnix DESC
            LIMIT {limit:UInt32}
        `,
        // Sum table: Value + AggregationTemporality (typical OTel schema)
        sum: `
            SELECT
                ServiceName, MetricName, MetricDescription, MetricUnit,
                ResourceAttributes, Attributes,
                toString(TimeUnix) AS TimeUnix,
                toString(StartTimeUnix) AS StartTimeUnix,
                Value,
                1 AS Count, Value AS Sum, Value AS Min, Value AS Max,
                [] AS BucketCounts, [] AS ExplicitBounds,
                AggregationTemporality
            FROM otel_metrics_sum
            WHERE ServiceName = {serviceName:String}
              AND MetricName = {metricName:String}
            ORDER BY TimeUnix DESC
            LIMIT {limit:UInt32}
        `,
        // Histogram table: Count, Sum, Min, Max, BucketCounts, ExplicitBounds
        histogram: `
            SELECT
                ServiceName, MetricName, MetricDescription, MetricUnit,
                ResourceAttributes, Attributes,
                toString(TimeUnix) AS TimeUnix,
                toString(StartTimeUnix) AS StartTimeUnix,
                0 AS Value,
                Count, Sum, Min, Max,
                BucketCounts, ExplicitBounds,
                AggregationTemporality
            FROM otel_metrics_histogram
            WHERE ServiceName = {serviceName:String}
              AND MetricName = {metricName:String}
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
        TimeUnix: string;
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
            const rows = await this.query<RawRow>(sql, { serviceName, metricName, limit });
            this.logger.log(`[getMetricDetail:${label}] ${rows.length} rows for ${serviceName}/${metricName}`);
            return rows;
        } catch (error) {
            this.logger.error(`[getMetricDetail:${label}] ${(error as Error).message}`);
            return [];
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
        timeUnix: row.TimeUnix,
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
        totalRecords: allRecords.length,
        records: allRecords,
    };
}
    /**
     * Get aggregated statistics for a specific metric
     * Calculates percentiles, standard deviation, etc.
     */
    async getMetricStatistics(
        serviceName: string,
        metricName: string,
    ): Promise<MetricStatistics> {
        // First get all records
        const detail = await this.getMetricDetail(serviceName, metricName, 10000);

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
            };
        }

        const records = detail.records;

        // Aggregate statistics
        const totalCount = records.reduce((sum, r) => sum + r.count, 0);
        const totalSum = records.reduce((sum, r) => sum + r.sum, 0);
        const minVal = Math.min(...records.map((r) => r.min));
        const maxVal = Math.max(...records.map((r) => r.max));
        const mean = totalCount > 0 ? totalSum / totalCount : 0;

        // Expand bucket data to individual values for percentile calculation
        const allValues: number[] = [];
        records.forEach((record) => {
            if (
                record.bucketCounts &&
                record.bucketCounts.length > 0 &&
                record.explicitBounds
            ) {
                record.bucketCounts.forEach((count, idx) => {
                    const bound = record.explicitBounds[idx] || 0;
                    for (let i = 0; i < count; i++) {
                        allValues.push(bound);
                    }
                });
            } else {
                // For sum/gauge records, add the value
                allValues.push(record.sum / (record.count || 1));
            }
        });

        // Sort for percentile calculation
        allValues.sort((a, b) => a - b);

        const getPercentile = (p: number) => {
            if (allValues.length === 0) return 0;
            const index = Math.ceil((p / 100) * allValues.length) - 1;
            return allValues[Math.max(0, index)] || 0;
        };

        // Calculate standard deviation
        const variance =
            allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
            (allValues.length || 1);
        const stdDev = Math.sqrt(variance);

        return {
            count: totalCount,
            sum: totalSum,
            min: minVal,
            max: maxVal,
            mean: Math.round(mean * 100) / 100,
            p50: Math.round(getPercentile(50) * 100) / 100,
            p95: Math.round(getPercentile(95) * 100) / 100,
            p99: Math.round(getPercentile(99) * 100) / 100,
            stdDev: Math.round(stdDev * 100) / 100,
        };
    }

    // ============= EXISTING METHODS =============

    /**
     * Get unique metric definitions from all tables - flattened for UI table display
     */
    async getAllMetricsFlattened(options: TelemetryListOptions = {}) {
        const { limit, offset } = this.normalizeListOptions(options);
        const serviceFilter = options.service
            ? 'WHERE ServiceName = {service:String}'
            : '';
        const queryParams: Record<string, unknown> = { limit, offset };

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

        // Query each metric table
        for (const table of tables) {
            const metricType = this.extractMetricType(table.table_name);

            const query = `
        SELECT DISTINCT
          ServiceName,
          MetricName
        FROM ${table.table_name}
        ${serviceFilter}
        ORDER BY ServiceName, MetricName
      `;

            try {
                const rows = await this.query<{
                    ServiceName: string;
                    MetricName: string;
                }>(query, queryParams);

                rows.forEach((row) => {
                    allMetrics.push({
                        tableName: table.table_name,
                        metricType,
                        serviceName: row.ServiceName,
                        metricName: row.MetricName,
                    });
                });
            } catch (error) {
                this.logger.warn(
                    `Failed to query ${table.table_name}: ${(error as Error).message}`,
                );
            }
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
      WHERE ServiceName = {serviceName:String}
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
        }>(query, { serviceName, limit, offset });

        return results.map((row) => this.normalizeMetric(row));
    }

    /**
     * Get specific metric by name for a service
     */
    async getMetricByName(serviceName: string, metricName: string) {
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
      WHERE ServiceName = {serviceName:String}
        AND MetricName = {metricName:String}
      ORDER BY TimeUnix DESC
      LIMIT 100
    `;

        return this.query(query, { serviceName, metricName });
    }

    /**
     * Get metrics aggregated by scope
     */
    async getMetricsByScope(serviceName: string) {
        const query = `
      SELECT
        ScopeName,
        ScopeVersion,
        arrayMap(
          x -> (
            'metricName': MetricName,
            'metricDescription': MetricDescription,
            'metricUnit': MetricUnit,
            'count': Count,
            'sum': Sum,
            'min': Min,
            'max': Max,
            'avg': Sum / Count
          ),
          groupArray(MetricName)
        ) AS metrics
      FROM otel_metrics_histogram
      WHERE ServiceName = {serviceName:String}
      GROUP BY ScopeName, ScopeVersion
    `;

        return this.query(query, { serviceName });
    }

    /**
     * Get HTTP metrics (client and server)
     */
    async getHttpMetrics(
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
      WHERE ServiceName = {serviceName:String}
        AND (MetricName LIKE 'http.%')
        ${typeFilter}
      ORDER BY TimeUnix DESC
      LIMIT {limit:UInt32}
    `;

        const results = await this.query(query, { serviceName, limit });
        return results.map((row) => this.normalizeMetric(row));
    }

    /**
     * Get garbage collection metrics
     */
    async getGcMetrics(serviceName: string) {
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
      WHERE ServiceName = {serviceName:String}
        AND MetricName LIKE '%gc%'
      ORDER BY TimeUnix DESC
      LIMIT 100
    `;

        const results = await this.query(query, { serviceName });
        return results.map((row) => this.normalizeMetric(row));
    }

    /**
     * Get memory metrics
     */
    async getMemoryMetrics(serviceName: string) {
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
      WHERE ServiceName = {serviceName:String}
        AND (MetricName LIKE '%memory%' OR MetricName LIKE '%heap%')
      ORDER BY TimeUnix DESC
      LIMIT 100
    `;

        const results = await this.query(query, { serviceName });
        return results.map((row) => this.normalizeMetric(row));
    }

    /**
     * Get metric statistics summary for a service
     */
    async getMetricsStatistics(serviceName: string) {
        const query = `
      SELECT
        count(DISTINCT MetricName) AS total_metrics,
        count() AS total_measurements,
        uniqExact(ScopeName) AS unique_scopes,
        min(TimeUnix) AS earliest_timestamp,
        max(TimeUnix) AS latest_timestamp,
        avg(Sum / Count) AS overall_avg_value
      FROM otel_metrics_histogram
      WHERE ServiceName = {serviceName:String}
    `;

        const [result] = await this.query<{
            total_metrics: number;
            total_measurements: number;
            unique_scopes: number;
            earliest_timestamp: string;
            latest_timestamp: string;
            overall_avg_value: number;
        }>(query, { serviceName });

        return result || {};
    }

    /**
     * Get metric names available for a service
     */
    async getAvailableMetrics(serviceName: string) {
        const query = `
      SELECT DISTINCT
        MetricName,
        MetricDescription,
        MetricUnit
      FROM otel_metrics_histogram
      WHERE ServiceName = {serviceName:String}
      ORDER BY MetricName
    `;

        return this.query(query, { serviceName });
    }

    /**
     * Get all service names that have metrics
     */
    async getServiceNames() {
        const query = `
      SELECT DISTINCT ServiceName
      FROM otel_metrics_histogram
      ORDER BY ServiceName
    `;

        const results = await this.query<{ ServiceName: string }>(query);
        return results.map((row) => row.ServiceName);
    }

    /**
     * Get all metric names globally
     */
    async getAllMetricNames() {
        const query = `
      SELECT DISTINCT
        MetricName,
        MetricDescription,
        MetricUnit
      FROM otel_metrics_histogram
      ORDER BY MetricName
    `;

        return this.query(query);
    }

    /**
     * Get services with their metric counts
     */
    async getServicesWithMetricCounts() {
        const query = `
      SELECT
        ServiceName,
        count(DISTINCT MetricName) AS metric_count,
        count() AS total_measurements,
        max(TimeUnix) AS latest_timestamp
      FROM otel_metrics_histogram
      GROUP BY ServiceName
      ORDER BY ServiceName
    `;

        return this.query<{
            ServiceName: string;
            metric_count: number;
            total_measurements: number;
            latest_timestamp: string;
        }>(query);
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
      WHERE database = 'default'
      ORDER BY name
    `;

        return this.query<{
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
      WHERE database = 'default' AND name LIKE '%metric%'
      ORDER BY name
    `;

        return this.query<{
            table_name: string;
            engine: string;
            total_bytes: number;
            total_rows: number;
        }>(query);
    }

    /**
     * Get service names and metric names from all metric tables
     */
    async getAllMetricsFromTables() {
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
        ORDER BY ServiceName, MetricName
      `;

            try {
                const rows = await this.query<{
                    ServiceName: string;
                    MetricName: string;
                }>(query);

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
    async getMetricsFromTable(tableName: string) {
        // Validate table name to prevent SQL injection
        if (!/^[a-z_0-9]*metric[a-z_0-9]*$/i.test(tableName)) {
            throw new Error('Invalid table name');
        }

        const query = `
      SELECT DISTINCT
        ServiceName,
        MetricName
      FROM ${tableName}
      ORDER BY ServiceName, MetricName
    `;

        return this.query<{
            ServiceName: string;
            MetricName: string;
        }>(query);
    }

    /**
     * Compare metrics between two time periods
     */
    async compareMetrics(
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
      WHERE ServiceName = {serviceName:String}
        AND MetricName = {metricName:String}
        AND TimeUnix > now() - ${intervalFunc}(2)
      ORDER BY TimeUnix DESC
    `;

        const results = await this.query(query, { serviceName, metricName });
        return this.groupByTimePeriod(results);
    }

    // ============= PRIVATE HELPER METHODS =============

    private async query<T = Record<string, unknown>>(
        query: string,
        queryParams: Record<string, unknown> = {},
    ): Promise<T[]> {
        return this.clickhouseService['query'](query, queryParams);
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
            this.logger.warn(
                `Failed to parse JSON: ${jsonString.substring(0, 100)} - ${(error as Error).message}`,
            );
            return null;
        }
    }
}