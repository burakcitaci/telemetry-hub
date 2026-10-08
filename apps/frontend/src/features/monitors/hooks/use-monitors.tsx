import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DatadogMonitorOverallState,
  DATADOG_MONITORS,
  MonitorType,
  MonitorStatus,
  MonitorView,
  mapOverallState,
  toMonitorViews,
  MonitorSeries,
  synthesizeSeries,
  SIDEBAR_STORAGE_KEY,
  MonitorEvent,
} from '@/features/monitors/model';

export function useMonitors() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const [monitors, setMonitors] = useState<MonitorView[]>(() =>
    toMonitorViews(DATADOG_MONITORS),
  );

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<Set<MonitorStatus>>(
    new Set(),
  );

  const [typeFilter, setTypeFilter] = useState<Set<MonitorType>>(new Set());

  const [timeRange, setTimeRange] = useState('24h');

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
    } catch {}
  }, [sidebarOpen]);

  const [openId, setOpenId] = useState<string | null>(searchParams.get('id'));

  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (openId) next.set('id', openId);
    else next.delete('id');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // TODO: GET /api/v1/monitors
        // const res = await fetch(`${API_BASE}/api/v1/monitors`);
        // if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // const json: DatadogMonitor[] = await res.json();
        // if (cancelled) return;
        // setMonitors(toMonitorViews(json));
        await new Promise((r) => setTimeout(r, 250));
        if (cancelled) return;
        setError(null);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load monitors',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const events = useMemo<Record<string, MonitorEvent[]>>(() => {
    const out: Record<string, MonitorEvent[]> = {};
    for (const m of DATADOG_MONITORS) {
      const groups = m.state?.groups ?? {};
      out[String(m.id)] = Object.entries(groups)
        .filter(
          ([, g]) =>
            g.last_triggered_ts || g.last_resolved_ts || g.last_nodata_ts,
        )
        .map(([groupName, g], idx) => {
          const ts =
            g.last_triggered_ts ?? g.last_resolved_ts ?? g.last_nodata_ts ?? 0;
          const status = mapOverallState(
            g.status as DatadogMonitorOverallState,
          );
          return {
            id: `${m.id}-${idx}`,
            monitorId: String(m.id),
            at: new Date(ts * 1000).toISOString(),
            status,
            message: groupName,
          };
        })
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    }
    return out;
  }, []);

  const seriesById = useMemo<Record<string, MonitorSeries>>(() => {
    const out: Record<string, MonitorSeries> = {};
    for (const m of DATADOG_MONITORS) out[String(m.id)] = synthesizeSeries(m);
    return out;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monitors.filter((m) => {
      if (
        q &&
        !(m.name.toLowerCase().includes(q) || m.query.toLowerCase().includes(q))
      )
        return false;
      if (statusFilter.size && !statusFilter.has(m.status)) return false;
      if (typeFilter.size && !typeFilter.has(m.type)) return false;
      return true;
    });
  }, [monitors, search, statusFilter, typeFilter]);

  const statusCounts = useMemo(() => {
    const out: Record<MonitorStatus, number> = {
      OK: 0,
      Warn: 0,
      Alert: 0,
      'No Data': 0,
      neutral: 0,
    };
    monitors.forEach((m) => {
      out[m.status] = (out[m.status] ?? 0) + 1;
    });
    return out;
  }, [monitors]);

  const toggleStatusFilter = (s: MonitorStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleTypeFilter = (t: MonitorType) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const handleToggleMute = (id: string) => {
    const target = monitors.find((m) => m.id === id);
    setMonitors((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isMuted: !m.isMuted } : m)),
    );
    if (target?.isMuted) {
      // TODO: POST /api/v1/monitors/{id}/unmute
    } else {
      // TODO: POST /api/v1/monitors/{id}/mute
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this monitor?')) return;
    setMonitors((prev) => prev.filter((m) => m.id !== id));
    if (openId === id) setOpenId(null);
    // TODO: DELETE /api/v1/monitors/{id}
  };

  const handleSave = (draft: Partial<MonitorView>) => {
    if (creating) {
      const now = new Date().toISOString();
      const created: MonitorView = {
        id: `mon-${Math.random().toString(36).slice(2, 8)}`,
        name: draft.name ?? 'Untitled monitor',
        type: draft.type ?? 'metric',
        datadogType: draft.type === 'log' ? 'log alert' : 'query alert',
        query: draft.query ?? '',
        metric:
          draft.type === 'metric'
            ? (draft.query ?? '').split(':')[1]?.split('{')[0]
            : undefined,
        logSource: draft.type === 'log' ? 'logs' : undefined,
        aggregation: draft.aggregation,
        groupBy: draft.groupBy,
        comparator: draft.comparator ?? 'above',
        threshold: draft.threshold ?? 0,
        warnThreshold: draft.warnThreshold,
        evaluationWindow: draft.evaluationWindow ?? '5m',
        message: draft.message ?? '',
        targets: draft.targets ?? [],
        createdAt: now,
        updatedAt: now,
        status: 'OK',
        isMuted: false,
      };
      setMonitors((prev) => [created, ...prev]);
      setCreating(false);
      setOpenId(created.id);
      // TODO: POST /api/v1/monitors
    } else if (openId) {
      setMonitors((prev) =>
        prev.map((m) =>
          m.id === openId
            ? { ...m, ...draft, updatedAt: new Date().toISOString() }
            : m,
        ),
      );
      // TODO: PUT /api/v1/monitors/{id}
    }
  };

  const openMonitor = openId
    ? (monitors.find((m) => m.id === openId) ?? null)
    : null;

  const datadogForOpen = openMonitor
    ? DATADOG_MONITORS.find((d) => String(d.id) === openMonitor.id)
    : undefined;

  const detailVisible = creating || !!openMonitor;
  return {
    navigate,
    monitors,
    setMonitors,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    timeRange,
    setTimeRange,
    sidebarOpen,
    setSidebarOpen,
    setOpenId,
    creating,
    setCreating,
    events,
    seriesById,
    filtered,
    statusCounts,
    toggleStatusFilter,
    toggleTypeFilter,
    handleToggleMute,
    handleDelete,
    handleSave,
    openMonitor,
    datadogForOpen,
    detailVisible,
  };
}
