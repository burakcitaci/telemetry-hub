/* import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
      // Check if tables exist and have the correct schema
      const tracesTableExists = await this.tableExists('otel_traces');
      const logsTableExists = await this.tableExists('otel_logs');

      if (!tracesTableExists) {
        this.logger.log('Tables will be created automatically by OpenTelemetry collector');
        this.logger.log('Make sure collector has create_schema: true configured');
      } else {
        this.logger.log('Tables already exist');
      }
    } catch (error) {
      this.logger.error('Error checking tables', error);
    }
  }

  private async tableExists(tableName: string): Promise<boolean> {
    try {
      await this.client.exec({
        query: `SELECT 1 FROM ${tableName} LIMIT 1`,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async query<T = any>(query: string): Promise<T[]> {
    try {
      const result = await this.client.query({
        query,
        format: 'JSONEachRow',
      });
      
      return await result.json() as T[];
    } catch (error:any) {
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
      SELECT
        TraceId,
        SpanId,
        ParentSpanId,
        SpanName,
        ServiceName,
        Timestamp,
        Duration,
        StatusCode,
        SpanAttributes
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
        AND Timestamp > now() - toIntervalHour(1)
    `;

    const result = await this.query(query);
    return result[0] || {};
  }

  async getRecentTraces(since: Date) {
    // Format timestamp for ClickHouse DateTime64 compatibility
    const timestamp = since.toISOString().replace('T', ' ').slice(0, -1);
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
      WHERE Timestamp > toDateTime64('${timestamp}', 9)
      ORDER BY Timestamp DESC
    `;

    return this.query(query);
  }

  async getRecentLogs(since: Date) {
    // Format timestamp for ClickHouse DateTime64 compatibility
    const timestamp = since.toISOString().replace('T', ' ').slice(0, -1);
    const query = `
      SELECT
        Timestamp,
        TraceId,
        SeverityText,
        ServiceName,
        Body
      FROM otel_logs
      WHERE Timestamp > toDateTime64('${timestamp}', 9)
      ORDER BY Timestamp DESC
    `;

    return this.query(query);
  }
}
 */