import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
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

// Logging provider configuration
const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    'service.name': serviceName,
    'service.version': version,
    'deployment.environment': process.env.NODE_ENV || 'development',
    'host.name': os.hostname(),
  }),
  processors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: otlpLogsUrl,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ),
    new BatchLogRecordProcessor(new ConsoleLogRecordExporter(), {
      maxExportBatchSize: 50,
      maxQueueSize: 1000,
      exportTimeoutMillis: 5000,
      scheduledDelayMillis: 1000, // Export every 1 second for console
    }),
  ],
});

// Initialize both tracing and logging
sdk.start();

console.log('OpenTelemetry tracing and logging initialized');
console.log(`OTLP Traces endpoint: ${otlpTracesUrl}`);
console.log(`OTLP Logs endpoint: ${otlpLogsUrl}`);
console.log(`Service name: ${serviceName}`);

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing and logging terminated'))
    .catch((error) => console.log('Error terminating services', error))
    .finally(() => process.exit(0));
});

export default sdk;
export { loggerProvider };
