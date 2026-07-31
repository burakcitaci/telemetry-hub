import axios from 'axios';
import type { ApiEnvelope } from '@/shared/types/telemetry';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15_000,
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
