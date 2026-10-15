import type { AlertDelivery, AlertEvent, Monitor, MonitorRuntime, NotificationRuntime } from './monitor.model';

export function validateNotificationPolicy(monitor: Monitor): void {
  if (monitor.muted_until !== undefined && !Number.isFinite(Date.parse(monitor.muted_until)))
    throw new Error('Mute expiry must be a valid date.');
  if (monitor.cooldown_seconds !== undefined && (!Number.isSafeInteger(monitor.cooldown_seconds) || monitor.cooldown_seconds < 0))
    throw new Error('Cooldown seconds must be a non-negative integer.');
}

function decision(monitor: Monitor, event: AlertEvent, notifications: NotificationRuntime, at: string): AlertDelivery {
  const now = Date.parse(at);
  if (monitor.muted_until && Date.parse(monitor.muted_until) > now) return { status: 'SUPPRESSED', reason: 'MUTED' };
  if (event.state === 'RECOVERED' && notifications.active_firing_status !== 'SENT')
    return { status: 'SUPPRESSED', reason: 'UNPAIRED_RECOVERY' };
  const lastAttempt = notifications.last_firing_attempt_at;
  if (event.state === 'FIRING' && lastAttempt && now < Date.parse(lastAttempt) + (monitor.cooldown_seconds ?? 0) * 1000)
    return { status: 'SUPPRESSED', reason: 'COOLDOWN' };
  return { status: 'PENDING', attempted_at: at };
}

export function planNotification(monitor: Monitor, runtime: MonitorRuntime, event: AlertEvent | undefined, at: string) {
  const notifications = { ...monitor.runtime?.notifications };
  const next = { ...runtime, notifications };
  if (!event) return { runtime: next, event: undefined };
  const notification = decision(monitor, event, notifications, at);
  if (event.state === 'FIRING') {
    notifications.active_firing_event_id = event.id;
    notifications.active_firing_status = notification.status;
    if (notification.status === 'PENDING') notifications.last_firing_attempt_at = at;
  } else {
    delete notifications.active_firing_event_id;
    delete notifications.active_firing_status;
  }
  return { runtime: next, event: { ...event, notification } };
}
