import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_MONITOR_QUERY_LENGTH, parseMonitorQuery, type QueryWarning } from './query-parser';

const resourceKeys = ['service.name', 'service.namespace', 'service.version',
  'deployment.environment', 'deployment.environment.name', 'otel.scope.name'];

for (const [signal, query, signalKeys, expected] of [
  ['log', 'severity_text:ERROR deployment.environment:production', ['severity_text'],
    { severity_text: 'ERROR', 'deployment.environment': 'production' }],
  ['metric', 'metric_name:http.server.request.duration service.name:api', ['metric_name'],
    { metric_name: 'http.server.request.duration', 'service.name': 'api' }],
  ['trace', 'service.name:checkout status.code:ERROR db.system:postgres', ['status.code', 'db.system'],
    { 'service.name': 'checkout', 'status.code': 'ERROR', 'db.system': 'postgres' }],
] as const) {
  test(`${signal} filters preserve dotted keys and use the same AND parser`, () => {
    const result = parseMonitorQuery(query, new Set([...resourceKeys, ...signalKeys]));
    assert.deepEqual(result, { filters: expected, warnings: [] });
  });
}

test('all documented resource and attribute keys remain literal, with no alias rewriting', () => {
  const keys = [...resourceKeys, 'http.status_code', 'rpc.grpc.status_code', 'db.system', 'messaging.system'];
  const result = parseMonitorQuery(keys.map(key => `${key}:test`).join(' '), new Set(keys));
  assert.deepEqual(result.filters, Object.fromEntries(keys.map(key => [key, 'test'])));
});

test('unknown keys are ignored with observable structured warnings that exclude values', () => {
  const warnings: QueryWarning[] = [];
  const result = parseMonitorQuery('unknown.key:private service.name:api', new Set(resourceKeys), item => warnings.push(item));
  assert.deepEqual(result.filters, { 'service.name': 'api' });
  assert.deepEqual(warnings, [{ code: 'UNKNOWN_QUERY_KEY', key: 'unknown.key' }]);
  assert.deepEqual(result.warnings, warnings);
});

test('whitespace and empty queries preserve explicit match-all semantics', () => {
  assert.deepEqual(parseMonitorQuery(' \t\n ', new Set(resourceKeys)), { filters: {}, warnings: [] });
  assert.deepEqual(parseMonitorQuery(' \tservice.name:api\nservice.version:1.2\t ', new Set(resourceKeys)).filters,
    { 'service.name': 'api', 'service.version': '1.2' });
});

test('quoted values support spaces and JSON escapes, and colons remain part of a value', () => {
  const query = 'service.name:"checkout api" service.version:"release\\\"1" otel.scope.name:https://example.test:4318';
  assert.deepEqual(parseMonitorQuery(query, new Set(resourceKeys)).filters,
    { 'service.name': 'checkout api', 'service.version': 'release"1', 'otel.scope.name': 'https://example.test:4318' });
});

test('repeated identical filters are idempotent and conflicting duplicates fail', () => {
  assert.deepEqual(parseMonitorQuery('service.name:api service.name:api', new Set(resourceKeys)).filters, { 'service.name': 'api' });
  assert.throws(() => parseMonitorQuery('service.name:api service.name:web', new Set(resourceKeys)), SyntaxError);
});

for (const query of ['service.name', ':api', 'service.name:', 'service.name:""', '@service.name:api',
  'service.name:api AND severity_text:ERROR', 'service.name:api OR service.name:web',
  '!service.name:api', '-service.name:api', 'service.name:!api', 'http.status_code:>500',
  'service.name:*', '*', '(service.name:api)', 'service.name:"api"trailing',
  'service.name:"unterminated', 'service.name:"bad\\q"', 'unknown.key:*']) {
  test(`unsupported or malformed query fails: ${query}`, () => {
    assert.throws(() => parseMonitorQuery(query, new Set(resourceKeys)), SyntaxError);
  });
}

test('query length is bounded before tokenization', () => {
  assert.doesNotThrow(() => parseMonitorQuery(`service.name:${'a'.repeat(MAX_MONITOR_QUERY_LENGTH - 13)}`, new Set(resourceKeys)));
  assert.throws(() => parseMonitorQuery('a'.repeat(MAX_MONITOR_QUERY_LENGTH + 1), new Set(resourceKeys)), SyntaxError);
});

test('SQL-like values remain literal data for adapters to parameterize', () => {
  const value = "api'; DROP TABLE otel_logs; --";
  assert.deepEqual(parseMonitorQuery(`service.name:${JSON.stringify(value)}`, new Set(resourceKeys)).filters, { 'service.name': value });
});

test('object prototype names cannot escape the adapter-owned key allowlist', () => {
  const result = parseMonitorQuery('__proto__:polluted constructor:polluted service.name:api', new Set(resourceKeys), () => {});
  assert.deepEqual(result.filters, { 'service.name': 'api' });
  assert.equal(Object.getPrototypeOf(result.filters), Object.prototype);
  assert.equal(result.warnings.length, 2);
});

test('invalid queries do not emit partial unknown-key warnings', () => {
  const warnings: QueryWarning[] = [];
  assert.throws(() => parseMonitorQuery('unknown:private invalid', new Set(resourceKeys), item => warnings.push(item)), SyntaxError);
  assert.deepEqual(warnings, []);
});
