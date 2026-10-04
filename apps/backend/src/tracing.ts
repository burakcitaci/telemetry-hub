import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logs } from '@opentelemetry/api-logs';
import * as os from 'os';

const OTEL_EXPORTER_OTLP_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const otlpTracesUrl = `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`;
const otlpLogsUrl = `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`;
const otlpMetricsUrl = `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`;
const serviceName = process.env.OTEL_SERVICE_NAME || 'backend-service';
const version = process.env.OTEL_SERVICE_VERSION || '1.0.0';

const resourceAttributes = {
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: version,
  'deployment.environment': process.env.NODE_ENV || 'development',
  'host.name': os.hostname(),
};

// Metrics setup
const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: otlpMetricsUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    timeoutMillis: 10000,
  }),
});

const meterProvider = new MeterProvider({
  resource: resourceFromAttributes(resourceAttributes),
  readers: [metricReader],
});

// Logging setup
const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes(resourceAttributes),
  processors: [
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
      scheduledDelayMillis: 1000,
    }),
  ],
});

logs.setGlobalLoggerProvider(loggerProvider);

// Tracing SDK setup
const sdk = new NodeSDK({
  resource: resourceFromAttributes(resourceAttributes),
  traceExporter: new OTLPTraceExporter({
    url: otlpTracesUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Initialize telemetry
sdk.start();

console.log('OpenTelemetry tracing, logging, and metrics initialized');
console.log(`OTLP Traces endpoint: ${otlpTracesUrl}`);
console.log(`OTLP Logs endpoint: ${otlpLogsUrl}`);
console.log(`OTLP Metrics endpoint: ${otlpMetricsUrl}`);
console.log(`Service name: ${serviceName}`);

let telemetryShutdown: Promise<void> | undefined;

export function shutdownTelemetry(): Promise<void> {
  if (!telemetryShutdown) {
    telemetryShutdown = (async () => {
      const results = await Promise.allSettled([
        sdk.shutdown(),
        loggerProvider.forceFlush().then(() => loggerProvider.shutdown()),
        meterProvider.forceFlush().then(() => meterProvider.shutdown()),
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
export { loggerProvider, meterProvider };