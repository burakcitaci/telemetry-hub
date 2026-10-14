import { AsyncLocalStorage } from 'node:async_hooks';
import { trace } from '@opentelemetry/api';
import type { TenantScope } from '../../modules/auth/auth.types';

export interface TelemetryContext { scope?: TenantScope }
const contexts = new AsyncLocalStorage<TelemetryContext>();
const spanScopes = new WeakMap<object, TenantScope>();

export function runTelemetryContext<T>(state: TelemetryContext, action: () => T): T {
  return contexts.run(state, action);
}

export function authenticatedTelemetryScope(scope: TenantScope): void {
  const trusted = { tenantSlug: scope.tenantSlug, role: scope.role, teamId: scope.teamId };
  const state = contexts.getStore();
  if (state) state.scope = trusted;
  const span = trace.getActiveSpan();
  if (span) recordTelemetrySpanScope(span, trusted);
}

export function currentTelemetryScope(): TenantScope | undefined { return contexts.getStore()?.scope; }

export function recordTelemetrySpanScope(span: object, scope: TenantScope): void {
  spanScopes.set(span, { ...scope });
}

export function telemetryScopeForSpan(span: object): TenantScope | undefined {
  return spanScopes.get(span) ?? currentTelemetryScope();
}

type OwnershipResolver = (org: string, service: string) => string | undefined;
let resolveOwnership: OwnershipResolver | undefined;

export function registerTelemetryOwnership(resolver: OwnershipResolver): () => void {
  resolveOwnership = resolver;
  return () => { if (resolveOwnership === resolver) resolveOwnership = undefined; };
}

export function telemetryServiceTeam(org: string, service: string): string | undefined {
  return resolveOwnership?.(org, service);
}
