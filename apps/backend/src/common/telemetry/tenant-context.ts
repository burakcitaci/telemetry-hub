import { AsyncLocalStorage } from 'node:async_hooks';
import type { TenantScope } from '../../modules/auth/auth.types';

export interface TelemetryContext { scope?: TenantScope }
const contexts = new AsyncLocalStorage<TelemetryContext>();

export function runTelemetryContext<T>(state: TelemetryContext, action: () => T): T {
  return contexts.run(state, action);
}

export function authenticatedTelemetryScope(scope: TenantScope): void {
  const state = contexts.getStore();
  if (state) state.scope = { tenantSlug: scope.tenantSlug, role: scope.role, teamId: scope.teamId };
}

export function currentTelemetryScope(): TenantScope | undefined { return contexts.getStore()?.scope; }

type OwnershipResolver = (org: string, service: string) => string | undefined;
let resolveOwnership: OwnershipResolver | undefined;

export function registerTelemetryOwnership(resolver: OwnershipResolver): () => void {
  resolveOwnership = resolver;
  return () => { if (resolveOwnership === resolver) resolveOwnership = undefined; };
}

export function telemetryServiceTeam(org: string, service: string): string | undefined {
  return resolveOwnership?.(org, service);
}
