import { format } from 'date-fns';
import { parseTimeRange, resolveTimeRange } from './time-range';

export const DEFAULT_TELEMETRY_RANGE = '5m';

export function resolveTelemetryRange(range: string, now = Date.now()) {
  const spec = parseTimeRange(range, now);
  if (!spec) throw new RangeError(`Invalid telemetry range: ${range}`);
  const resolved = resolveTimeRange(spec, now);
  const from = resolved.from.getTime();
  const to = resolved.to.getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    throw new RangeError(`Invalid telemetry range: ${range}`);
  }
  return resolved;
}

export const TELEMETRY_FETCH_LIMIT = 200;

const CLICKHOUSE_TIMESTAMP_PATTERN =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?$/;

export function parseTelemetryTimestamp(timestamp: string): Date {
  const normalized = timestamp.trim();
  const clickhouseMatch = CLICKHOUSE_TIMESTAMP_PATTERN.exec(normalized);

  if (clickhouseMatch) {
    const [, date, time, fractional = ''] = clickhouseMatch;
    const milliseconds = fractional.padEnd(3, '0').slice(0, 3);
    return new Date(`${date}T${time}.${milliseconds}Z`);
  }

  return new Date(normalized);
}

export function getTelemetryTimestampMs(timestamp: string): number {
  return parseTelemetryTimestamp(timestamp).getTime();
}

export function formatTelemetryTimestamp(timestamp: string): string {
  const date = parseTelemetryTimestamp(timestamp);
  return Number.isNaN(date.getTime())
    ? 'Invalid date'
    : format(date, 'MMM dd HH:mm:ss.SSS');
}

export function formatDuration(
  nanoseconds: number | string | undefined,
): string {
  const value = Number(nanoseconds ?? 0);
  if (!Number.isFinite(value) || value < 0) return 'N/A';

  const microseconds = value / 1_000;
  if (microseconds < 1_000) return `${microseconds.toFixed(1)}µs`;

  const milliseconds = microseconds / 1_000;
  if (milliseconds < 1_000) return `${milliseconds.toFixed(2)}ms`;

  return `${(milliseconds / 1_000).toFixed(2)}s`;
}

export function isWithinTimeRange(
  timestamp: string,
  range: string,
  now = Date.now(),
): boolean {
  const timestampMs = getTelemetryTimestampMs(timestamp);
  if (!Number.isFinite(timestampMs)) return false;

  try {
    const { from, to } = resolveTelemetryRange(range, now);
    return timestampMs >= from.getTime() && timestampMs <= to.getTime();
  } catch {
    return false;
  }
}
