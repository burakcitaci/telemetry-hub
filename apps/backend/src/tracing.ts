import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logs } from '@opentelemetry/api-logs';
import * as os from 'os';

// Get OTEL collector endpoint from environment variables
// Use HTTP port 4318 for HTTP exporters
const OTEL_EXPORTER_OTLP_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const otlpTracesUrl = `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`;
const otlpLogsUrl = `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`;
const serviceName = process.env.OTEL_SERVICE_NAME || 'backend-service';
const version = process.env.OTEL_SERVICE_VERSION || '1.0.0';

// Tracing SDK configuration
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: version,
    'deployment.environment': process.env.NODE_ENV || 'development',
    'host.name': os.hostname(),
  }),
  traceExporter: new OTLPTraceExporter({
    url: otlpTracesUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Logging provider configuration with OTLP exporter to collector
const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: version,
    'deployment.environment': process.env.NODE_ENV || 'development',
    'host.name': os.hostname(),
  }),
  processors: [
    // Export logs to OpenTelemetry collector via OTLP
    new BatchLogRecordProcessor({
      exporter: new OTLPLogExporter({
        url: otlpLogsUrl,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      maxExportBatchSize: 10,
      maxQueueSize: 2000,
      exportTimeoutMillis: 10000,
      scheduledDelayMillis: 1000, // Export every 1 second
    }),
  ],
});

// Register the logger provider globally
logs.setGlobalLoggerProvider(loggerProvider);

// Initialize both tracing and logging
sdk.start();

console.log('OpenTelemetry tracing and logging initialized');
console.log(`OTLP Traces endpoint: ${otlpTracesUrl}`);
console.log(`OTLP Logs endpoint: ${otlpLogsUrl}`);
console.log(`Service name: ${serviceName}`);
console.log('Logs are being exported to OpenTelemetry collector');

let telemetryShutdown: Promise<void> | undefined;

export function shutdownTelemetry(): Promise<void> {
  if (!telemetryShutdown) {
    telemetryShutdown = (async () => {
      const results = await Promise.allSettled([
        sdk.shutdown(),
        loggerProvider.forceFlush().then(() => loggerProvider.shutdown()),
      ]);
      const failures = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason);

      if (failures.length > 0) {
        throw new AggregateError(failures, 'OpenTelemetry shutdown failed');
      }
    })();
  }

  return telemetryShutdown;
}

export default sdk;
export { loggerProvider };
