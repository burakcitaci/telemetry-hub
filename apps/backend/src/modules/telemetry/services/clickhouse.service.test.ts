import assert from 'node:assert/strict';
import test from 'node:test';
import { ClickhouseService } from './clickhouse.service';

test('service discovery spans every OTel signal table and ignores status selection', async () => {
  const clickhouse = new ClickhouseService({} as never, {} as never);
  let captured:
    | { scope: Record<string, unknown>; sql: string; params: Record<string, unknown> }
    | undefined;

  clickhouse.executeTenantQuery = async (scope, sql, params = {}) => {
    captured = { scope, sql, params };
    return [{ ServiceName: 'external-python-service' }];
  };

  const rows = await clickhouse.getServices(
    { tenantSlug: 'acme', role: 'admin', statusFilter: ['ERROR'] },
    'production',
  );

  assert.deepEqual(rows, [{ ServiceName: 'external-python-service' }]);
  assert.equal(captured?.scope.statusFilter, undefined);
  assert.equal(captured?.params.tenant, 'acme');
  assert.equal(captured?.params.env, 'production');
  for (const table of [
    'otel_traces',
    'otel_logs',
    'otel_metrics_gauge',
    'otel_metrics_sum',
    'otel_metrics_histogram',
  ]) {
    assert.match(captured?.sql ?? '', new RegExp(`FROM ${table}`));
  }
  assert.match(captured?.sql ?? '', /SELECT DISTINCT ServiceName/);
  assert.match(captured?.sql ?? '', /org_slug = \{tenant:String\}/);
});
