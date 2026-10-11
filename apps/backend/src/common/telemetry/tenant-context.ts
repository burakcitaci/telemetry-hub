import { AsyncLocalStorage } from 'node:async_hooks';
import { trace } from '@opentelemetry/api';
import type { TenantScope } from '../../modules/auth/auth.types';

export interface TelemetryContext { scope?: TenantScope }
const contexts = new AsyncLocalStorage<TelemetryContext>();
const traceScopes = new Map<string, { scope: TenantScope; expiresAt: number }>();
const TRACE_SCOPE_TTL_MS = 5 * 60_000;
const MAX_TRACE_SCOPES = 50_000;

export function runTelemetryContext<T>(state: TelemetryContext, action: () => T): T {
  return contexts.run(state, action);
}

export function authenticatedTelemetryScope(scope: TenantScope): void {
  const trusted = { tenantSlug: scope.tenantSlug, role: scope.role, teamId: scope.teamId };
  const state = contexts.getStore();
  if (state) state.scope = trusted;
  const traceId = trace.getActiveSpan()?.spanContext().traceId;
  if (traceId) recordTelemetryTraceScope(traceId, trusted);
}

export function currentTelemetryScope(): TenantScope | undefined { return contexts.getStore()?.scope; }

export function recordTelemetryTraceScope(traceId: string, scope: TenantScope): void {
  const now = Date.now();
  traceScopes.set(traceId, { scope: { ...scope }, expiresAt: now + TRACE_SCOPE_TTL_MS });
  if (traceScopes.size <= MAX_TRACE_SCOPES) return;
  for (const [id, value] of traceScopes) {
    if (value.expiresAt <= now || traceScopes.size > MAX_TRACE_SCOPES * 0.8) traceScopes.delete(id);
    if (traceScopes.size <= MAX_TRACE_SCOPES * 0.8) break;
  }
}

export function telemetryScopeForTrace(traceId: string): TenantScope | undefined {
  const recorded = traceScopes.get(traceId);
  if (recorded && recorded.expiresAt > Date.now()) return recorded.scope;
  if (recorded) traceScopes.delete(traceId);
  return currentTelemetryScope();
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
