import axios from 'axios';

export const FIELD = 'w-full rounded-md border border-input bg-background text-sm';
export const LABEL = 'text-sm font-medium';
export interface Team {
  id: string;
  name: string;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.errors ?? error.response?.data?.message;
    return Array.isArray(message) ? message.join(' · ') : message || error.message;
  }
  return error instanceof Error ? error.message : fallback;
}
