import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, unwrap } from '@/shared/api/client';
import { platformFilterKey } from '@/shared/lib/platform-filters';
import { monitorPayload } from '../api';
import {
  MonitorType,
  MonitorStatus,
  MonitorView,
  MonitorSeries,
  SIDEBAR_STORAGE_KEY,
  MonitorEvent,
  normalizeMonitorEvaluation,
} from '@/features/monitors/model';

export function useMonitors() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const filterKey = platformFilterKey(searchParams.toString());

  const [monitors, setMonitors] = useState<MonitorView[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<Set<MonitorStatus>>(
    new Set(),
  );

  const [typeFilter, setTypeFilter] = useState<Set<MonitorType>>(new Set());

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
    let active = false;
    const controller = new AbortController();
    const load = async () => {
      if (active) return;
      active = true;
      setLoading(true);
      try {
        const { data } = await api.get('/monitors', { signal: controller.signal });
        if (cancelled) return;
        setMonitors(unwrap<MonitorView[]>(data).map(normalizeMonitorEvaluation));
        setError(null);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load monitors',
          );
      } finally {
        active = false;
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      controller.abort(); window.clearInterval(timer);
    };
  }, [revision, filterKey]);

  const events = useMemo<Record<string, MonitorEvent[]>>(() =>
    Object.fromEntries(monitors.map(monitor => [monitor.id, monitor.events ?? []])), [monitors]);

  const seriesById = useMemo<Record<string, MonitorSeries>>(() => {
    return Object.fromEntries(monitors.map(monitor => [monitor.id, {
      points: (monitor.history ?? []).map(point => ({ t: point.t, v: point.v ?? Number.NaN })),
      threshold: monitor.threshold, warnThreshold: monitor.warnThreshold, unit: monitor.unit,
    }]));
  }, [monitors]);

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
      Unknown: 0,
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

  const handleToggleMute = async (id: string) => {
    const target = monitors.find((m) => m.id === id);
    if (!target) return;
    try {
      const { data } = await api.post(`/monitors/${id}/mute`, { isMuted: !target.isMuted });
      const updated = normalizeMonitorEvaluation(unwrap<MonitorView>(data));
      setMonitors(prev => prev.map(m => m.id === id ? updated : m)); setError(null);
    } catch { setError('Monitor konnte nicht aktualisiert werden.'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this monitor?')) return;
    try {
      await api.delete(`/monitors/${id}`);
      setMonitors(prev => prev.filter(m => m.id !== id));
      if (openId === id) setOpenId(null); setError(null);
    } catch { setError('Monitor konnte nicht gelöscht werden.'); }
  };

  const handleEvaluate = async (id: string) => {
    if (evaluatingId) return;
    setEvaluatingId(id);
    try {
      const { data } = await api.post(`/monitors/${id}/evaluate`);
      const updated = normalizeMonitorEvaluation(unwrap<MonitorView>(data));
      setMonitors(previous => previous.map(monitor => monitor.id === id ? updated : monitor)); setError(null);
    } catch { setError('Monitor evaluation could not be completed.'); }
    finally { setEvaluatingId(null); }
  };

  const handleSave = async (draft: Partial<MonitorView>) => {
    if (saving) return;
    setSaving(true);
    try {
    if (creating && !openId) {
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
        metricType: draft.metricType,
        signalStatus: draft.signalStatus,
        logAttribute: draft.logAttribute,
        noDataPolicy: draft.noDataPolicy,
        groupBy: draft.groupBy,
        comparator: draft.comparator ?? 'above',
        threshold: draft.threshold ?? 0,
        warnThreshold: draft.warnThreshold,
        evaluationWindow: draft.evaluationWindow ?? '5m',
        message: draft.message ?? '',
        targets: draft.targets ?? [],
        createdAt: now,
        updatedAt: now,
        status: 'Unknown',
        isMuted: false,
      };
      created.teamId = draft.teamId || undefined;
      created.service = draft.service || undefined;
      created.env = draft.env || undefined;
      const { data } = await api.post('/monitors', monitorPayload(created));
      const saved = normalizeMonitorEvaluation(unwrap<MonitorView>(data));
      setMonitors((prev) => [saved, ...prev]);
      setCreating(false);
      setOpenId(saved.id);
    } else if (openId) {
      const original = monitors.find(m => m.id === openId);
      const { data } = await api.put(`/monitors/${openId}`, monitorPayload({ ...original, ...draft }));
      const saved = normalizeMonitorEvaluation(unwrap<MonitorView>(data));
      setMonitors(prev => prev.map(m => m.id === openId ? saved : m));
      setCreating(false);
    }
    setError(null);
    setRevision(value => value + 1);
    } catch (cause: any) {
      const message = cause.response?.data?.message;
      setError(Array.isArray(message) ? message.join(' ') : typeof message === 'string' ? message
        : 'Monitor konnte nicht gespeichert werden. Bitte Eingaben prüfen.');
    }
    finally { setSaving(false); }
  };

  const openMonitor = openId
    ? (monitors.find((m) => m.id === openId) ?? null)
    : null;

  const datadogForOpen = undefined;

  const detailVisible = creating || !!openMonitor;
  return {
    navigate,
    monitors,
    setMonitors,
    loading,
    saving,
    evaluatingId,
    handleEvaluate,
    refresh: () => setRevision(value => value + 1),
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
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
