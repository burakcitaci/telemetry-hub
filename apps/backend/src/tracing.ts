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
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';
import { logs } from '@opentelemetry/api-logs';
import * as os from 'os';

const OTEL_EXPORTER_OTLP_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const otlpTracesUrl = `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`;
const otlpLogsUrl = `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`;
const otlpMetricsUrl = `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`;

const serviceName = process.env.OTEL_SERVICE_NAME || 'backend-service';
const version = process.env.OTEL_SERVICE_VERSION || '1.0.0';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
  [ATTR_SERVICE_VERSION]: version,
  [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || 'development',
  'host.name': os.hostname(),
});

// ── Metrics ──────────────────────────────────────────────────────────────────
const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: otlpMetricsUrl,
    headers: { 'Content-Type': 'application/json' },
    timeoutMillis: 10000,
  }),
  exportIntervalMillis: 15000,   // flush every 15s — responsive without spamming
  exportTimeoutMillis: 8000,
});

// ── Logging ──────────────────────────────────────────────────────────────────
const loggerProvider = new LoggerProvider({
  resource,
  processors: [
    new BatchLogRecordProcessor({
      exporter: new OTLPLogExporter({
        url: otlpLogsUrl,
        headers: { 'Content-Type': 'application/json' },
      }),
      maxExportBatchSize: 10,
      maxQueueSize: 2000,
      exportTimeoutMillis: 10000,
      scheduledDelayMillis: 1000,
    }),
  ],
});

logs.setGlobalLoggerProvider(loggerProvider);

// ── SDK (traces + metrics + logs) ────────────────────────────────────────────
const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: otlpTracesUrl,
    headers: { 'Content-Type': 'application/json' },
  }),
  metricReaders: [metricReader],   // ← NodeSDK now owns the meter provider
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log('OpenTelemetry initialized');
console.log(`OTLP Traces endpoint:  ${otlpTracesUrl}`);
console.log(`OTLP Logs endpoint:    ${otlpLogsUrl}`);
console.log(`OTLP Metrics endpoint: ${otlpMetricsUrl}`);
console.log(`Service name:          ${serviceName}`);

let telemetryShutdown: Promise<void> | undefined;

export function shutdownTelemetry(): Promise<void> {
  if (!telemetryShutdown) {
    telemetryShutdown = (async () => {
      // sdk.shutdown() flushes traces, metrics, AND logs
      // because all three are now owned by the SDK.
      await sdk.shutdown();

      // loggerProvider is not managed by NodeSDK, so flush separately.
      await loggerProvider.forceFlush();
      await loggerProvider.shutdown();
    })();
  }
  return telemetryShutdown;
}

export default sdk;
export { loggerProvider };