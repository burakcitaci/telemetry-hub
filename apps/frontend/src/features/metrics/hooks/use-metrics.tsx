import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/shared/components/data-table';
import { parseTimeRange, resolveTimeRange } from '@/shared/lib/time-range';
import {
  buildFacet,
  FacetSelection,
  groupByFacets,
  matchesFacets,
} from '@/shared/lib/facet';
import {
  API_BASE,
  DEFAULT_LIMIT,
  SIDEBAR_STORAGE_KEY,
  colorFor,
  FACET_DEFS,
  ApiMetric,
  RawRecord,
  Series,
  TableRow,
  makeSeriesId,
  toIso,
  formatTime,
  unwrap,
  recordToValue,
  formatValue,
} from '@/features/metrics/model';

export function useMetrics() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const [metrics, setMetrics] = useState<ApiMetric[]>([]);

  const [catalogLoading, setCatalogLoading] = useState(false);

  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [metricSearch, setMetricSearch] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const raw = searchParams.get('metric');
    return raw ? decodeURIComponent(raw) : null;
  });

  const [records, setRecords] = useState<RawRecord[]>([]);

  const [metricUnit, setMetricUnit] = useState<string>('');

  const [metricType, setMetricType] = useState<string>('');

  const [seriesLoading, setSeriesLoading] = useState(false);

  const [seriesError, setSeriesError] = useState<string | null>(null);

  const [refreshTick, setRefreshTick] = useState(0);

  const [facetSelection, setFacetSelection] = useState<FacetSelection>({});

  const [groupBy, setGroupBy] = useState<string[]>(['host.name']);

  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const [hideTransient, setHideTransient] = useState(false);

  const TRANSIENT_THRESHOLD = 3;

  const [timeRange, setTimeRange] = useState('24h');

  const [chartType, setChartType] = useState<
    'line' | 'bar' | 'area' | 'composed'
  >('line');

  const [autoRefresh, setAutoRefresh] = useState(false);

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
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedId) next.set('metric', selectedId);
    else next.delete('metric');
    next.set('time', timeRange);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, timeRange]);

  useEffect(() => {
    setHiddenSeries(new Set());
  }, [selectedId]);

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
        const list: ApiMetric[] =
          unwrap<{ metrics: ApiMetric[] }>(raw)?.metrics ?? [];
        setMetrics(list);
        // If nothing selected yet (first visit, no ?metric=), pick the first
        setSelectedId((prev) => {
          if (prev) return prev;
          const first = list.find((m) => m.serviceName);
          return first ? makeSeriesId(first) : null;
        });
      } catch (err) {
        if (!cancelled) {
          setCatalogError(
            err instanceof Error ? err.message : 'Failed to load metrics',
          );
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

      const metric = metricsRef.current.find(
        (m) => makeSeriesId(m) === selectedId,
      );
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

    return () => {
      cancelled = true;
    };
  }, [selectedId, refreshTick, metrics.length]);

  useEffect(() => {
    if (!autoRefresh || !selectedId) return;
    const t = setInterval(() => setRefreshTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, [autoRefresh, selectedId]);

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
      return (
        t >= resolvedRange.from.getTime() && t <= resolvedRange.to.getTime()
      );
    };
    return records.filter(
      (r) => inRange(r) && matchesFacets(r, facets, facetSelection),
    );
  }, [records, facets, facetSelection, resolvedRange]);

  const allSeries: Series[] = useMemo(() => {
    const groups = groupByFacets(filteredRecords as any, facets, groupBy);
    const out: Series[] = [];
    let idx = 0;
    for (const [id, { label, records: rows }] of groups) {
      const ordered = [...rows].sort(
        (a: any, b: any) =>
          new Date(toIso(a.timeUnix)).getTime() -
          new Date(toIso(b.timeUnix)).getTime(),
      );
      out.push({
        id,
        label,
        color: colorFor(idx++),
        unit: metricUnit,
        data: ordered.map((r: any) => {
          const iso = toIso(r.timeUnix);
          return {
            timestamp: iso,
            time: formatTime(iso),
            value: recordToValue(r),
          };
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
    visibleSeries.forEach((s) =>
      s.data.forEach((p) => stamps.add(p.timestamp)),
    );
    const sorted = [...stamps].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
    const indexed = visibleSeries.map((s) => ({
      id: s.id,
      m: new Map(s.data.map((p) => [p.timestamp, p.value])),
    }));
    return sorted.map((ts) => {
      const row: Record<string, any> = { timestamp: ts, time: formatTime(ts) };
      indexed.forEach(({ id, m }) => {
        row[id] = m.has(ts) ? m.get(ts)! : null;
      });
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
    return rows
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, 200);
  }, [visibleSeries]);

  const filteredCatalog = useMemo(
    () =>
      metrics.filter(
        (m) =>
          m.metricName.toLowerCase().includes(metricSearch.toLowerCase()) ||
          (m.serviceName ?? '')
            .toLowerCase()
            .includes(metricSearch.toLowerCase()),
      ),
    [metrics, metricSearch],
  );

  const selectedMetric = useMemo(
    () => metrics.find((m) => makeSeriesId(m) === selectedId),
    [metrics, selectedId],
  );

  const selectedNotInCatalog =
    !seriesLoading && !!selectedId && metrics.length > 0 && !selectedMetric;

  const columns = useMemo<ColumnDef<TableRow>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Time" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(toIso(row.original.timestamp)).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'value',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Value" />
        ),
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">
            {formatValue(row.original.value, metricUnit)}
          </span>
        ),
      },
      {
        accessorKey: 'group',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Group" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.group}</span>
        ),
      },
    ],
    [metricUnit],
  );
  return {
    navigate,
    catalogError,
    metricSearch,
    setMetricSearch,
    selectedId,
    setSelectedId,
    records,
    metricType,
    seriesLoading,
    seriesError,
    setRefreshTick,
    facetSelection,
    setFacetSelection,
    groupBy,
    setGroupBy,
    hiddenSeries,
    setHiddenSeries,
    hideTransient,
    setHideTransient,
    timeRange,
    setTimeRange,
    chartType,
    setChartType,
    autoRefresh,
    setAutoRefresh,
    sidebarOpen,
    setSidebarOpen,
    facets,
    filteredRecords,
    series,
    visibleSeries,
    chartData,
    yDomain,
    summaryStats,
    activeUnit,
    tableRows,
    filteredCatalog,
    selectedMetric,
    selectedNotInCatalog,
    columns,
  };
}
