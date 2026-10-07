import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ComposedChart, Area,
} from 'recharts';
import {
  Activity, AlertCircle, ArrowLeft, Download, Filter, Info,
  PanelLeft, RefreshCw, Search,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/shared/components/data-table';
import { FacetQueryBar } from '@/shared/components/facet-query-bar';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { parseTimeRange, resolveTimeRange } from '@/shared/lib/time-range';
import { buildFacet, FacetDefinition, FacetSelection, groupByFacets, matchesFacets } from '@/shared/lib/facet';
import { TimeRangePicker } from '@/app/components/timer-range.picker';

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3001';
const DEFAULT_LIMIT = 500;
const SIDEBAR_STORAGE_KEY = 'metrics-explorer:sidebar';
const MAIN_MIN_WIDTH = 720;

// ─── Palette ─────────────────────────────────────────────────────────────────

const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
  '#a855f7', '#eab308', '#0ea5e9', '#22c55e', '#f43f5e',
  '#7c3aed', '#fb923c', '#0891b2', '#dc2626', '#4f46e5',
];
const colorFor = (i: number) => PALETTE[i % PALETTE.length];

// ─── Facet definitions ───────────────────────────────────────────────────────

const FACET_DEFS: FacetDefinition[] = [
  {
    key: 'service.name',
    label: 'Service',
    accessor: (r: any) => r.serviceName ?? r.resourceAttributes?.['service.name'] ?? null,
  },
  {
    key: 'host.name',
    label: 'Host',
    accessor: (r: any) => r.resourceAttributes?.['host.name'] ?? null,
  },
  {
    key: 'deployment.environment',
    label: 'Environment',
    accessor: (r: any) => r.resourceAttributes?.['deployment.environment'] ?? null,
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiMetric {
  tableName: string;
  metricType: string;
  serviceName: string | null;
  metricName: string;
}

interface RawRecord {
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

interface SeriesPoint {
  timestamp: string;
  time: string;
  value: number;
}

interface Series {
  id: string;
  label: string;
  color: string;
  unit: string;
  data: SeriesPoint[];
}

interface TableRow {
  timestamp: string;
  value: number;
  metric: string;
  group: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeSeriesId = (m: ApiMetric) => `${m.serviceName ?? '_'}::${m.metricName}`;

const toIso = (s: string): string => {
  if (!s) return new Date().toISOString();
  if (s.includes('T')) return s.endsWith('Z') ? s : s + 'Z';
  const trimmed = s.replace(' ', 'T').replace(/(\.\d{3})\d*$/, '$1');
  return trimmed.endsWith('Z') ? trimmed : trimmed + 'Z';
};

const formatTime = (ts: string): string => {
  const d = new Date(toIso(ts));
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const unwrap = <T,>(raw: any): T => (raw?.data ?? raw) as T;

const recordToValue = (r: RawRecord): number => {
  if (r.metricType === 'histogram' && r.count > 0) return Number(r.sum) / Number(r.count);
  return Number(r.sum) || 0;
};

const formatBytes = (v: number): string => {
  if (!Number.isFinite(v)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = v, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(2)} ${units[i]}`;
};

const formatValue = (v: number, unit: string): string => {
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

// ─── Sub-components ──────────────────────────────────────────────────────────

const MetricStatCard: React.FC<{
  label: string; value: string; change?: number; color?: string;
}> = ({ label, value, change, color = 'text-foreground' }) => (
  <div className="rounded-lg border bg-card p-4">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
    <div className="mt-1 flex items-baseline gap-2">
      <p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      {change !== undefined && Number.isFinite(change) && (
        <span className={`text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </span>
      )}
    </div>
  </div>
);

const CustomTooltip: React.FC<any> = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => Number(b.value ?? -Infinity) - Number(a.value ?? -Infinity));
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-lg max-h-80 overflow-y-auto">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {sorted.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground truncate max-w-[200px]">{entry.name}:</span>
          <span className="ml-auto font-medium tabular-nums">
            {entry.value === null || entry.value === undefined
              ? '—'
              : formatValue(Number(entry.value), unit)}
          </span>
        </div>
      ))}
    </div>
  );
};

const SeriesLegend: React.FC<{
  series: Series[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
  onIsolate: (id: string) => void;
  onShowAll: () => void;
}> = ({ series, hidden, onToggle, onIsolate, onShowAll }) => {
  if (!series.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
      {series.map((s) => {
        const off = hidden.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) onIsolate(s.id);
              else onToggle(s.id);
            }}
            onDoubleClick={() => onIsolate(s.id)}
            title={`${s.label} — ${s.data.length} point${s.data.length === 1 ? '' : 's'}`}
            className={`inline-flex items-center gap-1.5 text-xs transition-opacity ${
              off ? 'opacity-40' : 'opacity-100'
            } hover:opacity-100`}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: off ? '#94a3b8' : s.color }}
            />
            <span className="font-mono truncate max-w-[180px]">{s.label}</span>
            <span className="text-[10px] text-muted-foreground">({s.data.length})</span>
          </button>
        );
      })}
      {hidden.size > 0 && (
        <button
          type="button"
          onClick={onShowAll}
          className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          Show all ({hidden.size} hidden)
        </button>
      )}
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const MetricsDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Catalog
  const [metrics, setMetrics] = useState<ApiMetric[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [metricSearch, setMetricSearch] = useState('');

  // Selected metric — decoded from URL on first render
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const raw = searchParams.get('metric');
    return raw ? decodeURIComponent(raw) : null;
  });

  // Raw data
  const [records, setRecords] = useState<RawRecord[]>([]);
  const [metricUnit, setMetricUnit] = useState<string>('');
  const [metricType, setMetricType] = useState<string>('');
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Filter/group
  const [facetSelection, setFacetSelection] = useState<FacetSelection>({});
  const [groupBy, setGroupBy] = useState<string[]>(['host.name']);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hideTransient, setHideTransient] = useState(false);
  const TRANSIENT_THRESHOLD = 3;

  // Time range
  const [timeRange, setTimeRange] = useState('24h');

  // UI
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'composed'>('line');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarOpen ? 'expanded' : 'collapsed');
    } catch { /* ignore */ }
  }, [sidebarOpen]);

  // URL sync
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedId) next.set('metric', selectedId);
    else next.delete('metric');
    next.set('time', timeRange);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, timeRange]);

  // Reset hidden series when the metric changes
  useEffect(() => { setHiddenSeries(new Set()); }, [selectedId]);

  // ── Catalog load ──────────────────────────────────────────────────────────
  const metricsRef = useRef<ApiMetric[]>([]);
  metricsRef.current = metrics;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const res = await fetch(`${API_BASE}/api/metrics?limit=200&offset=0`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        if (cancelled) return;
        const list: ApiMetric[] = unwrap<{ metrics: ApiMetric[] }>(raw)?.metrics ?? [];
        setMetrics(list);
        // If nothing selected yet (first visit, no ?metric=), pick the first
        setSelectedId((prev) => {
          if (prev) return prev;
          const first = list.find((m) => m.serviceName);
          return first ? makeSeriesId(first) : null;
        });
      } catch (err) {
        if (!cancelled) {
          setCatalogError(err instanceof Error ? err.message : 'Failed to load metrics');
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Records load ──────────────────────────────────────────────────────────
  // The `metricsRef.current.length === 0` guard prevents a bad fetch on the
  // very first render (catalog not loaded yet). The `metrics.length` in the
  // dep array re-runs this effect once the catalog arrives, so a reload with
  // ?metric=... in the URL actually fetches the detail endpoint.
  useEffect(() => {
    if (!selectedId) {
      setRecords([]);
      return;
    }

    // Wait for the catalog so we can resolve serviceName + metricName
    if (metricsRef.current.length === 0) {
      return;
    }

    let cancelled = false;

    (async () => {
      setSeriesLoading(true);
      setSeriesError(null);
      setRecords([]);

      const metric = metricsRef.current.find((m) => makeSeriesId(m) === selectedId);
      if (!metric?.serviceName) {
        if (!cancelled) {
          setSeriesError(`Metric "${selectedId}" not found in catalog`);
          setSeriesLoading(false);
        }
        return;
      }

      try {
        const params = new URLSearchParams({
          service: metric.serviceName,
          metric: metric.metricName,
          limit: String(DEFAULT_LIMIT),
        });
        const res = await fetch(`${API_BASE}/api/metrics/detail?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const payload = unwrap<{ records: RawRecord[] }>(raw);
        const list = payload?.records ?? [];
        if (cancelled) return;
        setRecords(list);
        setMetricUnit(list[0]?.metricUnit ?? '');
        setMetricType(list[0]?.metricType ?? metric.metricType);
        setSeriesLoading(false);
      } catch (err) {
        if (!cancelled) {
          setSeriesError(err instanceof Error ? err.message : 'Failed to load');
          setSeriesLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedId, refreshTick, metrics.length]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !selectedId) return;
    const t = setInterval(() => setRefreshTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, [autoRefresh, selectedId]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const facets = useMemo(
    () => FACET_DEFS.map((def) => buildFacet(def, records as any)),
    [records],
  );

  const resolvedRange = useMemo(() => {
    const spec = parseTimeRange(timeRange);
    return spec ? resolveTimeRange(spec) : null;
  }, [timeRange]);

  const filteredRecords = useMemo(() => {
    const inRange = (r: RawRecord) => {
      if (!resolvedRange) return true;
      const t = new Date(toIso(r.timeUnix)).getTime();
      return t >= resolvedRange.from.getTime() && t <= resolvedRange.to.getTime();
    };
    return records.filter((r) => inRange(r) && matchesFacets(r, facets, facetSelection));
  }, [records, facets, facetSelection, resolvedRange]);

  const allSeries: Series[] = useMemo(() => {
    const groups = groupByFacets(filteredRecords as any, facets, groupBy);
    const out: Series[] = [];
    let idx = 0;
    for (const [id, { label, records: rows }] of groups) {
      const ordered = [...rows].sort(
        (a: any, b: any) =>
          new Date(toIso(a.timeUnix)).getTime() - new Date(toIso(b.timeUnix)).getTime(),
      );
      out.push({
        id,
        label,
        color: colorFor(idx++),
        unit: metricUnit,
        data: ordered.map((r: any) => {
          const iso = toIso(r.timeUnix);
          return { timestamp: iso, time: formatTime(iso), value: recordToValue(r) };
        }),
      });
    }
    return out;
  }, [filteredRecords, facets, groupBy, metricUnit]);

  const series = useMemo(() => {
    if (!hideTransient) return allSeries;
    return allSeries.filter((s) => s.data.length >= TRANSIENT_THRESHOLD);
  }, [allSeries, hideTransient]);

  const visibleSeries = useMemo(
    () => series.filter((s) => !hiddenSeries.has(s.id)),
    [series, hiddenSeries],
  );

  const chartData = useMemo(() => {
    if (!visibleSeries.length) return [];
    const stamps = new Set<string>();
    visibleSeries.forEach((s) => s.data.forEach((p) => stamps.add(p.timestamp)));
    const sorted = [...stamps].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const indexed = visibleSeries.map((s) => ({
      id: s.id,
      m: new Map(s.data.map((p) => [p.timestamp, p.value])),
    }));
    return sorted.map((ts) => {
      const row: Record<string, any> = { timestamp: ts, time: formatTime(ts) };
      indexed.forEach(({ id, m }) => { row[id] = m.has(ts) ? m.get(ts)! : null; });
      return row;
    });
  }, [visibleSeries]);

  const yDomain = useMemo((): [number | 'auto', number | 'auto'] => {
    const all = visibleSeries.flatMap((s) => s.data.map((d) => d.value));
    if (!all.length) return ['auto', 'auto'];
    const min = Math.min(...all);
    const max = Math.max(...all);
    if (min === max) {
      const pad = Math.abs(min) * 0.1 || 1;
      return [min - pad, max + pad];
    }
    const pad = (max - min) * 0.15;
    return [Math.max(0, min - pad), max + pad];
  }, [visibleSeries]);

  const summaryStats = useMemo(() => {
    const all = visibleSeries.flatMap((s) => s.data.map((d) => d.value));
    if (!all.length) return null;
    return {
      latest: all[all.length - 1],
      avg: all.reduce((a, b) => a + b, 0) / all.length,
      max: Math.max(...all),
      min: Math.min(...all),
    };
  }, [visibleSeries]);

  const activeUnit = metricUnit;

  const tableRows: TableRow[] = useMemo(() => {
    const rows: TableRow[] = [];
    visibleSeries.forEach((s) => {
      s.data.slice(-100).forEach((p) => {
        rows.push({
          timestamp: p.timestamp,
          value: p.value,
          metric: s.label,
          group: s.label,
        });
      });
    });
    return rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 200);
  }, [visibleSeries]);

  const filteredCatalog = useMemo(
    () => metrics.filter((m) =>
      m.metricName.toLowerCase().includes(metricSearch.toLowerCase())
      || (m.serviceName ?? '').toLowerCase().includes(metricSearch.toLowerCase()),
    ),
    [metrics, metricSearch],
  );

  const selectedMetric = useMemo(
    () => metrics.find((m) => makeSeriesId(m) === selectedId),
    [metrics, selectedId],
  );

  // Show a specific error if the URL points to a metric that's not in the catalog
  const selectedNotInCatalog =
    !seriesLoading && !!selectedId && metrics.length > 0 && !selectedMetric;

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<TableRow>[]>(() => [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Time" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {new Date(toIso(row.original.timestamp)).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'value',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{formatValue(row.original.value, metricUnit)}</span>
      ),
    },
    {
      accessorKey: 'group',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.group}</span>,
    },
  ], [metricUnit]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <header className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="shrink-0"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Activity className="h-4 w-4 text-indigo-500 shrink-0 hidden sm:block" />
          <h1 className="text-sm font-semibold hidden md:block shrink-0">Metrics Explorer</h1>
          <span className="text-muted-foreground hidden md:inline shrink-0">/</span>
          <span className="font-mono text-sm text-muted-foreground truncate min-w-0">
            {selectedMetric?.metricName ?? '—'}
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${seriesLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{autoRefresh ? 'Auto' : 'Manual'}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setRefreshTick((x) => x + 1)} disabled={seriesLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${seriesLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Metric catalog sidebar */}
        <aside
          className={`hidden md:flex h-full min-h-0 shrink-0 flex-col border-r bg-muted/30 transition-all duration-200 ${
            sidebarOpen ? 'w-64 sm:w-72' : 'w-11'
          }`}
        >
          {sidebarOpen ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Metrics
                </span>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-7 w-7">
                  <PanelLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search metrics…"
                    value={metricSearch}
                    onChange={(e) => setMetricSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {filteredCatalog.length} metric{filteredCatalog.length === 1 ? '' : 's'}
                </p>
                {catalogError && (
                  <Alert variant="destructive" className="mb-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <AlertDescription className="text-xs">{catalogError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-0.5">
                  {filteredCatalog.map((m) => {
                    const id = makeSeriesId(m);
                    const isSelected = selectedId === id;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setSelectedId(id);
                          setFacetSelection({});
                          setHiddenSeries(new Set());
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:bg-accent/50'
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-slate-400/60'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-xs">{m.metricName}</span>
                          <span className="block truncate text-[10px] opacity-70">
                            {m.serviceName ?? '—'} · {m.metricType}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-3">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="h-8 w-8">
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
          <section className="h-full overflow-y-auto p-4 lg:p-6" style={{ minWidth: MAIN_MIN_WIDTH }}>
            {/* Filters + group by */}
            <Card className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Filters</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {filteredRecords.length} of {records.length} records · grouped by{' '}
                  <code className="font-mono">{groupBy.join(' + ') || 'nothing'}</code>
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <FacetQueryBar
                  facets={facets}
                  selection={facetSelection}
                  onChange={setFacetSelection}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Group by
                  </span>
                  {facets.map((facet) => {
                    const on = groupBy.includes(facet.key);
                    return (
                      <button
                        key={facet.key}
                        type="button"
                        onClick={() =>
                          setGroupBy((prev) =>
                            prev.includes(facet.key)
                              ? prev.filter((k) => k !== facet.key)
                              : [...prev, facet.key],
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          on
                            ? 'border-transparent bg-accent text-accent-foreground'
                            : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60'
                        }`}
                      >
                        {facet.label}
                        {on && <span className="text-muted-foreground">×</span>}
                      </button>
                    );
                  })}
                  {groupBy.length === 0 && (
                    <span className="text-[11px] text-muted-foreground">(one merged series)</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedNotInCatalog && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Metric <code>{selectedId}</code> isn't in the catalog. It may have been
                  renamed or removed. Pick another metric from the sidebar.
                </AlertDescription>
              </Alert>
            )}

            {seriesError && !selectedNotInCatalog && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{seriesError}</AlertDescription>
              </Alert>
            )}

            {/* Stats */}
            {summaryStats && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricStatCard
                  label="Current"
                  value={formatValue(summaryStats.latest, activeUnit)}
                  color="text-indigo-600 dark:text-indigo-400"
                />
                <MetricStatCard label="Average" value={formatValue(summaryStats.avg, activeUnit)} />
                <MetricStatCard
                  label="Max"
                  value={formatValue(summaryStats.max, activeUnit)}
                  color="text-amber-600 dark:text-amber-400"
                />
                <MetricStatCard
                  label="Min"
                  value={formatValue(summaryStats.min, activeUnit)}
                  color="text-emerald-600 dark:text-emerald-400"
                />
              </div>
            )}

            {/* Chart */}
            <Card className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Time Series
                  {activeUnit && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({activeUnit})</span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideTransient}
                      onChange={(e) => setHideTransient(e.target.checked)}
                      className="h-3 w-3"
                    />
                    Hide short-lived
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {visibleSeries.length} of {series.length}
                  </span>
                  <div className="flex items-center gap-1 rounded-md border p-0.5">
                    {(['line', 'bar', 'area', 'composed'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setChartType(t)}
                        className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                          chartType === t
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[220px] w-full">
                  {seriesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : visibleSeries.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {series.length === 0
                        ? 'No data for the current filters'
                        : 'All series hidden — click a legend item below'}
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No data points returned
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'composed' ? (
                        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" height={20} />
                          <YAxis domain={yDomain} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => formatValue(v, activeUnit)} />
                          <Tooltip content={<CustomTooltip unit={activeUnit} />} />
                          {visibleSeries.map((s, i) =>
                            i % 2 === 0 ? (
                              <Bar key={s.id} dataKey={s.id} name={s.label} fill={s.color} fillOpacity={0.5} />
                            ) : (
                              <Line key={s.id} type="monotone" dataKey={s.id} name={s.label} stroke={s.color} strokeWidth={1.5} dot={{ r: 2, strokeWidth: 0, fill: s.color }} activeDot={{ r: 3 }} connectNulls />
                            ),
                          )}
                        </ComposedChart>
                      ) : chartType === 'bar' ? (
                        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" height={20} />
                          <YAxis domain={yDomain} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => formatValue(v, activeUnit)} />
                          <Tooltip content={<CustomTooltip unit={activeUnit} />} />
                          {visibleSeries.map((s) => (
                            <Bar key={s.id} dataKey={s.id} name={s.label} fill={s.color} fillOpacity={0.75} />
                          ))}
                        </BarChart>
                      ) : chartType === 'area' ? (
                        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            {visibleSeries.map((s) => (
                              <linearGradient key={s.id} id={`g-${s.id.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" height={20} />
                          <YAxis domain={yDomain} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => formatValue(v, activeUnit)} />
                          <Tooltip content={<CustomTooltip unit={activeUnit} />} />
                          {visibleSeries.map((s) => (
                            <Area key={s.id} type="monotone" dataKey={s.id} name={s.label} stroke={s.color} strokeWidth={1.5} fill={`url(#g-${s.id.replace(/[^a-z0-9]/gi, '')})`} connectNulls />
                          ))}
                        </ComposedChart>
                      ) : (
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" height={20} />
                          <YAxis domain={yDomain} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => formatValue(v, activeUnit)} />
                          <Tooltip content={<CustomTooltip unit={activeUnit} />} />
                          {visibleSeries.map((s) => (
                            <Line key={s.id} type="monotone" dataKey={s.id} name={s.label} stroke={s.color} strokeWidth={1.5} dot={{ r: 2, strokeWidth: 0, fill: s.color }} activeDot={{ r: 3 }} connectNulls />
                          ))}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>

                <SeriesLegend
                  series={series}
                  hidden={hiddenSeries}
                  onToggle={(id) => {
                    setHiddenSeries((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }}
                  onIsolate={(id) => {
                    setHiddenSeries((prev) => {
                      const isIsolated = prev.size === series.length - 1 && !prev.has(id);
                      if (isIsolated) return new Set();
                      return new Set(series.filter((s) => s.id !== id).map((s) => s.id));
                    });
                  }}
                  onShowAll={() => setHiddenSeries(new Set())}
                />
              </CardContent>
            </Card>

            {selectedMetric && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="font-mono text-xs break-all">
                  {`${metricType}:${selectedMetric.metricName}{service:${selectedMetric.serviceName ?? '*'}}`}
                  {Object.entries(facetSelection).length > 0 && (
                    <>
                      {' · '}
                      {Object.entries(facetSelection).map(([k, v]) => `${k} in (${v.join(', ')})`).join(' · ')}
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">
                  Raw Data
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{tableRows.length} rows</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Filter className="h-3.5 w-3.5" /> Filter
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tableRows.length
                  ? <DataTable columns={columns} data={tableRows} />
                  : <p className="py-6 text-center text-sm text-muted-foreground">No data points yet</p>}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MetricsDetailPage;