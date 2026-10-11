import { api, BACKEND_URL } from '@/shared/api/client';

export async function generateTelemetry(): Promise<void> {
  await api.get('/data');
}

export function createEventSource(): EventSource {
  const filters = new URLSearchParams(window.location.search);
  filters.delete('globalEnv');
  filters.getAll('env').forEach(value => filters.append('globalEnv', value));
  return new EventSource(`${BACKEND_URL}/api/events/stream?${filters}`, {
    withCredentials: true,
  });
}
