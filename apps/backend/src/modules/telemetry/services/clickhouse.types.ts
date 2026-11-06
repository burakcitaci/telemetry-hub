export interface TelemetryListOptions {
  env?: string;
  limit?: number;
  offset?: number;
  service?: string;
}

export interface LogsListOptions extends TelemetryListOptions {
  from?: string;
  to?: string;
}

export interface TelemetryStreamOptions {
  since: Date;
  until: Date;
}

export interface TelemetryChangeSignal {
  eventCount: number;
  fingerprint: string;
}

export interface TenantQueryFilter {
  predicate: string;
  where: string;
  params: Record<string, string | string[]>;
}
