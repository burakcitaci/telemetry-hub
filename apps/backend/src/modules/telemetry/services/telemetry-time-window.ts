import { BadRequestException } from '@nestjs/common';
import { telemetryEnvironment } from './telemetry-environment';

export interface TelemetryTimeWindow {
  from?: string;
  to?: string;
  env?: string;
}

export function telemetryTimeWindow(
  window: TelemetryTimeWindow,
  column: 'TimeUnix' | 'Timestamp',
  required = false,
) {
  if (!required && window.from === undefined && window.to === undefined)
    return { sql: '', params: {} };
  const { from, to } = window;
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i;
  if (
    !from ||
    !to ||
    !zoned.test(from) ||
    !zoned.test(to) ||
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    Date.parse(from) > Date.parse(to)
  ) {
    throw new BadRequestException(
      'from and to must be ordered ISO timestamps with timezone',
    );
  }
  return {
    sql: `${column} >= fromUnixTimestamp64Milli({from:Int64}, 'UTC') AND ${column} <= fromUnixTimestamp64Milli({to:Int64}, 'UTC')`,
    params: { from: Date.parse(from), to: Date.parse(to) },
  };
}

export function metricTimeWindow(window: TelemetryTimeWindow) {
  const time = telemetryTimeWindow(window, 'TimeUnix');
  const environment = telemetryEnvironment(window.env);
  return {
    sql: [time.sql, environment.sql].filter(Boolean).join(' AND '),
    params: { ...time.params, ...environment.params },
  };
}
