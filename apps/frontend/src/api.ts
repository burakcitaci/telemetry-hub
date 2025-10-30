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
