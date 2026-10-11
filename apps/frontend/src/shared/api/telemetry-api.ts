import { api, BACKEND_URL } from '@/shared/api/client';

export async function generateTelemetry(): Promise<void> {
  await api.get('/data');
}

export function createEventSource(): EventSource {
  const filters = new URLSearchParams(window.location.search);
  filters.set('globalEnv', filters.get('env') || 'all');
  return new EventSource(`${BACKEND_URL}/api/events/stream?${filters}`, {
    withCredentials: true,
  });
}
