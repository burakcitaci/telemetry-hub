import { context } from '@opentelemetry/api';
import { suppressTracing } from '@opentelemetry/core';
import {
  createClient,
  type ClickHouseClient,
  type ClickHouseSettings,
} from '@clickhouse/client';
import {
  Injectable,
  Inject,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { telemetryTimeWindow } from './telemetry-time-window';
import { telemetryEnvironment } from './telemetry-environment';
import type { ClickhouseConfig } from '../../../config/clickhouse.config';
import { CentralLoggerService } from '../../../common/logger/central-logger.service';
import type { TenantScope } from '../../auth/auth.types';
import { PlatformStore } from '../../auth/platform-store.service';
import { filterValues } from '../../auth/platform-filters';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const TENANT_TABLES = [
  'otel_traces',
  'otel_logs',
  'otel_metrics_gauge',
  'otel_metrics_sum',
  'otel_metrics_histogram',
] as const;
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

export interface TenantQueryFilter {
  predicate: string;
  where: string;
  params: Record<string, string | string[]>;
}

@Injectable()
export class ClickhouseService implements OnModuleInit, OnModuleDestroy {
  private client!: ClickHouseClient;
  private database = 'default';
  private tenantSchemaReady?: Promise<void>;

  constructor(
    private readonly logger: CentralLoggerService,
    private readonly configService: ConfigService,
    @Inject(PlatformStore) private readonly platformStore?: PlatformStore,
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

  async getEnvironments(
    scope: TenantScope,
    source: 'metrics' | 'logs' | 'traces',
  ): Promise<string[]> {
    const isolation = this.buildTenantFilter(scope, [
      "ResourceAttributes['deployment.environment.name'] != ''",
    ], source === 'metrics' ? undefined : source);
    const tables = {
      metrics: ['otel_metrics_gauge', 'otel_metrics_sum', 'otel_metrics_histogram'],
      logs: ['otel_logs'],
      traces: ['otel_traces'],
    }[source];
    const branches = tables.map((table) => `
      SELECT DISTINCT ResourceAttributes['deployment.environment.name'] AS environment
      FROM ${table} ${isolation.where}
    `);
    try {
      const rows = await this.executeTenantQuery<{ environment: string }>(
        scope,
        `SELECT DISTINCT environment FROM (${branches.join(' UNION ALL ')}) ORDER BY environment`,
        isolation.params, ENVIRONMENT_QUERY_SETTINGS,
      );
      return rows.map((row) => row.environment);
    } catch (cause) {
      throw new ServiceUnavailableException({
        code: 'ENVIRONMENT_DISCOVERY_FAILED',
        message: 'Environment-Optionen sind momentan nicht verfügbar.',
      }, { cause });
    }
  }

  async getTraces(scope: TenantScope, options: LogsListOptions = {}) {
    const { limit, offset } = this.normalizeListOptions(options);
    const environment = telemetryEnvironment(options.env);
    const timeWindow = telemetryTimeWindow(options, 'Timestamp');
    const serviceFilter = options.service
      ? 'HAVING countIf(ServiceName = {service:String}) > 0'
      : '';
    const isolation = this.buildTenantFilter({ ...scope, statusFilter: undefined },
      [environment.sql, timeWindow.sql].filter(Boolean));
    const queryParams: Record<string, unknown> = {
      limit, offset, ...environment.params, ...timeWindow.params, ...isolation.params,
    };

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
        ${isolation.where}
        GROUP BY TraceId
        ${serviceFilter}
      )
      ${filterValues(scope.statusFilter).length ? `WHERE ${this.statusPredicate('traces')}` : ''}
      ORDER BY Timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    return this.executeTenantQuery(scope, query, queryParams, LIST_QUERY_SETTINGS);
  }

  async getTraceById(scope: TenantScope, traceId: string, env?: string) {
    const environment = telemetryEnvironment(env);
    const isolation = this.buildTenantFilter(scope, [
      'TraceId = {traceId:String}',
      ...(environment.sql ? [environment.sql] : []),
    ], 'traces');
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
      ${isolation.where}
      ORDER BY Timestamp ASC
      LIMIT {limit:UInt32}
    `;

    return this.executeTenantQuery(scope, query, {
      traceId, limit: MAX_LIMIT, ...environment.params, ...isolation.params,
    }, LIST_QUERY_SETTINGS);
  }

  async getLogs(scope: TenantScope, options: LogsListOptions = {}) {
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
    const isolation = this.buildTenantFilter(scope, predicates, 'logs');
    Object.assign(queryParams, isolation.params);

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
      ${isolation.where}
      ORDER BY Timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    return this.executeTenantQuery(scope, query, queryParams, LIST_QUERY_SETTINGS);
  }

  async getServices(scope: TenantScope, env?: string) {
    const environment = telemetryEnvironment(env);
    const discoveryScope = { ...scope, statusFilter: undefined };
    const isolation = this.buildTenantFilter(
      discoveryScope,
      environment.sql ? [environment.sql] : [],
    );
    const branches = TENANT_TABLES.map((table) => `
      SELECT ServiceName
      FROM ${table}
      ${isolation.where}
    `);
    return this.executeTenantQuery(discoveryScope, `
      SELECT DISTINCT ServiceName
      FROM (${branches.join(' UNION ALL ')})
      WHERE ServiceName != ''
      ORDER BY ServiceName
    `, { ...environment.params, ...isolation.params });
  }

  async getServiceMetrics(
    scope: TenantScope,
    service: string,
    window: { from: string; to: string; env?: string },
  ) {
    const timeWindow = telemetryTimeWindow(window, 'Timestamp', true);
    const environment = telemetryEnvironment(window.env);
    const isolation = this.buildTenantFilter(scope, [
      'ServiceName = {service:String}',
      "(ParentSpanId = '' OR lowerUTF8(SpanKind) = 'server')",
      timeWindow.sql,
      ...(environment.sql ? [environment.sql] : []),
    ], 'traces');
    const query = `
      SELECT
        count() AS request_count,
        avg(Duration) AS avg_duration,
        quantile(0.5)(Duration) AS p50_duration,
        quantile(0.95)(Duration) AS p95_duration,
        quantile(0.99)(Duration) AS p99_duration,
        countIf(lowerUTF8(StatusCode) = 'error') AS error_count
      FROM otel_traces
      ${isolation.where}
    `;

    const result = await this.executeTenantQuery(scope, query, {
      service, ...timeWindow.params, ...environment.params, ...isolation.params,
    });
    return result[0] || {};
  }

  async getRecentTraceSignal(
    scope: TenantScope,
    options: TelemetryStreamOptions,
  ): Promise<TelemetryChangeSignal> {
    const isolation = this.buildTenantFilter(scope, [], 'traces');
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
      WHERE ${isolation.predicate}
        AND Timestamp > {since:DateTime64(9)}
        AND Timestamp <= {until:DateTime64(9)}
        AND TraceId NOT IN (
          SELECT DISTINCT TraceId
          FROM otel_traces
          WHERE ${isolation.predicate}
            AND TraceId IN (
              SELECT DISTINCT TraceId
              FROM otel_traces
              WHERE ${isolation.predicate}
                AND Timestamp > {since:DateTime64(9)}
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

    const [signal] = await this.executeTenantQuery<{
      EventCount: number | string;
      Fingerprint: string;
    }>(scope, query, {
      since: options.since,
      until: options.until,
      ...isolation.params,
    });

    return this.normalizeChangeSignal(signal);
  }

  async getRecentLogSignal(
    scope: TenantScope,
    options: TelemetryStreamOptions,
  ): Promise<TelemetryChangeSignal> {
    const isolation = this.buildTenantFilter(scope, [], 'logs');
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
      WHERE ${isolation.predicate}
        AND Timestamp > {since:DateTime64(9)}
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

    const [signal] = await this.executeTenantQuery<{
      EventCount: number | string;
      Fingerprint: string;
    }>(scope, query, {
      since: options.since,
      until: options.until,
      ...isolation.params,
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

  async executeTenantQuery<T = Record<string, unknown>>(
    scope: TenantScope,
    sql: string,
    params: Record<string, unknown> = {},
    settings?: ClickHouseSettings,
  ): Promise<T[]> {
    const source = /\bFROM\s+otel_logs\b/i.test(sql) ? 'logs' : /\bFROM\s+otel_traces\b/i.test(sql) ? 'traces' : undefined;
    const isolation = this.buildTenantFilter(scope, [], source);
    if (source && filterValues(scope.statusFilter).length && !sql.includes(this.statusPredicate(source))) {
      throw new Error('Blocked query without selected status filter.');
    }
    this.assertTenantIsolation(sql, isolation, scope);
    await this.ensureTenantSchema();
    return this.query<T>(sql, { ...params, ...isolation.params }, settings);
  }

  executeSystemQuery<T = Record<string, unknown>>(
    sql: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    if (!/\bFROM\s+system\.(?:tables|columns)\b/i.test(sql)) {
      throw new Error('Only ClickHouse system metadata queries are allowed here.');
    }
    return this.query<T>(sql, params);
  }

  buildTenantFilter(
    scope: TenantScope,
    predicates: string[] = [],
    source?: 'logs' | 'traces',
  ): TenantQueryFilter {
    // Membership identifies the user, not their read boundary. Org isolation is mandatory.
    const teams = filterValues(scope.teamFilter), services = filterValues(scope.serviceFilter), envs = filterValues(scope.envFilter);
    const effectiveTeam = teams.length ? teams : undefined;
    const tenantPredicates = ['org_slug = {tenant:String}'];
    const params: Record<string, string | string[]> = { tenant: scope.tenantSlug };
    const selection = (column: string, key: string, values: string[]) => {
      params[key] = values.length === 1 ? values[0] : values;
      return values.length === 1 ? `${column} = {${key}:String}` : `${column} IN {${key}:Array(String)}`;
    };
    const ownership = effectiveTeam ? this.platformStore?.serviceOwnership(scope.tenantSlug, effectiveTeam) : undefined;
    if (effectiveTeam) tenantPredicates.push(ownership?.assigned.length
      ? `(ServiceName IN {ownedServices:Array(String)} OR (${selection('team_id', 'teamId', teams)} AND ServiceName NOT IN {assignedServices:Array(String)}))`
      : selection('team_id', 'teamId', teams));
    if (services.length) tenantPredicates.push(selection('ServiceName', 'filterService', services));
    if (envs.length) tenantPredicates.push(selection("ResourceAttributes['deployment.environment.name']", 'filterEnv', envs));
    if (source && filterValues(scope.statusFilter).length) {
      tenantPredicates.push(this.statusPredicate(source)); params.filterStatuses = filterValues(scope.statusFilter);
    }
    const allPredicates = [...tenantPredicates, ...predicates.filter(Boolean)];
    return {
      predicate: tenantPredicates.join(' AND '),
      where: `WHERE ${allPredicates.join(' AND ')}`,
      params: { ...params,
        ...(ownership?.assigned.length ? { ownedServices: ownership.owned, assignedServices: ownership.assigned } : {}),
      },
    };
  }

  private statusPredicate(source: 'traces' | 'logs'): string {
    return `${this.statusColumn(source)} IN {filterStatuses:Array(String)}`;
  }

  statusColumn(source: 'traces' | 'logs'): string {
    return source === 'traces' ? "if(StatusCode = '', 'UNKNOWN', upperUTF8(StatusCode))"
      : "if(SeverityText = '', if(SeverityNumber = 0, 'UNKNOWN', toString(SeverityNumber)), upperUTF8(SeverityText))";
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

  private async ensureTenantSchema(): Promise<void> {
    if (!this.tenantSchemaReady) {
      this.tenantSchemaReady = this.createTenantColumns().catch((error) => {
        this.tenantSchemaReady = undefined;
        throw error;
      });
    }
    return this.tenantSchemaReady;
  }

  private async createTenantColumns(): Promise<void> {
    const existing = await Promise.all(
      TENANT_TABLES.map(async (table) => ({ table, exists: await this.tableExists(table) })),
    );
    const missing = existing.filter(({ exists }) => !exists).map(({ table }) => table);
    if (missing.length) {
      throw new ServiceUnavailableException(`Tenant telemetry tables not ready: ${missing.join(', ')}`);
    }
    await Promise.all(existing.map(({ table }) => this.addTenantColumns(table)));
  }

  private async addTenantColumns(table: (typeof TENANT_TABLES)[number]): Promise<void> {
    const query = `ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS org_slug String MATERIALIZED ResourceAttributes['org.slug'],
      ADD COLUMN IF NOT EXISTS team_id String MATERIALIZED ResourceAttributes['team.id']`;
    await this.withTracingSuppressed(() => this.client.command({ query }));
  }

  private assertTenantIsolation(
    sql: string,
    isolation: TenantQueryFilter,
    scope: TenantScope,
  ): void {
    if (!sql.includes('org_slug = {tenant:String}')) {
      throw new Error('Blocked ClickHouse query without organization isolation.');
    }
    const requiresTeam = filterValues(scope.teamFilter).length > 0;
    if (requiresTeam && !sql.includes(filterValues(scope.teamFilter).length > 1 ? 'team_id IN {teamId:Array(String)}' : 'team_id = {teamId:String}')) {
      throw new Error('Blocked ClickHouse query without required team isolation.');
    }
    const teamPredicate = filterValues(scope.teamFilter).length > 1 ? 'team_id IN {teamId:Array(String)}' : 'team_id = {teamId:String}';
    if (isolation.params.assignedServices && !sql.includes(
      `(ServiceName IN {ownedServices:Array(String)} OR (${teamPredicate} AND ServiceName NOT IN {assignedServices:Array(String)}))`)) {
      throw new Error('Blocked ClickHouse query without service ownership filter.');
    }
    if (!isolation.params.tenant) throw new Error('Tenant scope is empty.');
    if (filterValues(scope.serviceFilter).length && !sql.includes(filterValues(scope.serviceFilter).length > 1 ? 'ServiceName IN {filterService:Array(String)}' : 'ServiceName = {filterService:String}')) {
      throw new Error('Blocked query without selected service filter.');
    }
    if (filterValues(scope.envFilter).length && !sql.includes(filterValues(scope.envFilter).length > 1 ? "ResourceAttributes['deployment.environment.name'] IN {filterEnv:Array(String)}" : "ResourceAttributes['deployment.environment.name'] = {filterEnv:String}")) {
      throw new Error('Blocked query without selected environment filter.');
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
