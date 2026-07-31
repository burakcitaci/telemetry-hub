import { context } from "@opentelemetry/api";
import { suppressTracing } from "@opentelemetry/core";
import {
  createClient,
  type ClickHouseClient,
} from "@clickhouse/client";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ClickhouseConfig } from "../../../config/clickhouse.config";
import { CentralLoggerService } from "../../../common/logger/central-logger.service";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export interface TelemetryListOptions {
  limit?: number;
  offset?: number;
  service?: string;
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
  private database = "default";

  constructor(
    private readonly logger: CentralLoggerService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const config =
      this.configService.getOrThrow<ClickhouseConfig>("clickhouse");
    const url = this.buildUrl(config.host, config.port);

    this.database = config.database;
    this.client = createClient({
      url,
      database: config.database,
      username: config.username,
      password: config.password,
      request_timeout: config.timeout,
      application: "telemetry-hub-backend",
    });

    this.logger.logWithAttributes(
      "ClickHouse client initialized",
      "INFO",
      { url, database: config.database },
      "ClickhouseService",
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

  async getTraces(options: TelemetryListOptions = {}) {
    const { limit, offset } = this.normalizeListOptions(options);
    const serviceFilter = options.service
      ? "HAVING countIf(ServiceName = {service:String}) > 0"
      : "";
    const queryParams: Record<string, unknown> = { limit, offset };

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
        GROUP BY TraceId
        ${serviceFilter}
      )
      ORDER BY Timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    return this.query(query, queryParams);
  }

  async getTraceById(traceId: string) {
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
      ORDER BY Timestamp ASC
    `;

    return this.query(query, { traceId });
  }

  async getLogs(options: TelemetryListOptions = {}) {
    const { limit, offset } = this.normalizeListOptions(options);
    const serviceFilter = options.service
      ? "WHERE ServiceName = {service:String}"
      : "";
    const queryParams: Record<string, unknown> = { limit, offset };

    if (options.service) {
      queryParams.service = options.service;
    }

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
      ${serviceFilter}
      ORDER BY Timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    return this.query(query, queryParams);
  }

  async getServices() {
    return this.query(`
      SELECT DISTINCT ServiceName
      FROM otel_traces
      ORDER BY ServiceName
    `);
  }

  async getServiceMetrics(service: string) {
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
        AND Timestamp > now() - toIntervalHour(1)
    `;

    const result = await this.query(query, { service });
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
        this.tableExists("otel_traces"),
        this.tableExists("otel_logs"),
      ]);

      const missingTables = [
        !tracesTableExists && "otel_traces",
        !logsTableExists && "otel_logs",
      ].filter(Boolean);

      if (missingTables.length > 0) {
        this.logger.warn(
          `Waiting for the collector to create: ${missingTables.join(", ")}`,
          "ClickhouseService",
        );
      }
    } catch (error) {
      const details = this.errorDetails(error);
      this.logger.warn(
        `ClickHouse is not ready during startup: ${details.message}`,
        "ClickhouseService",
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

  private async query<T = Record<string, unknown>>(
    query: string,
    queryParams: Record<string, unknown> = {},
  ): Promise<T[]> {
    try {
      return await this.withTracingSuppressed(async () => {
        const result = await this.client.query({
          query,
          query_params: queryParams,
          format: "JSONEachRow",
        });

        return (await result.json()) as T[];
      });
    } catch (error) {
      const details = this.errorDetails(error);
      this.logger.error(
        `ClickHouse query failed: ${details.message}`,
        details.stack,
        "ClickhouseService",
      );
      throw error;
    }
  }

  private withTracingSuppressed<T>(operation: () => T): T {
    return context.with(suppressTracing(context.active()), operation);
  }

  private normalizeListOptions(options: TelemetryListOptions) {
    return {
      limit: this.clamp(options.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT),
      offset: Math.max(options.offset ?? 0, 0),
    };
  }

  private normalizeChangeSignal(
    signal:
      | { EventCount: number | string; Fingerprint: string }
      | undefined,
  ): TelemetryChangeSignal {
    return {
      eventCount: Number(signal?.EventCount ?? 0),
      fingerprint: signal?.Fingerprint ?? "0",
    };
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(Math.trunc(value), minimum), maximum);
  }

  private buildUrl(host: string, port: number): string {
    const normalizedHost = host.replace(/\/+$/, "");
    if (/^https?:\/\//i.test(normalizedHost)) {
      const url = new URL(normalizedHost);
      if (!url.port) {
        url.port = String(port);
      }
      return url.toString().replace(/\/$/, "");
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
