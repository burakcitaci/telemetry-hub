import { Injectable, LoggerService, OnApplicationShutdown } from '@nestjs/common';
import { logs } from '@opentelemetry/api-logs';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { shutdownTelemetry } from '../../tracing';

/**
 * Central Logger Service - Integrates with OpenTelemetry for centralized logging
 * Logs are exported to ClickHouse via the OpenTelemetry Collector
 */
@Injectable()
export class CentralLoggerService implements LoggerService, OnApplicationShutdown {
  /**
   * Get logger lazily to ensure global provider is initialized
   */
  private getLogger() {
    try {
      const logger = logs.getLogger('backend-service');
      if (!logger) {
        console.error('WARNING: logs.getLogger returned null/undefined');
        return logs.getLogger('backend-service'); // Retry once
      }
      return logger;
    } catch (error) {
      console.error('ERROR: Failed to get logger:', error);
      throw error;
    }
  }

  /**
   * Log an informational message
   */
  log(message: any, context?: string): void {
    try {
      this.getLogger().emit({
        severityNumber: SeverityNumber.INFO,
        severityText: 'INFO',
        body: this.formatMessage(message, context),
        attributes: {
          context,
        },
      });
    } catch (error) {
      console.error('Error emitting INFO log:', error);
    }
  }

  /**
   * Log an error message
   */
  error(message: any, trace?: string, context?: string): void {
    try {
      this.getLogger().emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: 'ERROR',
        body: this.formatMessage(message, context),
        attributes: {
          context,
          stack_trace: trace,
        },
      });
    } catch (err) {
      console.error('Error emitting ERROR log:', err);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: any, context?: string): void {
    try {
      this.getLogger().emit({
        severityNumber: SeverityNumber.WARN,
        severityText: 'WARN',
        body: this.formatMessage(message, context),
        attributes: {
          context,
        },
      });
    } catch (error) {
      console.error('Error emitting WARN log:', error);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: any, context?: string): void {
    try {
      this.getLogger().emit({
        severityNumber: SeverityNumber.DEBUG,
        severityText: 'DEBUG',
        body: this.formatMessage(message, context),
        attributes: {
          context,
        },
      });
    } catch (error) {
      console.error('Error emitting DEBUG log:', error);
    }
  }

  /**
   * Log a verbose message
   */
  verbose(message: any, context?: string): void {
    try {
      this.getLogger().emit({
        severityNumber: SeverityNumber.DEBUG2,
        severityText: 'DEBUG',
        body: this.formatMessage(message, context),
        attributes: {
          context,
          level: 'verbose',
        },
      });
    } catch (error) {
      console.error('Error emitting VERBOSE log:', error);
    }
  }

  /**
   * Log with custom severity and attributes
   */
  logWithAttributes(
    message: any,
    severityText: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL',
    attributes: Record<string, any> = {},
    context?: string,
  ): void {
    try {
      const severityMap: Record<string, SeverityNumber> = {
        TRACE: SeverityNumber.TRACE,
        DEBUG: SeverityNumber.DEBUG,
        INFO: SeverityNumber.INFO,
        WARN: SeverityNumber.WARN,
        ERROR: SeverityNumber.ERROR,
        FATAL: SeverityNumber.FATAL,
      };

      this.getLogger().emit({
        severityNumber: severityMap[severityText] || SeverityNumber.INFO,
        severityText,
        body: this.formatMessage(message, context),
        attributes: {
          context,
          ...attributes,
        },
      });
    } catch (error) {
      console.error('Error emitting log with attributes:', error);
    }
  }

  /**
   * Format message for consistent logging
   */
  private formatMessage(message: any, context?: string): string {
    if (typeof message === 'string') {
      return `${message}`;
    }

    if (message instanceof Error) {
      return `${message.message}`;
    }

    return `${JSON.stringify(message)}`;
  }

  async onApplicationShutdown(): Promise<void> {
    await shutdownTelemetry();
  }
}
