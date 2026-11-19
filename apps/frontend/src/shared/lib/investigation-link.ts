import { DEFAULT_TELEMETRY_RANGE, resolveTelemetryRange } from './telemetry';
import { platformFilterSearch } from './platform-filters';

export function investigationScope(search: string): string {
  const source = new URLSearchParams(search);
  const params = new URLSearchParams(platformFilterSearch(search));
  const range = source.get('range') || source.get('time');
  if (range) params.set('range', range);
  if (!params.has('globalService')) source.getAll('service').forEach(value => params.append('globalService', value));
  return params.size ? '?' + params : '';
}

export function investigationUrl(pathname: string, search: string, traceId?: string, now = Date.now()) {
  const params = new URLSearchParams(search);
  const range = resolveTelemetryRange(params.get('range') || params.get('time') || DEFAULT_TELEMETRY_RANGE, now);
  params.delete('time');
  params.set('range', range.from.toISOString() + ' to ' + range.to.toISOString());
  if (traceId) params.set('trace', traceId);
  return pathname + '?' + params;
}

export function signInDestination(tenant: string, returnTo: unknown): string {
  const base = '/org/' + encodeURIComponent(tenant) + '/';
  if (typeof returnTo !== 'string' || !returnTo.startsWith(base)) return base + 'metrics';
  const origin = 'https://telemetry-hub.invalid';
  const url = URL.parse(returnTo, origin);
  return url?.origin === origin && url.pathname.startsWith(base)
    ? url.pathname + url.search : base + 'metrics';
}
