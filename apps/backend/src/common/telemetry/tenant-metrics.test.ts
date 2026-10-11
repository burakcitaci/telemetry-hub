import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { AggregationTemporality, DataPointType } from '@opentelemetry/sdk-metrics';
import { ValueType } from '@opentelemetry/api';
import type { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { deploymentTenantAttributes, partitionTenantMetrics, tenantAttributes } from './tenant-metrics';

test('runtime telemetry uses a fixed owner and never guesses among multiple organizations', () => {
  assert.deepEqual(deploymentTenantAttributes({ AUTH_USERS_JSON: '[{"tenantSlug":"demo"}]' }),
    { 'org.slug': 'demo', 'team.id': '' });
  assert.deepEqual(deploymentTenantAttributes({ AUTH_USERS_JSON: '[{"tenantSlug":"a"},{"tenantSlug":"b"}]' }), {});
  assert.deepEqual(deploymentTenantAttributes({ OTEL_ORG_SLUG: 'ops', OTEL_TEAM_ID: 'platform' }),
    { 'org.slug': 'ops', 'team.id': 'platform' });
  assert.deepEqual(deploymentTenantAttributes({ AUTH_USERS_JSON: 'invalid' }), {});
});

test('original metric names and values survive export with separate org/team resources', () => {
  const input: ResourceMetrics = {
    resource: resourceFromAttributes({ 'service.name': 'backend', 'org.slug': 'ops', 'team.id': 'infra' }),
    scopeMetrics: [{ scope: { name: 'my-app' }, metrics: [{
      descriptor: { name: 'http.requests', description: 'requests', unit: '1', valueType: ValueType.DOUBLE },
      aggregationTemporality: AggregationTemporality.CUMULATIVE,
      dataPointType: DataPointType.SUM, isMonotonic: true,
      dataPoints: [
        { attributes: tenantAttributes({ tenantSlug: 'a', role: 'user', teamId: 'one' }), value: 3, startTime: [1, 0], endTime: [2, 0] },
        { attributes: tenantAttributes({ tenantSlug: 'b', role: 'admin' }), value: 7, startTime: [1, 0], endTime: [2, 0] },
        { attributes: {}, value: 10, startTime: [1, 0], endTime: [2, 0] },
      ],
    }] }],
  };
  const output = partitionTenantMetrics(input);
  assert.equal(output.length, 3);
  assert.deepEqual(output.map((batch) => [batch.resource.attributes['org.slug'], batch.resource.attributes['team.id']]),
    [['a', 'one'], ['b', ''], ['ops', 'infra']]);
  assert.deepEqual(output.map((batch) => batch.scopeMetrics[0].metrics[0].descriptor.name),
    ['http.requests', 'http.requests', 'http.requests']);
  assert.deepEqual(output.map((batch) => batch.scopeMetrics[0].metrics[0].dataPoints[0].value), [3, 7, 10]);
  assert.equal(input.scopeMetrics[0].metrics[0].dataPoints.length, 3);
  assert.equal(input.resource.attributes['org.slug'], 'ops');
});

test('user cannot override its own team with an admin filter', () => {
  assert.equal(tenantAttributes({ tenantSlug: 'demo', role: 'user', teamId: 'one', teamFilter: 'two' })['team.id'], 'one');
  assert.equal(tenantAttributes({ tenantSlug: 'demo', role: 'admin', teamFilter: 'two' })['team.id'], 'two');
});
