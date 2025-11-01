import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

export const getTraces = async (page: number, limit: number, service?: string) => {
  const params: any = {  };
  params.page = page;
  params.limit = limit;
  if (service) params.service = service;
  const response = await api.get('/traces', { params });
  console.log("getTraces response:", response);
  return Array.isArray(response.data) ? response.data : (response.data.data || []);
};

export const getTraceById = async (traceId: string) => {
  const response = await api.get(`/traces/${traceId}`);
  return Array.isArray(response.data) ? response.data : (response.data.data || []);
};

export const getLogs = async (limit: number = 100, service?: string) => {
  const params: any = { limit };
  if (service) params.service = service;
  const response = await api.get('/logs', { params });
  return Array.isArray(response.data) ? response.data : (response.data.data || []);
};

export const getServices = async () => {
  const response = await api.get('/services');
  return Array.isArray(response.data) ? response.data : (response.data.data || []);
};

export const getServiceMetrics = async (service: string) => {
  const response = await api.get(`/services/${service}/metrics`);
  return response.data.data || response.data;
};

export const createEventSource = () => {
  return new EventSource(`${API_URL}/api/events/stream`);
};

// Mock data generator for development/demo purposes
interface MockTrace {
  TraceId: string;
  SpanId: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  SpanAttributes?: Record<string, string>;
  Resource?: string;
  Method?: string;
}

export const generateMockTraces = (count: number = 50): MockTrace[] => {
  const services = [
    'customer-app-gtw',
    'shadow-ingestion-engine',
    'dam-api',
    'iotdb1',
    'enpal-redis-cache',
    'mongodb',
    'customer-app-gtw-graphql',
    'epal.redis.cache'
  ];
  const operations = [
    'GET /api/users',
    'POST /api/orders',
    'GET /api/products',
    'POST /api/payments',
    'GET /api/inventory',
    'POST /api/shipping',
    'IngestionFlowProcessor-ingestionEngine',
    'MongoDB.CreateSystem',
    'EventHubProcessor',
    'HMGET',
    'MongoDB.GetAssetBySerialNumber',
    'Handling.Enpal.C2C.Bosch.ManufacturerConsum...',
    'fromGrid:SystemMeasurementsAutarkyFromGr...',
    'fromBattery:SystemMeasurementsAutarkyFrom...',
    'fromSolar:SystemMeasurementsAutarkyFromSol...',
    'co2savings:Float',
    'earnings:Float',
    'percent:Float',
    'details:SystemMeasurementsSavingsDetailsRes...',
    'summary:SystemMeasurementsSavingsSummar...',
    'details:SystemMeasurementsGridDetailsRespon...'
  ];
  const statuses = ['OK', 'OK', 'OK', 'ERROR', 'OK'];

  const traces: MockTrace[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const service = services[Math.floor(Math.random() * services.length)];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const duration = Math.random() * 500000 + 50000; // 50μs to 550μs in nanoseconds
    const traceId = `trace-${(now - i * 1000).toString(36)}-${Math.random().toString(36).substr(2, 9)}`;

    traces.push({
      TraceId: traceId,
      SpanId: `span-${Math.random().toString(36).substr(2, 9)}`,
      SpanName: operation,
      ServiceName: service,
      Timestamp: new Date(now - i * (Math.random() * 5000 + 1000)).toISOString(), // Random intervals between 1-6 seconds
      Duration: Math.floor(duration),
      StatusCode: status,
      Resource: operation,
      Method: operation.startsWith('GET') ? 'GET' : 'POST',
      SpanAttributes: {
        'http.method': operation.startsWith('GET') ? 'GET' : 'POST',
        'http.status_code': status === 'ERROR' ? '500' : '200',
        'user.id': Math.floor(Math.random() * 1000).toString(),
        'region': ['us-east-1', 'us-west-2', 'eu-west-1'][Math.floor(Math.random() * 3)]
      }
    });
  }

  return traces;
};

interface MockSpan {
  TraceId: string;
  SpanId: string;
  ParentSpanId: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  SpanAttributes?: Record<string, string>;
  Resource?: string;
  Method?: string;
}

export const generateMockTraceDetail = (traceId: string): MockSpan[] => {
  const services = [
    'customer-app-gtw',
    'shadow-ingestion-engine',
    'dam-api',
    'iotdb1',
    'enpal-redis-cache',
    'mongodb',
    'customer-app-gtw-graphql',
    'epal.redis.cache'
  ];
  const operations = [
    'IngestionFlowProcessor-ingestionEngine',
    'MongoDB.CreateSystem',
    'EventHubProcessor',
    'HMGET',
    'MongoDB.GetAssetBySerialNumber',
    'Handling.Enpal.C2C.Bosch.ManufacturerConsum...',
    'fromGrid:SystemMeasurementsAutarkyFromGr...',
    'fromBattery:SystemMeasurementsAutarkyFrom...',
    'fromSolar:SystemMeasurementsAutarkyFromSol...',
    'co2savings:Float',
    'earnings:Float',
    'percent:Float',
    'details:SystemMeasurementsSavingsDetailsRes...',
    'summary:SystemMeasurementsSavingsSummar...',
    'details:SystemMeasurementsGridDetailsRespon...'
  ];
  const baseTime = Date.now() - Math.random() * 1000000;

  const spans: MockSpan[] = [];
  const traceServices = services.slice(0, Math.floor(Math.random() * 4) + 2);

  traceServices.forEach((service, index) => {
    const startTime = baseTime + index * 100000; // Stagger start times
    const duration = Math.random() * 500000 + 50000; // 50μs to 550μs

    // Create parent-child relationships
    const parentSpanId = index === 0 ? '' : spans[index - 1]?.SpanId;

    const operation = operations[Math.floor(Math.random() * operations.length)];

    spans.push({
      TraceId: traceId,
      SpanId: `span-${service}-${Math.random().toString(36).substr(2, 5)}`,
      ParentSpanId: parentSpanId,
      SpanName: operation,
      ServiceName: service,
      Timestamp: new Date(startTime).toISOString(),
      Duration: Math.floor(duration),
      StatusCode: Math.random() > 0.9 ? 'ERROR' : 'OK',
      Resource: operation,
      Method: operation.startsWith('GET') || operation.includes('MongoDB') || operation.includes('HMGET') ? 'GET' : 'POST',
      SpanAttributes: {
        'operation': 'http_request',
        'component': 'net/http',
        'span.kind': 'server',
        'http.method': index === 0 ? 'GET' : 'POST',
        'http.url': `https://${service}.example.com/api/v1/operation`,
        'http.status_code': Math.random() > 0.9 ? '500' : '200',
        'db.system': service.includes('service') ? 'postgresql' : '',
        'db.name': service.includes('service') ? 'orders_db' : '',
        'db.operation': service.includes('service') ? 'SELECT' : ''
      }
    });
  });

  return spans;
};

interface MockLog {
  Timestamp: string;
  TimestampTime: string;
  TraceId: string;
  SpanId: string;
  TraceFlags: number;
  SeverityText: string;
  SeverityNumber: number;
  ServiceName: string;
  Body: string;
  ResourceSchemaUrl?: string;
  ResourceAttributes?: Record<string, any>;
  ScopeSchemaUrl?: string;
  ScopeName?: string;
  ScopeVersion?: string;
  ScopeAttributes?: Record<string, any>;
  LogAttributes?: Record<string, any>;
}

export const generateMockLogs = (count: number = 100): MockLog[] => {
  const services = [
    'customer-app-gtw',
    'shadow-ingestion-engine',
    'dam-api',
    'iotdb1',
    'enpal-redis-cache',
    'mongodb',
    'customer-app-gtw-graphql',
    'epal.redis.cache'
  ];
  const severities = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  const messages = [
    'Processing request for user authentication',
    'Database connection established',
    'Cache miss for key: user_123',
    'Payment processing completed successfully',
    'Failed to connect to external service',
    'Rate limit exceeded for API endpoint',
    'Background job completed',
    'Invalid input parameters received',
    'System health check passed',
    'Memory usage above threshold',
    'New user registration processed',
    'Order fulfillment initiated',
    'Email notification sent',
    'File upload completed',
    'Session expired for user',
    'Data synchronization started',
    'Backup process initiated',
    'Security scan completed',
    'Performance metrics updated',
    'Configuration reloaded'
  ];

  const logs: MockLog[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const service = services[Math.floor(Math.random() * services.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const traceId = Math.random() > 0.5 ? `trace-${(now - i * 1000).toString(36)}-${Math.random().toString(36).substr(2, 9)}` : '';
    const timestamp = new Date(now - i * (Math.random() * 5000 + 1000)).toISOString();
    const spanId = `span-${Math.random().toString(36).substr(2, 9)}`;

    logs.push({
      Timestamp: timestamp,
      TimestampTime: timestamp.split('T')[1].split('.')[0], // Extract time part
      TraceId: traceId,
      SpanId: spanId,
      TraceFlags: Math.floor(Math.random() * 256), // 0-255
      SeverityText: severity,
      SeverityNumber: severity === 'DEBUG' ? 5 : severity === 'INFO' ? 9 : severity === 'WARN' ? 13 : severity === 'ERROR' ? 17 : 9,
      ServiceName: service,
      Body: message,
      ResourceAttributes: {
        'deployment.environment': 'production',
        'host.name': `${service}-7666759f8d-t4qw2`,
        'service.name': service,
        'service.version': '1.0.0'
      },
      ScopeName: service,
      ScopeVersion: '1.0.0',
      ScopeAttributes: {},
      LogAttributes: {
        'context': 'LoggingInterceptor',
        'hasBody': Math.random() > 0.5 ? 'true' : 'false',
        'ip': '127.0.0.1',
        'method': ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
        'url': `/api/${['users', 'orders', 'products', 'events'][Math.floor(Math.random() * 4)]}`
      }
    });
  }

  return logs;
};
export const getMetrics = async (page: number, limit: number, service?: string) => {
  const params: any = {  };
  params.page = page;
  params.limit = limit;
  if (service) params.service = service;
  const response = await api.get("/metrics", { params });
  console.log("getMetrics response:", response);
  return Array.isArray(response.data) ? response.data : (response.data.data || []);
};

// Mock data generator for metrics
interface MockMetric {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  interval: number;
  originProduct: string;
  subproduct: string;
  productDetail: string;
  ingestedCustomMetrics: number;
  indexedCustomMetrics: number;
  hosts: number;
  tagValues: number;
  tags: Record<string, string[]>;
  historicalMetrics: boolean;
}

export const generateMockMetrics = (count: number = 50): MockMetric[] => {
  const metricNames = [
    "CRM_BRIDGE_FAILED_REQUESTS",
    "API_RESPONSE_TIME",
    "DATABASE_CONNECTIONS",
    "CACHE_HIT_RATIO",
    "ERROR_RATE",
    "MEMORY_USAGE",
    "CPU_UTILIZATION",
    "NETWORK_TRAFFIC",
    "QUEUE_LENGTH",
    "RESPONSE_SIZE"
  ];
  const types = ["Count", "Gauge", "Histogram", "Summary"];
  const products = ["Logs", "APM", "Infrastructure", "Custom"];
  const subproducts = ["Log Metrics", "Trace Metrics", "System Metrics", "Business Metrics"];

  const metrics: MockMetric[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const name = metricNames[Math.floor(Math.random() * metricNames.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const originProduct = products[Math.floor(Math.random() * products.length)];
    const subproduct = subproducts[Math.floor(Math.random() * subproducts.length)];

    // Create realistic timestamps
    const createdDaysAgo = Math.floor(Math.random() * 365) + 1;
    const updatedHoursAgo = Math.floor(Math.random() * 24) + 1;
    const createdAt = new Date(now - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString();
    const updatedAt = new Date(now - updatedHoursAgo * 60 * 60 * 1000).toISOString();

    metrics.push({
      id: `metric-${Math.random().toString(36).substr(2, 9)}`,
      name: `${name}_${Math.floor(Math.random() * 1000)}`,
      createdAt,
      updatedAt,
      type,
      interval: Math.floor(Math.random() * 300) + 10, // 10-310 seconds
      originProduct,
      subproduct,
      productDetail: `${originProduct} to Metrics`,
      ingestedCustomMetrics: Math.floor(Math.random() * 100),
      indexedCustomMetrics: Math.floor(Math.random() * 50) + 1,
      hosts: Math.floor(Math.random() * 10) + 1,
      tagValues: Math.floor(Math.random() * 20) + 1,
      tags: {
        env: ["production", "staging", "development"],
        region: ["us-east-1", "us-west-2", "eu-west-1"],
        service: ["api", "worker", "web", "db"]
      },
      historicalMetrics: Math.random() > 0.5
    });
  }

  return metrics;
};
