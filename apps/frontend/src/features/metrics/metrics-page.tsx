import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ComposedChart, Area,
} from 'recharts';
import {
  ArrowLeft, Download, Filter, Info, RefreshCw, Search,
  Activity, Bell, AlertCircle, Eye, EyeOff, PanelLeft,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/shared/components/data-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3001';
const DEFAULT_LIMIT = 500;
const SIDEBAR_STORAGE_KEY = 'metrics-explorer:sidebar';
const MAIN_MIN_WIDTH = 720; // px — minimum content width before horizontal scroll kicks in

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiMetric {
  tableName: string;
  metricType: string;
  serviceName: string | null;
  metricName: string;
}

interface MetricDetailRecord {
  serviceName: string;
  metricName: string;
  metricType: string;
  metricDescription: string;
  metricUnit: string;
  attributes: Record<string, string>;
  resourceAttributes: Record<string, string>;
  tableName: string;
  timeUnix: string;
  count: number;
  sum: number;
  min: number;
  max: number;
}

interface SeriesPoint {
  timestamp: string;
  time: string;
  value: number;
}

interface HostSeries {
  host: string;
  color: string;
  data: SeriesPoint[];
}

interface MetricBundle {
  id: string;
  metric: ApiMetric;
  metricUnit: string;
  hosts: HostSeries[];
  timestamps: string[];
}

interface TableRow {
  timestamp: string;
  value: number;
  metric: string;
  host: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
];
const colorFor = (idx: number) => PALETTE[idx % PALETTE.length];

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

const formatFullTime = (ts: string): string => {
  const d = new Date(toIso(ts));
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const recordToValue = (r: MetricDetailRecord): number => {
  if (r.metricType === 'gauge' || r.metricType === 'sum') return Number(r.sum);
  if (r.metricType === 'histogram' && r.count > 0) return Number(r.sum) / Number(r.count);
  return Number(r.sum) || 0;
};

const formatValue = (v: number, unit: string): string => {
  if (!Number.isFinite(v)) return '—';
  if (unit === 'bytes' || unit === 'By') {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let n = v, i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(2)} ${units[i]}`;
  }
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(3);
};

const unwrap = <T,>(raw: any): T => (raw?.data ?? raw) as T;

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

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-lg">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium tabular-nums">
            {entry.value === null || entry.value === undefined
              ? '—'
              : Number(entry.value).toLocaleString(undefined, { maximumFractionDigits: 3 })}
          </span>
        </div>
      ))}
    </div>
  );
};

const HostSelector: React.FC<{
  hosts: HostSeries[];
  selected: Set<string>;
  onToggle: (host: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}> = ({ hosts, selected, onToggle, onSelectAll, onClear }) => {
  if (!hosts.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
        Hosts
      </span>
      {hosts.map((h) => {
        const on = selected.has(h.host);
        return (
          <button
            key={h.host}
            type="button"
            onClick={() => onToggle(h.host)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono transition-colors ${
              on
                ? 'border-transparent text-white'
                : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60'
            }`}
            style={on ? { backgroundColor: h.color } : undefined}
          >
            {on ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            <span className="truncate max-w-[180px]">{h.host}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onSelectAll}
        className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        all
      </button>
      <span className="text-muted-foreground/40 text-[10px]">·</span>
      <button
        type="button"
        onClick={onClear}
        className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        none
      </button>
    </div>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const Sidebar: React.FC<{
  open: boolean;
  metrics: ApiMetric[];
  catalogLoading: boolean;
  catalogError: string | null;
  selectedId: string | null;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onSelectMetric: (id: string) => void;
  onToggle: () => void;
}> = ({
  open,
  metrics,
  catalogLoading,
  catalogError,
  selectedId,
  searchQuery,
  onSearchChange,
  onSelectMetric,
  onToggle,
}) => {
  if (!open) {
    return (
      <aside className="flex w-11 shrink-0 flex-col items-center border-r bg-muted/30 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          title="Expand sidebar"
          className="h-8 w-8"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 sm:w-72 shrink-0 flex-col border-r bg-muted/30">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Metrics
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          title="Collapse sidebar"
          className="h-7 w-7"
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search metrics..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="mb-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Metrics ({metrics.length})
          </p>
        </div>

        {catalogError && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">{catalogError}</AlertDescription>
          </Alert>
        )}

        {catalogLoading && !metrics.length ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {metrics.map((m) => {
              const id = makeSeriesId(m);
              const isSelected = selectedId === id;
              const disabled = !m.serviceName;
              return (
                <button
                  key={id}
                  onClick={() => !disabled && onSelectMetric(id)}
                  disabled={disabled}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left transition-colors ${
                    disabled
                      ? 'cursor-not-allowed opacity-40'
                      : isSelected
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      isSelected ? 'bg-indigo-500' : 'bg-slate-400/60'
                    }`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block font-mono text-xs truncate">{m.metricName}</span>
                    <span className="block text-[10px] opacity-70 truncate">
                      {m.serviceName ?? '—'} · {m.metricType}
                    </span>
                  </span>
                </button>
              );
            })}
            {!metrics.length && !catalogLoading && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No metrics found
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const MetricsDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const metricParam = searchParams.get('metric');

  const [metrics, setMetrics] = useState<ApiMetric[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(metricParam);
  const [bundle, setBundle] = useState<MetricBundle | null>(null);
  const [visibleHosts, setVisibleHosts] = useState<Set<string>>(new Set());

  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'composed'>('line');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        sidebarOpen ? 'expanded' : 'collapsed',
      );
    } catch { /* ignore */ }
  }, [sidebarOpen]);

  const metricsRef = useRef<ApiMetric[]>([]);
  metricsRef.current = metrics;

  useEffect(() => {
    const current = searchParams.get('metric');
    if (selectedId === current) return;
    const next = new URLSearchParams(searchParams);
    if (selectedId) next.set('metric', selectedId);
    else next.delete('metric');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── Load catalog ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const res = await fetch(`${API_BASE}/api/metrics?limit=200&offset=0`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw: any = await res.json();
        if (cancelled) return;
        const payload = unwrap<{ metrics: ApiMetric[] }>(raw);
        const list: ApiMetric[] = payload?.metrics ?? [];
        setMetrics(list);

        setSelectedId((prev) => {
          if (prev) return prev;
          if (metricParam) {
            const match = list.find(
              (m) => makeSeriesId(m) === metricParam || m.metricName === metricParam,
            );
            if (match?.serviceName) return makeSeriesId(match);
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load bundle ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) {
      setBundle(null);
      setVisibleHosts(new Set());
      setSeriesLoading(false);
      setSeriesError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setSeriesLoading(true);
      setSeriesError(null);
      setBundle(null);

      const metric = metricsRef.current.find((m) => makeSeriesId(m) === selectedId);
      if (!metric || !metric.serviceName) {
        if (!cancelled) {
          setSeriesError('Metric not found in catalog');
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

        const raw: any = await res.json();
        const payload = unwrap<{ records: MetricDetailRecord[] }>(raw);
        const records: MetricDetailRecord[] = payload?.records ?? [];
        if (cancelled) return;

        if (!records.length) {
          setBundle({ id: selectedId, metric, metricUnit: '', hosts: [], timestamps: [] });
          setVisibleHosts(new Set());
          setSeriesLoading(false);
          return;
        }

        const unit = records[0]?.metricUnit ?? '';
        const byHost = new Map<string, MetricDetailRecord[]>();
        for (const r of records) {
          const host = r.resourceAttributes?.['host.name'] ?? 'unknown';
          if (!byHost.has(host)) byHost.set(host, []);
          byHost.get(host)!.push(r);
        }

        const hostEntries = [...byHost.entries()].sort(([a], [b]) => a.localeCompare(b));
        const hosts: HostSeries[] = hostEntries.map(([host, rows], idx) => {
          const ordered = [...rows].sort(
            (a, b) =>
              new Date(toIso(a.timeUnix)).getTime() - new Date(toIso(b.timeUnix)).getTime(),
          );
          return {
            host,
            color: colorFor(idx),
            data: ordered.map((r) => {
              const iso = toIso(r.timeUnix);
              return { timestamp: iso, time: formatTime(iso), value: recordToValue(r) };
            }),
          };
        });

        const stampSet = new Set<string>();
        hosts.forEach((h) => h.data.forEach((p) => stampSet.add(p.timestamp)));
        const timestamps = [...stampSet].sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime(),
        );

        if (cancelled) return;
        setBundle({ id: selectedId, metric, metricUnit: unit, hosts, timestamps });
        setVisibleHosts(new Set(hosts.map((h) => h.host)));
        setSeriesLoading(false);
      } catch (err) {
        if (!cancelled) {
          setSeriesError(err instanceof Error ? err.message : 'Failed to load series');
          setSeriesLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedId, refreshTick]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !selectedId) return;
    const t = setInterval(() => setRefreshTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, [autoRefresh, selectedId]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeSeries: HostSeries[] = useMemo(() => {
    if (!bundle) return [];
    return bundle.hosts.filter((h) => visibleHosts.has(h.host));
  }, [bundle, visibleHosts]);

  const mergedChartData = useMemo(() => {
    if (!bundle || !bundle.timestamps.length) return [];
    const indexed = bundle.hosts.map((h) => {
      const m = new Map<string, number>();
      h.data.forEach((p) => m.set(p.timestamp, p.value));
      return { host: h.host, map: m };
    });
    return bundle.timestamps.map((ts) => {
      const row: Record<string, any> = { timestamp: ts, time: formatTime(ts) };
      indexed.forEach(({ host, map }) => {
        row[host] = map.has(ts) ? map.get(ts)! : null;
      });
      return row;
    });
  }, [bundle]);

  const summaryStats = useMemo(() => {
    const all = activeSeries.flatMap((s) => s.data.map((d) => d.value));
    if (!all.length) return null;
    const latest = all[all.length - 1];
    const previous = all[all.length - 2] ?? latest;
    return {
      latest,
      change: previous ? ((latest - previous) / previous) * 100 : 0,
      avg: all.reduce((a, b) => a + b, 0) / all.length,
      max: Math.max(...all),
      min: Math.min(...all),
    };
  }, [activeSeries]);

  const activeUnit = bundle?.metricUnit ?? '';

  const tableRows: TableRow[] = useMemo(() => {
    if (!bundle) return [];
    const rows: TableRow[] = [];
    activeSeries.forEach((s) => {
      s.data.slice(-100).forEach((p) => {
        rows.push({
          timestamp: p.timestamp,
          value: p.value,
          metric: bundle.metric.metricName,
          host: s.host,
        });
      });
    });
    return rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 200);
  }, [activeSeries, bundle]);

  const filteredCatalog = useMemo(
    () => metrics.filter(
      (m) =>
        m.metricName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.serviceName ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    [metrics, searchQuery],
  );

  const handleSelectMetric = (id: string) => {
    setSelectedId(id);
    setVisibleHosts(new Set());
    setBundle(null);
  };

  const toggleHost = (host: string) => {
    setVisibleHosts((prev) => {
      const next = new Set(prev);
      if (next.has(host)) next.delete(host);
      else next.add(host);
      return next;
    });
  };

  const selectAllHosts = () => {
    if (!bundle) return;
    setVisibleHosts(new Set(bundle.hosts.map((h) => h.host)));
  };

  const clearHosts = () => setVisibleHosts(new Set());

  const totalPoints = activeSeries.reduce((a, s) => a + s.data.length, 0);

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<TableRow>[]>(() => [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Time" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatFullTime(row.original.timestamp)}
        </span>
      ),
    },
    {
      accessorKey: 'value',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
      cell: ({ row }) => (
        <span className="font-mono font-medium tabular-nums">
          {row.original.value.toLocaleString(undefined, { maximumFractionDigits: 3 })}
        </span>
      ),
    },
    {
      accessorKey: 'host',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Host" />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.host}</span>,
    },
  ], []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <header className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Activity className="h-4 w-4 text-indigo-500 shrink-0 hidden sm:block" />
          <h1 className="text-sm font-semibold hidden md:block shrink-0">Metrics Explorer</h1>
          <span className="text-muted-foreground hidden md:inline shrink-0">/</span>
          <span className="font-mono text-sm text-muted-foreground truncate min-w-0">
            {bundle?.metric.metricName ?? '—'}
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${seriesLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{autoRefresh ? 'Auto' : 'Manual'}</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 hidden sm:inline-flex">
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Alerts</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 hidden sm:inline-flex">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Export</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Body: fixed-height flex row.
          - Sidebar stays put (vertical scroll inside).
          - Main column: vertical scroll + horizontal scroll when narrower than MAIN_MIN_WIDTH. */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          metrics={filteredCatalog}
          catalogLoading={catalogLoading}
          catalogError={catalogError}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectMetric={handleSelectMetric}
          onToggle={() => setSidebarOpen((v) => !v)}
        />

        {/* Horizontally scrollable region for the main content */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
          {/* Fixed-min-width content. When viewport < MAIN_MIN_WIDTH + sidebar,
              the outer div scrolls horizontally instead of squeezing this. */}
          <main
            className="h-full overflow-y-auto p-4 lg:p-6"
            style={{ minWidth: MAIN_MIN_WIDTH }}
          >
            <div className="mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 rounded-md border p-0.5">
                {(['line', 'bar', 'area', 'composed'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                      chartType === type
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setRefreshTick((x) => x + 1)}
                disabled={seriesLoading || !selectedId}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${seriesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                {activeSeries.length} host{activeSeries.length === 1 ? '' : 's'} · {totalPoints} pts
              </span>
            </div>

            {bundle && bundle.hosts.length > 0 && (
              <div className="mb-4">
                <HostSelector
                  hosts={bundle.hosts}
                  selected={visibleHosts}
                  onToggle={toggleHost}
                  onSelectAll={selectAllHosts}
                  onClear={clearHosts}
                />
              </div>
            )}

            {seriesError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{seriesError}</AlertDescription>
              </Alert>
            )}

            {summaryStats && (
              <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricStatCard
                  label="Current"
                  value={formatValue(summaryStats.latest, activeUnit)}
                  change={summaryStats.change}
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

            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Time Series
                  {activeUnit && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({activeUnit})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[360px] w-full">
                  {seriesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : !bundle ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Select a metric from the sidebar
                    </div>
                  ) : activeSeries.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {bundle.hosts.length === 0
                        ? 'No data returned for this metric'
                        : 'No hosts selected — click a host above to show its series'}
                    </div>
                  ) : mergedChartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No data points returned
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'composed' ? (
                        <ComposedChart data={mergedChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                          <Tooltip content={<CustomTooltip />} />
                          {activeSeries.map((s, i) => {
                            const color = bundle.hosts.find((h) => h.host === s.host)?.color ?? '#888';
                            return i % 2 === 0 ? (
                              <Bar key={s.host} dataKey={s.host} name={s.host} fill={color} fillOpacity={0.6} />
                            ) : (
                              <Line key={s.host} type="monotone" dataKey={s.host} name={s.host} stroke={color} strokeWidth={2} dot={false} connectNulls />
                            );
                          })}
                        </ComposedChart>
                      ) : chartType === 'bar' ? (
                        <BarChart data={mergedChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                          <Tooltip content={<CustomTooltip />} />
                          {activeSeries.map((s) => (
                            <Bar
                              key={s.host}
                              dataKey={s.host}
                              name={s.host}
                              fill={bundle.hosts.find((h) => h.host === s.host)?.color ?? '#888'}
                              fillOpacity={0.75}
                            />
                          ))}
                        </BarChart>
                      ) : chartType === 'area' ? (
                        <ComposedChart data={mergedChartData}>
                          <defs>
                            {activeSeries.map((s) => {
                              const color = bundle.hosts.find((h) => h.host === s.host)?.color ?? '#888';
                              return (
                                <linearGradient key={s.host} id={`grad-${s.host.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                              );
                            })}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                          <Tooltip content={<CustomTooltip />} />
                          {activeSeries.map((s) => {
                            const color = bundle.hosts.find((h) => h.host === s.host)?.color ?? '#888';
                            return (
                              <Area
                                key={s.host}
                                type="monotone"
                                dataKey={s.host}
                                name={s.host}
                                stroke={color}
                                strokeWidth={2}
                                fill={`url(#grad-${s.host.replace(/[^a-z0-9]/gi, '')})`}
                                connectNulls
                              />
                            );
                          })}
                        </ComposedChart>
                      ) : (
                        <LineChart data={mergedChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                          <Tooltip content={<CustomTooltip />} />
                          {activeSeries.map((s) => (
                            <Line
                              key={s.host}
                              type="monotone"
                              dataKey={s.host}
                              name={s.host}
                              stroke={bundle.hosts.find((h) => h.host === s.host)?.color ?? '#888'}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {bundle && (
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription className="font-mono text-xs break-all">
                  {`${bundle.metric.metricType}:${bundle.metric.metricName}{service:${bundle.metric.serviceName ?? '*'}}`}
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">
                  Raw Data
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {tableRows.length} rows
                  </span>
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
                {tableRows.length ? (
                  <DataTable columns={columns} data={tableRows} />
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No data points yet
                  </p>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};

export default MetricsDetailPage;