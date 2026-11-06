import axios from 'axios';

export const FIELD = 'h-8 rounded-sm border-border bg-background text-xs';
export const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-muted-foreground';
export const PANEL = 'rounded-sm border border-border bg-card p-5 text-card-foreground';
export interface Team { id: string; name: string }

export function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.errors ?? error.response?.data?.message;
    return Array.isArray(message) ? message.join(' · ') : message || error.message;
  }
  return error instanceof Error ? error.message : fallback;
}
