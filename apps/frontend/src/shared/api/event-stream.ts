import { BACKEND_URL } from '@/shared/api/client';

export function createEventSource(): EventSource {
  const filters = new URLSearchParams(window.location.search);
  filters.delete('globalEnv');
  filters.getAll('env').forEach((value) => filters.append('globalEnv', value));
  return new EventSource(`${BACKEND_URL}/api/events/stream?${filters}`, {
    withCredentials: true,
  });
}
