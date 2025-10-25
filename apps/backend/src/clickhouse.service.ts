import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, ClickHouseClient } from '@clickhouse/client';

@Injectable()
export class ClickhouseService implements OnModuleInit {
  private readonly logger = new Logger(ClickhouseService.name);
  private client: ClickHouseClient;

  async onModuleInit() {
    const host = process.env.CLICKHOUSE_HOST || 'clickhouse';
    
    this.client = createClient({
      host: `http://${host}:8123`,
      database: 'default',
    });

    this.logger.log(`ClickHouse client initialized: ${host}:8123`);
    await this.ensureTables();
  }

  private async ensureTables() {
    try {
      await this.client.exec({
        query: `
          CREATE TABLE IF NOT EXISTS otel_traces (
            Timestamp DateTime64(9),
            TraceId String,
            SpanId String,
            ParentSpanId String,
            TraceState String,
            SpanName String,
            SpanKind String,
            ServiceName String,
            ResourceAttributes Map(String, String),
            ScopeName String,
            ScopeVersion String,
            SpanAttributes Map(String, String),
            Duration UInt64,
            StatusCode String,
            StatusMessage String,
            Events Nested(
              Timestamp DateTime64(9),
              Name String,
              Attributes Map(String, String)
            ),
            Links Nested(
              TraceId String,
              SpanId String,
              TraceState String,
              Attributes Map(String, String)
            )
          ) ENGINE = MergeTree()
          ORDER BY (ServiceName, Timestamp)
          TTL Timestamp + INTERVAL 7 DAY
        `,
      });

      await this.client.exec({
        query: `
          CREATE TABLE IF NOT EXISTS otel_logs (
            Timestamp DateTime64(9),
            TraceId String,
            SpanId String,
            TraceFlags UInt32,
            SeverityText String,
            SeverityNumber UInt8,
            ServiceName String,
            Body String,
            ResourceAttributes Map(String, String),
            LogAttributes Map(String, String)
          ) ENGINE = MergeTree()
          ORDER BY (ServiceName, Timestamp)
          TTL Timestamp + INTERVAL 7 DAY
        `,
      });

      this.logger.log('Tables ensured');
    } catch (error) {
      this.logger.error('Error ensuring tables', error);
    }
  }

  async query<T = any>(query: string): Promise<T[]> {
    try {
      const result = await this.client.query({
        query,
        format: 'JSONEachRow',
      });
      
      return await result.json() as T[];
    } catch (error) {
      this.logger.error(`Query error: ${error.message}`);
      throw error;
    }
  }

  async getTraces(limit: number = 100, service?: string) {
    let query = `
      SELECT 
        TraceId,
        SpanId,
        SpanName,
        ServiceName,
        Timestamp,
        Duration,
        StatusCode,
        SpanAttributes
      FROM otel_traces
    `;

    if (service) {
      query += ` WHERE ServiceName = '${service}'`;
    }

    query += ` ORDER BY Timestamp DESC LIMIT ${limit}`;

    return this.query(query);
  }

  async getTraceById(traceId: string) {
    const query = `
      SELECT *
      FROM otel_traces
      WHERE TraceId = '${traceId}'
      ORDER BY Timestamp ASC
    `;

    return this.query(query);
  }

  async getLogs(limit: number = 100, service?: string) {
    let query = `
      SELECT 
        Timestamp,
        TraceId,
        SpanId,
        SeverityText,
        ServiceName,
        Body,
        LogAttributes
      FROM otel_logs
    `;

    if (service) {
      query += ` WHERE ServiceName = '${service}'`;
    }

    query += ` ORDER BY Timestamp DESC LIMIT ${limit}`;

    return this.query(query);
  }

  async getServices() {
    const query = `
      SELECT DISTINCT ServiceName
      FROM otel_traces
      ORDER BY ServiceName
    `;

    return this.query(query);
  }

  async getServiceMetrics(service: string) {
    const query = `
      SELECT
        count() as request_count,
        avg(Duration) as avg_duration,
        quantile(0.5)(Duration) as p50_duration,
        quantile(0.95)(Duration) as p95_duration,
        quantile(0.99)(Duration) as p99_duration,
        countIf(StatusCode = 'ERROR') as error_count
      FROM otel_traces
      WHERE ServiceName = '${service}'
        AND Timestamp > now() - INTERVAL 1 HOUR
    `;

    const result = await this.query(query);
    return result[0] || {};
  }

  async getRecentTraces(since: Date) {
    const timestamp = since.toISOString();
    const query = `
      SELECT 
        TraceId,
        SpanId,
        SpanName,
        ServiceName,
        Timestamp,
        Duration,
        StatusCode
      FROM otel_traces
      WHERE Timestamp > '${timestamp}'
      ORDER BY Timestamp DESC
    `;

    return this.query(query);
  }

  async getRecentLogs(since: Date) {
    const timestamp = since.toISOString();
    const query = `
      SELECT 
        Timestamp,
        TraceId,
        SeverityText,
        ServiceName,
        Body
      FROM otel_logs
      WHERE Timestamp > '${timestamp}'
      ORDER BY Timestamp DESC
    `;

    return this.query(query);
  }
}
