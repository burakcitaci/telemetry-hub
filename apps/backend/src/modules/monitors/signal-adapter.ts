import type { TenantScope } from '../auth/auth.types';
import type { QueryWarning } from './query-parser';

export const SIGNAL_TYPES = ['LOG', 'METRIC', 'TRACE'] as const;
export type SignalType = typeof SIGNAL_TYPES[number];
export const AGGREGATIONS = ['COUNT', 'AVG', 'SUM', 'MAX', 'MIN', 'P95', 'P99'] as const;
export type Aggregation = typeof AGGREGATIONS[number];

export interface SignalQuery {
  signal_type: SignalType;
  query: string;
  aggregation: Aggregation;
  field?: string;
  metric_name?: string;
  scope: TenantScope;
}

export interface SignalMeasurement {
  value: number;
  unit: string;
  estimated: boolean;
  warnings: QueryWarning[];
}

export interface SignalAdapter {
  aggregate(monitor: SignalQuery, since: Date, until: Date): Promise<number>;
  measure(monitor: SignalQuery, since: Date, until: Date): Promise<SignalMeasurement>;
}

export class NoDataError extends Error {
  constructor(message: string, readonly estimated = false, readonly warnings: QueryWarning[] = []) {
    super(message);
    this.name = 'NoDataError';
  }
}
