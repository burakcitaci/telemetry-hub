import { FacetDefinition } from '@/shared/lib/facet';

export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3001';

export const DEFAULT_LIMIT = 500;

export const SIDEBAR_STORAGE_KEY = 'metrics-explorer:sidebar';

export const MAIN_MIN_WIDTH = 720;

export const PALETTE = Array.from(
  { length: 5 },
  (_, index) => `hsl(var(--chart-${index + 1}))`,
);

export const colorFor = (i: number) => PALETTE[i % PALETTE.length];

export const FACET_DEFS: FacetDefinition[] = [
  {
    key: 'service.name',
    label: 'Service',
    accessor: (r: any) =>
      r.serviceName ?? r.resourceAttributes?.['service.name'] ?? null,
  },
  {
    key: 'host.name',
    label: 'Host',
    accessor: (r: any) => r.resourceAttributes?.['host.name'] ?? null,
  },
  {
    key: 'deployment.environment',
    label: 'Environment',
    accessor: (r: any) =>
      r.resourceAttributes?.['deployment.environment'] ?? null,
  },
  {
    key: 'service.version',
    label: 'Version',
    accessor: (r: any) => r.resourceAttributes?.['service.version'] ?? null,
  },
  {
    key: 'process.runtime.version',
    label: 'Runtime',
    accessor: (r) => r.resourceAttributes?.['process.runtime.version'] ?? null,
  },
];

export interface ApiMetric {
  tableName: string;
  metricType: string;
  serviceName: string | null;
  metricName: string;
}

export interface RawRecord {
  serviceName: string;
  metricName: string;
  metricType: string;
  metricUnit: string;
  resourceAttributes: Record<string, string>;
  attributes: Record<string, string>;
  timeUnix: string;
  count: number;
  sum: number;
}

export interface SeriesPoint {
  timestamp: string;
  time: string;
  value: number;
}

export interface Series {
  id: string;
  label: string;
  color: string;
  unit: string;
  data: SeriesPoint[];
}

export interface TableRow {
  timestamp: string;
  value: number;
  metric: string;
  group: string;
}

export const makeSeriesId = (m: ApiMetric) =>
  `${m.serviceName ?? '_'}::${m.metricName}`;

export const toIso = (s: string): string => {
  if (!s) return new Date().toISOString();
  if (s.includes('T')) return s.endsWith('Z') ? s : s + 'Z';
  const trimmed = s.replace(' ', 'T').replace(/(\.\d{3})\d*$/, '$1');
  return trimmed.endsWith('Z') ? trimmed : trimmed + 'Z';
};

export const formatTime = (ts: string): string => {
  const d = new Date(toIso(ts));
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const unwrap = <T>(raw: any): T => (raw?.data ?? raw) as T;

export const recordToValue = (r: RawRecord): number => {
  if (r.metricType === 'histogram' && r.count > 0)
    return Number(r.sum) / Number(r.count);
  return Number(r.sum) || 0;
};

export const formatBytes = (v: number): string => {
  if (!Number.isFinite(v)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = v,
    i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(2)} ${units[i]}`;
};

export const formatValue = (v: number, unit: string): string => {
  if (!Number.isFinite(v)) return '—';
  if (unit === 'bytes' || unit === 'By') return formatBytes(v);
  if (unit === 's') {
    if (Math.abs(v) < 0.001) return `${(v * 1e6).toFixed(1)}µs`;
    if (Math.abs(v) < 1) return `${(v * 1000).toFixed(2)}ms`;
    return `${v.toFixed(3)}s`;
  }
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  if (Math.abs(v) < 0.01 && v !== 0) return v.toExponential(2);
  return v.toFixed(3);
};
