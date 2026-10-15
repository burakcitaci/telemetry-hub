import { parseMonitorQuery, type QueryWarning } from '../query-parser';
import type { SignalType } from '../signal-adapter';

const RESOURCE_KEYS = ['service.name', 'service.namespace', 'service.version',
  'deployment.environment', 'deployment.environment.name', 'otel.scope.name'];
const ATTRIBUTE_KEYS = ['http.status_code', 'http.response.status_code', 'rpc.grpc.status_code',
  'db.system', 'db.system.name', 'messaging.system'];
const SIGNAL_KEYS: Partial<Record<SignalType, string[]>> = { LOG: ['severity_text'], TRACE: ['status.code'], METRIC: ['metric_name'] };
const KNOWN_KEYS = new Set([...RESOURCE_KEYS, ...ATTRIBUTE_KEYS, ...Object.values(SIGNAL_KEYS).flat()]);
const ALIASES: Record<string, string[]> = {
  'http.status_code': ['http.response.status_code', 'http.status_code'],
  'http.response.status_code': ['http.response.status_code', 'http.status_code'],
  'db.system': ['db.system.name', 'db.system'], 'db.system.name': ['db.system.name', 'db.system'],
};

export function attributeValue(key: string, signal: SignalType, params: Record<string, unknown>, index: string): string {
  const map = { LOG: 'LogAttributes', TRACE: 'SpanAttributes', METRIC: 'Attributes' }[signal];
  if (!map) throw new Error(`No stored attribute mapping for ${signal}.`);
  const keys = ALIASES[key] ?? [key];
  const values = keys.flatMap((name, i) => {
    params[`${index}key${i}`] = name;
    return [`nullIf(${map}[{${index}key${i}:String}], '')`, `nullIf(ResourceAttributes[{${index}key${i}:String}], '')`];
  });
  return `coalesce(${values.join(', ')}, '')`;
}

function fieldFor(key: string, signal: SignalType, params: Record<string, unknown>, index: number): string {
  if (key === 'service.name') return "coalesce(nullIf(ServiceName, ''), ResourceAttributes['service.name'])";
  if (key.startsWith('deployment.environment'))
    return "coalesce(nullIf(ResourceAttributes['deployment.environment.name'], ''), ResourceAttributes['deployment.environment'])";
  if (key === 'otel.scope.name') return 'ScopeName';
  if (key === 'severity_text') return 'upperUTF8(SeverityText)';
  if (key === 'status.code') return "if(StatusCode = '', 'UNSET', upperUTF8(StatusCode))";
  if (key === 'metric_name') return 'MetricName';
  if (RESOURCE_KEYS.includes(key)) {
    params[`resourceKey${index}`] = key;
    return `ResourceAttributes[{resourceKey${index}:String}]`;
  }
  return attributeValue(key, signal, params, `filter${index}`);
}

export function compileFilters(query: string, signal: SignalType, params: Record<string, unknown>,
  warn?: (warning: QueryWarning) => void) {
  const parsed = parseMonitorQuery(query, KNOWN_KEYS, warn);
  const predicates = Object.entries(parsed.filters).map(([key, value], index) => {
    if (Object.values(SIGNAL_KEYS).flat().includes(key) && !(SIGNAL_KEYS[signal] ?? []).includes(key))
      throw new Error(`Query key ${key} is not valid for ${signal}.`);
    params[`queryValue${index}`] = ['severity_text', 'status.code'].includes(key) ? value.toUpperCase() : value;
    return `${fieldFor(key, signal, params, index)} = {queryValue${index}:String}`;
  });
  return { ...parsed, predicates };
}
