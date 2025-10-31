import {
  LogRecordExporter,
  SdkLogRecord,
} from '@opentelemetry/sdk-logs';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { createClient, ClickHouseClient } from '@clickhouse/client';
import * as os from 'os';

interface LogDocument {
  timestamp: string;
  service_name: string;
  service_version: string;
  span_id?: string;
  trace_id?: string;
  severity_text: string;
  severity_number: number;
  body: string;
  attributes: Record<string, any>;
  host_name: string;
  environment: string;
}

export class ClickHouseLogExporter implements LogRecordExporter {
  private client: ClickHouseClient;
  private tableName = 'otel_logs';
  private batchBuffer: LogDocument[] = [];
  private maxBatchSize = 100;
  private flushInterval: NodeJS.Timeout | null = null;
  private flushIntervalMs = 5000; // 5 seconds
  private isShutdown = false;

  constructor() {
    const host = process.env.CLICKHOUSE_HOST || 'localhost';
    const port = parseInt(process.env.CLICKHOUSE_PORT || '8123');

    this.client = createClient({
      host: `http://${host}:${port}`,
      database: process.env.CLICKHOUSE_DATABASE || 'default',
      username: process.env.CLICKHOUSE_USERNAME || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
    });

    this.initializeFlushInterval();
  }

  private initializeFlushInterval() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      if (this.batchBuffer.length > 0 && !this.isShutdown) {
        this.flush();
      }
    }, this.flushIntervalMs);
  }

  async export(logs: SdkLogRecord[]): Promise<ExportResult> {
    if (this.isShutdown) {
      return { code: ExportResultCode.FAILED };
    }

    try {
      for (const log of logs) {
        const document = this.convertLogRecord(log);
        this.batchBuffer.push(document);

        // Flush if batch size is reached
        if (this.batchBuffer.length >= this.maxBatchSize) {
          await this.flush();
        }
      }

      return { code: ExportResultCode.SUCCESS };
    } catch (error) {
      console.error('Error exporting logs to ClickHouse:', error);
      return { code: ExportResultCode.FAILED };
    }
  }

  private convertLogRecord(log: SdkLogRecord): LogDocument {
    const resource = log.resource;
    const attributes = log.attributes || {};
    const logRecord = log as any; // Use any to access properties that may vary

    return {
      timestamp: new Date((logRecord.hrTimestamp || logRecord.timestamp || Date.now() * 1_000_000) / 1_000_000).toISOString(),
      service_name: (resource?.attributes?.['service.name'] as string) || 'unknown',
      service_version: (resource?.attributes?.['service.version'] as string) || '1.0.0',
      span_id: logRecord.spanContext?.spanId || undefined,
      trace_id: logRecord.spanContext?.traceId || undefined,
      severity_text: log.severityText || 'INFO',
      severity_number: log.severityNumber || 0,
      body: String(log.body || ''),
      attributes: attributes,
      host_name: os.hostname(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  private async flush(): Promise<void> {
    if (this.batchBuffer.length === 0) {
      return;
    }

    const documentsToExport = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      await this.client.insert({
        table: this.tableName,
        values: documentsToExport,
        format: 'JSONEachRow',
      });

      console.log(`Exported ${documentsToExport.length} logs to ClickHouse`);
    } catch (error) {
      console.error('Error flushing logs to ClickHouse:', error);
      // Re-add documents to buffer for retry
      this.batchBuffer.unshift(...documentsToExport);
    }
  }

  async shutdown(): Promise<void> {
    if (this.isShutdown) {
      return;
    }

    this.isShutdown = true;

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Final flush
    await this.flush();

    try {
      await this.client.close();
    } catch (error) {
      console.error('Error closing ClickHouse client:', error);
    }
  }

  async forceFlush(timeoutMillis?: number): Promise<void> {
    return this.flush();
  }
}
