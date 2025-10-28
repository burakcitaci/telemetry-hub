import { registerAs } from "@nestjs/config";

export interface OtelConfig {
  endpoint: string;
  serviceName: string;
  serviceVersion: string;
  tracesUrl: string;
  logsUrl: string;
}

export default registerAs("otel", (): OtelConfig => ({
  endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318",
  serviceName: process.env.OTEL_SERVICE_NAME || "backend-service",
  serviceVersion: process.env.OTEL_SERVICE_VERSION || "1.0.0",
  tracesUrl: process.env.OTEL_TRACES_URL || `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318"}/v1/traces`,
  logsUrl: process.env.OTEL_LOGS_URL || `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318"}/v1/logs`,
}));
