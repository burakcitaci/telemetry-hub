import { context } from '@opentelemetry/api';
import { suppressTracing } from '@opentelemetry/core';
import {
  createClient,
  type ClickHouseClient,
  type ClickHouseSettings,
} from '@clickhouse/client';
import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { telemetryTimeWindow } from './telemetry-time-window';
import { telemetryEnvironment } from './telemetry-environment';
import type { ClickhouseConfig } from '../../../config/clickhouse.config';
import { CentralLoggerService } from '../../../common/logger/central-logger.service';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const LIST_QUERY_SETTINGS: ClickHouseSettings = {
  max_rows_to_read: '200000',
  max_bytes_to_read: String(64 * 1024 * 1024),
  read_overflow_mode: 'throw',
  max_result_rows: String(MAX_LIMIT),
  max_result_bytes: String(8 * 1024 * 1024),
  result_overflow_mode: 'throw',
  max_memory_usage: String(256 * 1024 * 1024),
  max_execution_time: 10,
  timeout_overflow_mode: 'throw',
};

// DISTINCT discovery must inspect the full history, not a list-sized sample.
const ENVIRONMENT_QUERY_SETTINGS: ClickHouseSettings = {
  ...LIST_QUERY_SETTINGS,
  max_rows_to_read: '0',
  max_bytes_to_read: '0',
  max_result_rows: '1000',
};

export interface TelemetryListOptions {
  env?: string;
  limit?: number;
  offset?: number;
  service?: string;
}

export interface LogsListOptions extends TelemetryListOptions {
  from?: string;
  to?: string;
}

export interface TelemetryStreamOptions {
  since: Date;
  until: Date;
}

export interface TelemetryChangeSignal {
  eventCount: number;
  fingerprint: string;
}

@Injectable()
export class ClickhouseService implements OnModuleInit, OnModuleDestroy {
  private client!: ClickHouseClient;
  private database = 'default';

  constructor(
    private readonly logger: CentralLoggerService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const config =
      this.configService.getOrThrow<ClickhouseConfig>('clickhouse');
    const url = this.buildUrl(config.host, config.port);

    this.database = config.database;
    this.client = createClient({
      url,
      database: config.database,
      username: config.username,
      password: config.password,
      request_timeout: config.timeout,
      application: 'telemetry-hub-backend',
    });

    this.logger.logWithAttributes(
      'ClickHouse client initialized',
      'INFO',
      { url, database: config.database },
      'ClickhouseService',
    );

    await this.checkRequiredTables();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  async ping(): Promise<void> {
    const result = await this.withTracingSuppressed(() => this.client.ping());
    if (result.success === false) {
      throw result.error;
    }
  }

  async getEnvironments(source: 'metrics' | 'logs' | 'traces'): Promise<string[]> {
    const tables = {
      metrics: ['otel_metrics_gauge', 'otel_metrics_sum', 'otel_metrics_histogram'],
      logs: ['otel_logs'],
      traces: ['otel_traces'],
    }[source];
    const branches = tables.map((table) => `
      SELECT DISTINCT ResourceAttributes['deployment.environment.name'] AS environment
      FROM ${table} WHERE ResourceAttributes['deployment.environment.name'] != ''
    `);
    try {
      const rows = await this.query<{ environment: string }>(
        `SELECT DISTINCT environment FROM (${branches.join(' UNION ALL ')}) ORDER BY environment`,
        {}, ENVIRONMENT_QUERY_SETTINGS,
      );
      return rows.map((row) => row.environment);
    } catch (cause) {
      throw new ServiceUnavailableException({
        code: 'ENVIRONMENT_DISCOVERY_FAILED',
        message: 'Environment-Optionen sind momentan nicht verfügbar.',
      }, { cause });
    }
  }

  async getTraces(options: TelemetryListOptions = {}) {
    const { limit, offset } = this.normalizeListOptions(options);
    const environment = telemetryEnvironment(options.env);
    const serviceFilter = options.service
      ? 'HAVING countIf(ServiceName = {service:String}) > 0'
      : '';
    const queryParams: Record<string, unknown> = { limit, offset, ...environment.params };

    if (options.service) {
      queryParams.service = options.service;
    }

    const query = `
      SELECT
        TraceId,
        RootSpanId AS SpanId,
        RootSpanName AS SpanName,
        RootServiceName AS ServiceName,
        TraceStart AS Timestamp,
        Duration,
        StatusCode,
        RootSpanAttributes AS SpanAttributes,
        SpanCount,
        ServiceCount
      FROM (
        SELECT
          TraceId,
          argMin(SpanId, tuple(ParentSpanId != '', Timestamp)) AS RootSpanId,
          argMin(SpanName, tuple(ParentSpanId != '', Timestamp)) AS RootSpanName,
          argMin(ServiceName, tuple(ParentSpanId != '', Timestamp)) AS RootServiceName,
          min(Timestamp) AS TraceStart,
          max(toUnixTimestamp64Nano(Timestamp) + toInt64(Duration))
            - min(toUnixTimestamp64Nano(Timestamp)) AS Duration,
          multiIf(
            countIf(lowerUTF8(StatusCode) = 'error') > 0, 'ERROR',
            countIf(lowerUTF8(StatusCode) = 'ok') > 0, 'OK',
            'UNSET'
          ) AS StatusCode,
          argMin(SpanAttributes, tuple(ParentSpanId != '', Timestamp)) AS RootSpanAttributes,
          count() AS SpanCount,
          uniqExact(ServiceName) AS ServiceCount
        FROM otel_traces
        ${environment.sql ? `WHERE ${environment.sql}` : ''}
        GROUP BY TraceId
        ${serviceFilter}
      )
      ORDER BY Timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    return this.query(query, queryParams, LIST_QUERY_SETTINGS);
  }

  async getTraceById(traceId: string, env?: string) {
    const environment = telemetryEnvironment(env);
    const query = `
      SELECT
        TraceId,
        SpanId,
        ParentSpanId,
        SpanName,
        SpanKind,
        ServiceName,
        Timestamp,
        Duration,
        upperUTF8(StatusCode) AS StatusCode,
        StatusMessage,
        ResourceAttributes,
        SpanAttributes
      FROM otel_traces
      WHERE TraceId = {traceId:String}
        ${environment.sql ? `AND ${environment.sql}` : ''}
      ORDER BY Timestamp ASC
    `;

    return this.query(query, { traceId, ...environment.params });
  }

  async getLogs(options: LogsListOptions = {}) {
    const { limit, offset } = this.normalizeListOptions(options);
    const timeWindow = telemetryTimeWindow(options, 'Timestamp');
    const environment = telemetryEnvironment(options.env);
    const predicates: string[] = environment.sql ? [environment.sql] : [];
    const queryParams: Record<string, unknown> = { limit, offset, ...environment.params };

    if (options.service) {
      predicates.push('ServiceName = {service:String}');
      queryParams.service = options.service;
    }
    if (timeWindow.sql) {
      predicates.push(timeWindow.sql);
      Object.assign(queryParams, timeWindow.params);
    }
    const where = predicates.length ? `WHERE ${predicates.join(' AND ')}` : '';

    const query = `
      SELECT
        Timestamp,
        formatDateTime(Timestamp, '%H:%i:%S') AS TimestampTime,
        TraceId,
        SpanId,
        TraceFlags,
        SeverityText,
        SeverityNumber,
        ServiceName,
        Body,
        ResourceSchemaUrl,
        ResourceAttributes,
        ScopeSchemaUrl,
        ScopeName,
        ScopeVersion,
        ScopeAttributes,
        LogAttributes
      FROM otel_logs
      ${where}
      ORDER BY Timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    return this.query(query, queryParams, LIST_QUERY_SETTINGS);
  }

  async getServices(env?: string) {
    const environment = telemetryEnvironment(env);
    return this.query(`
      SELECT DISTINCT ServiceName
      FROM otel_traces
      ${environment.sql ? `WHERE ${environment.sql}` : ''}
      ORDER BY ServiceName
    `, environment.params);
  }

  async getServiceMetrics(
    service: string,
    window: { from: string; to: string; env?: string },
  ) {
    const timeWindow = telemetryTimeWindow(window, 'Timestamp', true);
    const environment = telemetryEnvironment(window.env);
    const query = `
      SELECT
        count() AS request_count,
        avg(Duration) AS avg_duration,
        quantile(0.5)(Duration) AS p50_duration,
        quantile(0.95)(Duration) AS p95_duration,
        quantile(0.99)(Duration) AS p99_duration,
        countIf(lowerUTF8(StatusCode) = 'error') AS error_count
      FROM otel_traces
      WHERE ServiceName = {service:String}
        AND (ParentSpanId = '' OR lowerUTF8(SpanKind) = 'server')
        AND ${timeWindow.sql}
        ${environment.sql ? `AND ${environment.sql}` : ''}
    `;

    const result = await this.query(query, { service, ...timeWindow.params, ...environment.params });
    return result[0] || {};
  }

  async getRecentTraceSignal(
    options: TelemetryStreamOptions,
  ): Promise<TelemetryChangeSignal> {
    const query = `
      WITH [
        '/api/traces',
        '/api/logs',
        '/api/events',
        '/api/services',
        '/api/health',
        '/health'
      ] AS dashboardPaths
      SELECT
        count() AS EventCount,
        toString(sum(cityHash64(
          TraceId,
          SpanId,
          Timestamp,
          SpanName,
          ServiceName,
          Duration,
          StatusCode
        ))) AS Fingerprint
      FROM otel_traces
      WHERE Timestamp > {since:DateTime64(9)}
        AND Timestamp <= {until:DateTime64(9)}
        AND TraceId NOT IN (
          SELECT DISTINCT TraceId
          FROM otel_traces
          WHERE TraceId IN (
              SELECT DISTINCT TraceId
              FROM otel_traces
              WHERE Timestamp > {since:DateTime64(9)}
                AND Timestamp <= {until:DateTime64(9)}
            )
            AND (
              arrayExists(
                path -> startsWith(SpanName, concat('GET ', path)),
                dashboardPaths
              )
              OR arrayExists(
                path -> startsWith(SpanAttributes['http.route'], path),
                dashboardPaths
              )
              OR arrayExists(
                path -> startsWith(SpanAttributes['http.target'], path),
                dashboardPaths
              )
              OR arrayExists(
                path -> startsWith(SpanAttributes['url.path'], path),
                dashboardPaths
              )
            )
        )
    `;

    const [signal] = await this.query<{
      EventCount: number | string;
      Fingerprint: string;
    }>(query, {
      since: options.since,
      until: options.until,
    });

    return this.normalizeChangeSignal(signal);
  }

  async getRecentLogSignal(
    options: TelemetryStreamOptions,
  ): Promise<TelemetryChangeSignal> {
    const query = `
      WITH [
        '/api/traces',
        '/api/logs',
        '/api/events',
        '/api/services',
        '/api/health',
        '/health'
      ] AS dashboardPaths
      SELECT
        count() AS EventCount,
        toString(sum(cityHash64(
          Timestamp,
          TraceId,
          SpanId,
          SeverityText,
          SeverityNumber,
          ServiceName,
          Body
        ))) AS Fingerprint
      FROM otel_logs
      WHERE Timestamp > {since:DateTime64(9)}
        AND Timestamp <= {until:DateTime64(9)}
        AND NOT (
          arrayExists(
            path -> startsWith(LogAttributes['url'], path),
            dashboardPaths
          )
          OR arrayExists(
            path -> startsWith(LogAttributes['endpoint'], path),
            dashboardPaths
          )
        )
    `;

    const [signal] = await this.query<{
      EventCount: number | string;
      Fingerprint: string;
    }>(query, {
      since: options.since,
      until: options.until,
    });

    return this.normalizeChangeSignal(signal);
  }

  private async checkRequiredTables(): Promise<void> {
    try {
      const [tracesTableExists, logsTableExists] = await Promise.all([
        this.tableExists('otel_traces'),
        this.tableExists('otel_logs'),
      ]);

      const missingTables = [
        !tracesTableExists && 'otel_traces',
        !logsTableExists && 'otel_logs',
      ].filter(Boolean);

      if (missingTables.length > 0) {
        this.logger.warn(
          `Waiting for the collector to create: ${missingTables.join(', ')}`,
          'ClickhouseService',
        );
      }
    } catch (error) {
      const details = this.errorDetails(error);
      this.logger.warn(
        `ClickHouse is not ready during startup: ${details.message}`,
        'ClickhouseService',
      );
    }
  }

  private async tableExists(tableName: string): Promise<boolean> {
    const rows = await this.query<{ count: string }>(
      `
        SELECT count() AS count
        FROM system.tables
        WHERE database = {database:String}
          AND name = {tableName:String}
      `,
      { database: this.database, tableName },
    );

    return Number(rows[0]?.count ?? 0) > 0;
  }

  executeQuery<T = Record<string, unknown>>(
    sql: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    return this.query<T>(sql, params);
  }

  private async query<T = Record<string, unknown>>(
    query: string,
    queryParams: Record<string, unknown> = {},
    settings?: ClickHouseSettings,
  ): Promise<T[]> {
    try {
      return await this.withTracingSuppressed(async () => {
        const result = await this.client.query({
          query,
          query_params: queryParams,
          format: 'JSONEachRow',
          clickhouse_settings: settings,
        });

        return (await result.json()) as T[];
      });
    } catch (error) {
      const details = this.errorDetails(error);
      this.logger.error(
        `ClickHouse query failed: ${details.message}`,
        details.stack,
        'ClickhouseService',
      );
      throw error;
    }
  }

  private withTracingSuppressed<T>(operation: () => T): T {
    return context.with(suppressTracing(context.active()), operation);
  }

  private normalizeListOptions(options: TelemetryListOptions) {
    return {
      limit: this.clamp(
        Number.isFinite(options.limit) ? options.limit! : DEFAULT_LIMIT,
        1,
        MAX_LIMIT,
      ),
      offset: this.clamp(
        Number.isFinite(options.offset) ? options.offset! : 0,
        0,
        1_000_000,
      ),
    };
  }

  private normalizeChangeSignal(
    signal: { EventCount: number | string; Fingerprint: string } | undefined,
  ): TelemetryChangeSignal {
    return {
      eventCount: Number(signal?.EventCount ?? 0),
      fingerprint: signal?.Fingerprint ?? '0',
    };
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(Math.trunc(value), minimum), maximum);
  }

  private buildUrl(host: string, port: number): string {
    const normalizedHost = host.replace(/\/+$/, '');
    if (/^https?:\/\//i.test(normalizedHost)) {
      const url = new URL(normalizedHost);
      if (!url.port) {
        url.port = String(port);
      }
      return url.toString().replace(/\/$/, '');
    }

    return `http://${normalizedHost}:${port}`;
  }

  private errorDetails(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }

    return { message: String(error) };
  }
}
