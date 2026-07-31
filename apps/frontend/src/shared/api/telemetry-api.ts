import { api, BACKEND_URL } from '@/shared/api/client';

export async function generateTelemetry(): Promise<void> {
  await api.get('/data');
}

export function createEventSource(): EventSource {
  return new EventSource(`${BACKEND_URL}/api/events/stream`);
}
