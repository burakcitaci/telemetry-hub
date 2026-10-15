import type { ConfigService } from '@nestjs/config';

export const DEFAULT_ALERT_RETENTION_DAYS = 30;
export const DEFAULT_ALERT_PRUNE_INTERVAL_SECONDS = 3600;
export interface AlertRetentionConfig { days: number; intervalSeconds: number; }

export function alertRetentionConfig(config: Pick<ConfigService, 'get'>): AlertRetentionConfig {
  const days = Number(config.get('MONITOR_ALERT_RETENTION_DAYS') ?? DEFAULT_ALERT_RETENTION_DAYS);
  const intervalSeconds = Number(config.get('MONITOR_ALERT_PRUNE_INTERVAL_SECONDS') ?? DEFAULT_ALERT_PRUNE_INTERVAL_SECONDS);
  if (!Number.isSafeInteger(days) || days <= 0 || !Number.isFinite(new Date(Date.now() - days * 86400000).getTime()))
    throw new Error('MONITOR_ALERT_RETENTION_DAYS must be a positive, representable integer.');
  if (!Number.isSafeInteger(intervalSeconds) || intervalSeconds <= 0 || intervalSeconds * 1000 > 2147483647)
    throw new Error('MONITOR_ALERT_PRUNE_INTERVAL_SECONDS must fit a positive Node timer.');
  return { days, intervalSeconds };
}
