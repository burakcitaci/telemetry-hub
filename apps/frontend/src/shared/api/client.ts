import axios from 'axios';
import type { ApiEnvelope } from '@/shared/types/telemetry';
import { readPlatformFilters } from '@/shared/lib/platform-filters';

export const BACKEND_URL = 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15_000,
  withCredentials: true,
});

// One filter source for every explorer. Auth/admin requests never inherit telemetry filters.
api.interceptors.request.use(config => {
  if (!/^\/(metrics|logs|traces|services|monitors|events|data)(?:[/?]|$)/.test(config.url ?? '')) return config;
  const { team, service, env } = readPlatformFilters(window.location.search);
  config.headers.set('X-Team-Filter', team || 'all');
  config.headers.set('X-Service-Filter', service || 'all');
  config.headers.set('X-Environment-Filter', env);
  const [path, query] = (config.url ?? '').split('?');
  const params = new URLSearchParams(query);
  params.delete('env');
  config.url = path + (params.size ? `?${params}` : '');
  config.params = { ...config.params, env };
  return config;
});

api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !/\/auth\/login/.test(error.config?.url ?? '')
    && window.location.pathname !== '/login') window.location.assign('/login');
  return Promise.reject(error);
});

export function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

export function asNumber(value: number | string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
