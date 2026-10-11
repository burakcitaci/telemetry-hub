import type { Attributes } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { ResourceMetrics, MetricData } from '@opentelemetry/sdk-metrics';
import type { TenantScope } from '../../modules/auth/auth.types';

export function tenantAttributes(scope: TenantScope): Attributes {
  const team = scope.role === 'admin' ? scope.teamFilter ?? scope.teamId : scope.teamId;
  return { 'org.slug': scope.tenantSlug, 'team.id': team ?? '' };
}

// Process-wide telemetry has a deployment owner, never the last logged-in user.
export function deploymentTenantAttributes(env: NodeJS.ProcessEnv): Attributes {
  if (env.OTEL_ORG_SLUG) {
    return { 'org.slug': env.OTEL_ORG_SLUG, 'team.id': env.OTEL_TEAM_ID ?? '' };
  }
  try {
    const users = JSON.parse(env.AUTH_USERS_JSON ?? '[]') as { tenantSlug?: string }[];
    const orgs = [...new Set(users.map((user) => user.tenantSlug).filter(Boolean))];
    return orgs.length === 1 ? { 'org.slug': orgs[0], 'team.id': '' } : {};
  } catch {
    return {};
  }
}

export function partitionTenantMetrics(input: ResourceMetrics): ResourceMetrics[] {
  const groups = new Map<string, ResourceMetrics>();
  for (const scope of input.scopeMetrics) {
    for (const metric of scope.metrics) {
      const points = new Map<string, { attributes: Attributes; points: unknown[] }>();
      for (const point of metric.dataPoints) {
        const attrs = point.attributes;
        const hasOrg = typeof attrs['org.slug'] === 'string';
        const org = hasOrg ? attrs['org.slug'] : input.resource.attributes['org.slug'];
        const team = hasOrg ? attrs['team.id'] ?? '' : input.resource.attributes['team.id'] ?? '';
        const key = JSON.stringify([org ?? '', team]);
        const group = points.get(key) ?? { attributes: { 'org.slug': org, 'team.id': team }, points: [] };
        group.points.push(point);
        points.set(key, group);
      }
      for (const [key, partition] of points) {
        appendMetric(groups, key, input, scope.scope, metric, partition);
      }
    }
  }
  return [...groups.values()];
}

function appendMetric(
  groups: Map<string, ResourceMetrics>, key: string, input: ResourceMetrics,
  scope: ResourceMetrics['scopeMetrics'][number]['scope'], metric: MetricData,
  partition: { attributes: Attributes; points: unknown[] },
): void {
  const group = groups.get(key) ?? {
    resource: input.resource.merge(resourceFromAttributes(partition.attributes)), scopeMetrics: [],
  };
  const scopeGroup = group.scopeMetrics.find((candidate) => candidate.scope === scope);
  const scoped = scopeGroup ?? { scope, metrics: [] };
  if (!scopeGroup) group.scopeMetrics.push(scoped);
  scoped.metrics.push({ ...metric, dataPoints: partition.points } as MetricData);
  groups.set(key, group);
}
