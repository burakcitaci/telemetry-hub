import type { ConfigService } from '@nestjs/config';

export const DEFAULT_ALERT_RETENTION_DAYS = 30;
export const DEFAULT_ALERT_PRUNE_INTERVAL_SECONDS = 3600;
export interface AlertRetentionConfig { days: number; intervalSeconds: number; }

export interface MonitoringConfig {
  intervalMs: number; initialDelayMs: number; defaultWindowSeconds: number; notifier: 'dummy';
  retention: AlertRetentionConfig;
}

export function monitoringConfig(config: Pick<ConfigService, 'get'>): MonitoringConfig {
  const intervalMs = integerSetting(config, 'MONITOR_CHECK_INTERVAL_SECONDS', 30, 1, 2147483) * 1000;
  const initialDelayMs = integerSetting(config, 'MONITOR_INITIAL_DELAY_SECONDS', 1, 0, 2147483) * 1000;
  const defaultWindowSeconds = integerSetting(config, 'MONITOR_DEFAULT_WINDOW_SECONDS', 300, 1, 8640000000000);
  const notifier = config.get('MONITOR_NOTIFIER') ?? 'dummy';
  if (notifier !== 'dummy') throw new Error('MONITOR_NOTIFIER must be dummy.');
  return { intervalMs, initialDelayMs, defaultWindowSeconds, notifier, retention: alertRetentionConfig(config) };
}

function integerSetting(config: Pick<ConfigService, 'get'>, key: string, fallback: number, min: number, max: number): number {
  const raw = config.get(key) ?? fallback;
  const value = typeof raw === 'number' || typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${key} must be an integer from ${min} to ${max}.`);
  return value;
}

export function alertRetentionConfig(config: Pick<ConfigService, 'get'>): AlertRetentionConfig {
  const days = integerSetting(config, 'MONITOR_ALERT_RETENTION_DAYS', DEFAULT_ALERT_RETENTION_DAYS, 1, Number.MAX_SAFE_INTEGER);
  const intervalSeconds = integerSetting(config, 'MONITOR_ALERT_PRUNE_INTERVAL_SECONDS', DEFAULT_ALERT_PRUNE_INTERVAL_SECONDS, 1, 2147483);
  if (!Number.isFinite(new Date(Date.now() - days * 86400000).getTime()))
    throw new Error('MONITOR_ALERT_RETENTION_DAYS must be a positive, representable integer.');
  return { days, intervalSeconds };
}
