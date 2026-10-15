import { StatusBadge as TelemetryStatusBadge } from '@/components/shared/telemetry-primitives';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { api, unwrap } from '@/shared/api/client';
import { monitorPayload } from '../api';
import { MonitorHistoryChart } from './monitor-history-chart';
import { MonitorConditionSummary } from './monitor-condition-summary';
import { MonitorStateHistory } from './monitor-state-history';
import { calculationLabels } from '../log-builder';
import { displayLogQuery, resolveLogQuery } from '../log-query-input';
import { TimeRangePicker } from '@/app/components/timer-range.picker';
import { resolveTelemetryRange } from '@/shared/lib/telemetry';
import { readPlatformFilters } from '@/shared/lib/platform-filters';
import {
  Activity,
  Bell,
  BellOff,
  Filter,
  Info,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DatadogMonitor,
  MonitorType,
  Aggregation,
  Comparator,
  MonitorStatus,
  NotificationTarget,
  MonitorView,
  MonitorSeries,
  MonitorEvent,
  statusBg,
  statusLabel,
  formatRelative,
  formatNumber,
} from '@/features/monitors/model';

export const typeIcon = (t: MonitorType) =>
  t === 'metric' ? (
    <Activity className="h-3.5 w-3.5" />
  ) : t === 'log' ? (
    <Filter className="h-3.5 w-3.5" />
  ) : (
    <Info className="h-3.5 w-3.5" />
  );

export const StatusDot: React.FC<{
  status: MonitorStatus;
  pulse?: boolean;
}> = ({ status, pulse }) => (
  <span className="relative inline-flex h-2.5 w-2.5 shrink-0"></span>
);

export const StatusBadge: React.FC<{ status: MonitorStatus }> = ({
  status,
}) => (
  <TelemetryStatusBadge
    status={
      status === 'OK'
        ? 'success'
        : status === 'Warn'
          ? 'warning'
          : status === 'Alert'
            ? 'critical'
            : 'neutral'
    }
  >
    {statusLabel(status)}
  </TelemetryStatusBadge>
);

export const MutedBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-muted/15 px-2 py-0.5 text-xs font-medium text-muted-foreground dark:text-muted-foreground">
    <BellOff className="h-3 w-3" />
    Muted
  </span>
);

export const TypeBadge: React.FC<{ type: MonitorType }> = ({ type }) => (
  <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
    {typeIcon(type)}
    {type}
  </span>
);

export const TargetIcon: React.FC<{ target: NotificationTarget }> = ({
  target,
}) => {
  const label = { email: '@', slack: '#', webhook: '{}', pagerduty: '!' }[
    target
  ];
  return (
    <span
      title={target}
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-muted px-1 text-[10px] font-mono text-muted-foreground"
    >
      {label}
    </span>
  );
};

export const MonitorGraph: React.FC<{
  series: MonitorSeries;
  status: MonitorStatus;
  height?: number;
  compact?: boolean;
}> = ({ series, status, height = 140, compact = false }) => {
  const { points, threshold, warnThreshold, unit } = series;

  const W = compact ? 100 : 600;
  const H = compact ? 28 : height;
  const padL = compact ? 0 : 44;
  const padR = compact ? 0 : 12;
  const padT = compact ? 2 : 10;
  const padB = compact ? 2 : 22;

  const finite = points.filter((p) => Number.isFinite(p.v));
  if (finite.length === 0) {
    if (compact) {
      return (
        <svg viewBox="0 0 100 28" className="w-full" style={{ height: 28 }}>
          <line
            x1={0}
            x2={100}
            y1={14}
            y2={14}
            stroke="hsl(var(--border))"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </svg>
      );
    }
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        No data in range
      </div>
    );
  }

  const vMin = Math.min(
    ...finite.map((p) => p.v),
    threshold,
    warnThreshold ?? threshold,
  );
  const vMax = Math.max(
    ...finite.map((p) => p.v),
    threshold,
    warnThreshold ?? threshold,
  );
  const vPad = (vMax - vMin) * 0.1 || 1;
  const yMin = vMin - vPad;
  const yMax = vMax + vPad;

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;

  const x = (t: number) =>
    padL + ((t - tMin) / (tMax - tMin || 1)) * (W - padL - padR);
  const y = (v: number) =>
    padT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - padT - padB);

  const segments: string[] = [];
  let current = '';
  for (const p of points) {
    if (!Number.isFinite(p.v)) {
      if (current) segments.push(current);
      current = '';
      continue;
    }
    const cmd = current ? 'L' : 'M';
    current += `${cmd}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)} `;
  }
  if (current) segments.push(current);

  const strokeColor =
    status === 'Alert'
      ? 'hsl(var(--destructive))'
      : status === 'Warn'
        ? 'hsl(var(--warning))'
        : status === 'No Data'
          ? 'hsl(var(--primary))'
          : status === 'OK'
            ? 'hsl(var(--success))'
            : 'hsl(var(--muted-foreground))';

  const fmt = (v: number) =>
    Math.abs(v) >= 1_000_000
      ? `${(v / 1_000_000).toFixed(1)}M`
      : Math.abs(v) >= 1_000
        ? `${(v / 1_000).toFixed(1)}k`
        : v.toFixed(v < 10 ? 2 : 0);

  // ── Compact: line + faint thresholds only, no labels ────────────────────
  if (compact) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {warnThreshold !== undefined && (
          <line
            x1={0}
            x2={W}
            y1={y(warnThreshold)}
            y2={y(warnThreshold)}
            stroke="hsl(var(--warning))"
            strokeWidth={0.75}
            strokeDasharray="2 2"
            opacity={0.5}
          />
        )}
        <line
          x1={0}
          x2={W}
          y1={y(threshold)}
          y2={y(threshold)}
          stroke="hsl(var(--destructive))"
          strokeWidth={0.75}
          strokeDasharray="2 2"
          opacity={0.5}
        />
        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.25}
          />
        ))}
        {series.hasGap && series.gapStart && series.gapEnd && (
          <rect
            x={x(series.gapStart)}
            y={0}
            width={x(series.gapEnd) - x(series.gapStart)}
            height={H}
            fill="hsl(var(--primary))"
            opacity={0.1}
          />
        )}
      </svg>
    );
  }

  return <MonitorHistoryChart series={series} />;
};

export const MonitorRow: React.FC<{
  monitor: MonitorView;
  series: MonitorSeries;
  onToggleMute: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ monitor, series, onToggleMute, onOpen, onDelete }) => {
  return (
    <div
      tabIndex={0}
      role="button"
      className="group grid cursor-pointer grid-cols-[16px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset @4xl:grid-cols-[16px_minmax(0,1fr)_112px_120px_auto_auto]"
      onClick={(event) => {
        const action = (event.target as Element).closest('a,button,input,select,textarea,label,[role="button"],[role="checkbox"]');
        if (action && action !== event.currentTarget) return;
        onOpen(monitor.id);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const action = (event.target as Element).closest('a,button,input,select,textarea,label,[role="button"],[role="checkbox"]');
        if (action && action !== event.currentTarget) return;
        event.preventDefault();
        if (!event.repeat) onOpen(monitor.id);
      }}
    >
      {/* 1. Status dot */}
      <StatusDot status={monitor.status} pulse={monitor.status === 'Alert'} />

      {/* 2. Name + badges + query (truncates) */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{monitor.name}</span>
          <TypeBadge type={monitor.type} />
          {monitor.isMuted && <MutedBadge />}
        </div>
        <div className="mt-0.5">
          <span
            className="block truncate font-mono text-xs text-muted-foreground"
            title={monitor.query}
          >
            {monitor.type === 'log' ? displayLogQuery(monitor.query, monitor.logAttribute) : monitor.query}
          </span>
        </div>
      </div>

      {/* 3. Sparkline — own fixed column */}
      <div className="hidden h-7 @4xl:block">
        <MonitorGraph series={series} status={monitor.status} compact />
      </div>

      {/* 4. Condition (comparator + threshold + window) */}
      <div className="hidden flex-col items-end text-xs text-muted-foreground @4xl:flex">
        <span className="text-foreground font-medium whitespace-nowrap">
          {monitor.comparator.replace(/_/g, ' ')}{' '}
          {formatNumber(monitor.threshold)}
        </span>
        <span className="whitespace-nowrap">
          over {monitor.evaluationWindow}
        </span>
      </div>

      {/* 5. Last trigger */}
      <div className="hidden text-right @4xl:block">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Last trigger
        </div>
        <div className="text-xs font-medium whitespace-nowrap">
          {formatRelative(monitor.lastTriggeredAt)}
        </div>
      </div>

      {/* 6. Status badge + actions */}
      <div className="col-start-2 flex flex-wrap items-center gap-1 @4xl:col-auto">
        <StatusBadge status={monitor.status} />
        <div
          className="flex items-center gap-0.5 transition-opacity @4xl:opacity-0 @4xl:group-hover:opacity-100 @4xl:focus-within:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={monitor.isMuted ? 'Unmute' : 'Mute'}
            onClick={() => onToggleMute(monitor.id)}
          >
            {monitor.isMuted ? (
              <BellOff className="h-3.5 w-3.5" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Delete"
            onClick={() => onDelete(monitor.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const MonitorDetail: React.FC<{
  monitor: MonitorView;
  datadogMonitor?: DatadogMonitor;
  events: MonitorEvent[];
  onClose: () => void;
  onToggleMute: (id: string) => void;
  onEdit: () => void;
  onEvaluate?: () => void;
  evaluating?: boolean;
  chartTimeRange?: string;
  onChartTimeRangeChange?: (range: string) => void;
}> = ({ monitor, events, onClose, onToggleMute, onEdit, onEvaluate, evaluating, chartTimeRange = '30m', onChartTimeRangeChange }) => {
  const [clock, setClock] = useState(() => Date.now());
  const [historical, setHistorical] = useState<{ points: Array<{ t: number; v: number | null }>; unit: string; bucketMs: number } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setHistoryLoading(true); setHistoryError(null); setHistorical(null);
      const selected = resolveTelemetryRange(chartTimeRange);
      try {
        const response = await api.get(`/monitors/${encodeURIComponent(monitor.id)}/history`, { signal: controller.signal,
          params: { from: selected.from.toISOString(), to: selected.to.toISOString() } });
        if (!controller.signal.aborted) setHistorical(unwrap(response.data));
      } catch { if (!controller.signal.aborted) setHistoryError('Could not load historical telemetry. Try refreshing or select a shorter range.'); }
      finally { if (!controller.signal.aborted) setHistoryLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [monitor.id, monitor.updatedAt, chartTimeRange, historyRefresh]);
  useEffect(() => { const timer = setInterval(() => setHistoryRefresh(value => value + 1), 30_000); return () => clearInterval(timer); }, []);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 10_000); return () => clearInterval(timer); }, []);
  const resolvedRange = resolveTelemetryRange(chartTimeRange, clock);
  const chartRange = { from: resolvedRange.from.getTime(), to: resolvedRange.to.getTime() };
  const series = useMemo<MonitorSeries>(
    () => ({ points: (historical?.points ?? []).map(point => ({ t: point.t, v: point.v ?? Number.NaN })),
      threshold: monitor.threshold, warnThreshold: monitor.warnThreshold, unit: historical?.unit ?? monitor.unit }),
    [historical, monitor.unit, monitor.threshold, monitor.warnThreshold],
  );
  const lastPoint = monitor.history?.[monitor.history.length - 1];
  const lastValue = monitor.value !== undefined ? monitor.value ?? undefined
    : typeof lastPoint?.v === 'number' && Number.isFinite(lastPoint.v) ? lastPoint.v : undefined;
  const fmtValue = (v?: number) =>
    v === undefined
      ? '—'
      : Math.abs(v) >= 1_000_000
        ? `${Number((v / 1_000_000).toFixed(2))}M`
        : Math.abs(v) >= 1_000
          ? `${Number((v / 1_000).toFixed(2))}k`
          : String(Number(v.toFixed(3)));

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-5 py-3">
        <div className="min-w-0 flex-1 basis-48">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold" title={monitor.name}>{monitor.name}</h2>
            <TypeBadge type={monitor.type} />
            <StatusBadge status={monitor.status} />
            {monitor.isMuted && <MutedBadge />}
          </div>
        </div>
        <div className="ml-auto flex max-w-full flex-wrap items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={onEdit}>Edit</Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => onToggleMute(monitor.id)}
          >
            {monitor.isMuted ? (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5" /> Unmute
              </>
            ) : (
              <>
                <Pause className="mr-1.5 h-3.5 w-3.5" /> Mute
              </>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onClose} aria-label="Close monitor details"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <MonitorConditionSummary monitor={monitor} />

        {/* Graph */}
        <section aria-label="Evaluated data" className="border-b border-border px-5 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold">Evaluated data</h3>
              <div className="ml-auto flex items-center gap-1">
                {onChartTimeRangeChange && <TimeRangePicker className="[&>button]:h-7 [&>button]:px-2 [&>button]:text-xs" value={chartTimeRange} onChange={onChartTimeRangeChange} />}
                <Button variant="ghost" size="icon" className="size-7" title="Refresh chart" aria-label="Refresh chart" disabled={historyLoading} onClick={() => setHistoryRefresh(value => value + 1)}><RefreshCw className="size-3.5" /></Button>
              </div>
            </div>
            <div className="mb-2">
              <span className="text-xs text-muted-foreground">
                now {fmtValue(lastValue)}
                {series.unit ? ` ${series.unit}` : ''} · critical{' '}
                {fmtValue(series.threshold)}
                {series.warnThreshold !== undefined
                  ? ` · warn ${fmtValue(series.warnThreshold)}`
                  : ''}
              </span>
            </div>
            {historyLoading ? <p className="py-8 text-center text-xs text-muted-foreground">Loading historical telemetry…</p>
              : historyError ? <p role="alert" className="py-8 text-xs text-destructive">{historyError}</p>
              : <MonitorHistoryChart compact series={series} range={chartRange} bucketMs={historical?.bucketMs} />}
            <p role="note" className="mt-2 text-xs text-muted-foreground">
              {monitor.lastEvaluatedAt
                ? `Last evaluated: ${new Date(monitor.lastEvaluatedAt).toLocaleString()}`
                : 'Awaiting first evaluation. Rules are checked every 30 seconds.'}
            </p>
            {monitor.evaluationError && <p role="alert" className="mt-2 text-xs text-destructive">{monitor.evaluationError}</p>}
            {!!monitor.groups?.length && <ul className="mt-3 space-y-1 text-xs">{monitor.groups.map(group =>
              <li key={group.key} className="flex justify-between gap-2"><span>{group.labels.map(label => label || '(unset)').join(' / ') || 'All matching data'}</span>
                <span>{group.value == null ? '—' : formatNumber(group.value)} {monitor.unit} · {group.status}</span></li>)}</ul>}
            <p className="mt-2 text-xs text-muted-foreground">State changes are recorded in-app. External notification delivery is not configured.</p>
        </section>

        {/* History */}
        <MonitorStateHistory key={monitor.id} events={events} renderEvent={(e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2 text-xs"
                  >
                    <StatusDot status={e.status} />
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(e.at).toLocaleString()}
                    </span>
                    <StatusBadge status={e.status} />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {e.message ??
                        (e.value !== undefined ? `value=${e.value}` : '')}
                    </span>
                  </li>
        )} />

        <div className="px-5 py-3 text-[11px] text-muted-foreground">
          Created {new Date(monitor.createdAt).toLocaleString()} · Updated{' '}
          {new Date(monitor.updatedAt).toLocaleString()} · Last triggered{' '}
          {formatRelative(monitor.lastTriggeredAt)}
        </div>
      </div>
    </div>
  );
};

export const MonitorForm: React.FC<{
  pending?: boolean;
  error?: string | null;
  initial?: MonitorView | null;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSave: (draft: Partial<MonitorView>) => void;
}> = ({ initial, onCancel, onDirtyChange, onSave, pending, error }) => {
  const { session } = useAuth();
  const [params] = useSearchParams();
  const scopeDefaults = readPlatformFilters(params.toString());
  const [teamId, setTeamId] = useState(initial?.teamId ?? (scopeDefaults.team.length === 1 ? scopeDefaults.team[0] : ''));
  const [service, setService] = useState(initial?.service ?? (scopeDefaults.service.length === 1 ? scopeDefaults.service[0] : ''));
  const [env, setEnv] = useState(initial?.env ?? (scopeDefaults.env.length === 1 ? scopeDefaults.env[0] : ''));
  const [type, setType] = useState<MonitorType>(initial?.type ?? 'metric');
  const [name, setName] = useState(initial?.name ?? '');
  const [query, setQuery] = useState(initial?.type === 'log' ? displayLogQuery(initial.query, initial.logAttribute) : initial?.query ?? '');
  const [aggregation, setAggregation] = useState<Aggregation>(
    initial?.aggregation ?? (initial?.type === 'log' ? 'count' : 'avg'),
  );
  const [metricType, setMetricType] = useState<NonNullable<MonitorView['metricType']>>(initial?.metricType ?? 'gauge');
  const [signalStatus, setSignalStatus] = useState(initial?.signalStatus ?? '');
  const [logAttribute, setLogAttribute] = useState(initial?.logAttribute ?? '');
  const resolvedLogQuery = resolveLogQuery(query, aggregation, query === displayLogQuery(initial?.query ?? '', initial?.logAttribute) ? logAttribute : undefined);
  const effectiveQuery = type === 'log' ? resolvedLogQuery.query : query;
  const logBuilderError = type === 'log' ? resolvedLogQuery.error : undefined;
  const [noDataPolicy, setNoDataPolicy] = useState<NonNullable<MonitorView['noDataPolicy']>>(initial?.noDataPolicy ?? 'no_data');
  const [preview, setPreview] = useState<{ status: string; value: number | null; unit: string; groups: unknown[] } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewVersion = useRef(0);
  const [groupBy, setGroupBy] = useState((initial?.groupBy ?? []).join(', '));
  const [comparator, setComparator] = useState<Comparator>(
    initial?.comparator ?? 'above',
  );
  const [threshold, setThreshold] = useState(String(initial?.threshold ?? 100));
  const [warnThreshold, setWarnThreshold] = useState(
    initial?.warnThreshold !== undefined ? String(initial.warnThreshold) : '',
  );
  const [evaluationWindow, setEvaluationWindow] = useState(
    initial?.evaluationWindow ?? '5m',
  );
  const [message, setMessage] = useState(initial?.message ?? '');
  const [targets, setTargets] = useState<Set<NotificationTarget>>(
    new Set(initial?.targets ?? []),
  );

  const initialSnapshot = useState(() =>
    JSON.stringify({
      teamId,
      service,
      env,
      type,
      name,
      query,
      aggregation,
      metricType, signalStatus, noDataPolicy, logAttribute,
      groupBy,
      comparator,
      threshold,
      warnThreshold,
      evaluationWindow,
      message,
      targets: [...targets].sort(),
    }),
  )[0];
  const draftSnapshot = JSON.stringify({
    teamId,
    service,
    env,
    type,
    name,
    query,
    aggregation,
    metricType, signalStatus, noDataPolicy, logAttribute,
    groupBy,
    comparator,
    threshold,
    warnThreshold,
    evaluationWindow,
    message,
    targets: [...targets].sort(),
  });
  useEffect(() => {
    onDirtyChange(draftSnapshot !== initialSnapshot);
  }, [draftSnapshot, initialSnapshot, onDirtyChange]);

  const canSave = name.trim() && effectiveQuery.trim() && !logBuilderError && threshold.trim() && Number.isFinite(Number(threshold))
    && (!warnThreshold || Number.isFinite(Number(warnThreshold))) && type !== 'other';

  const draft = (): Partial<MonitorView> => ({ teamId, service, env: env === 'all' ? '' : env, type, name: name.trim(),
    query: effectiveQuery.trim(), aggregation,
    logAttribute: type === 'log' ? resolvedLogQuery.attribute : undefined, metricType, signalStatus: signalStatus || undefined,
    noDataPolicy, groupBy: groupBy.split(',').map(value => value.trim()).filter(Boolean), comparator,
    threshold: Number(threshold), warnThreshold: warnThreshold ? Number(warnThreshold) : undefined,
    evaluationWindow, message, targets: Array.from(targets), isMuted: initial?.isMuted ?? false });

  const previewRule = async () => {
    const requestVersion = previewVersion.current;
    setPreviewing(true); setPreviewError(null); setPreview(null);
    try { const response = await api.post('/monitors/preview', monitorPayload(draft()));
      if (requestVersion === previewVersion.current) setPreview(unwrap(response.data)); }
    catch (cause: any) { if (requestVersion === previewVersion.current)
      setPreviewError(String(cause.response?.data?.message ?? 'Could not evaluate this rule. Check your inputs and data source.')); }
    finally { setPreviewing(false); }
  };
  useEffect(() => { previewVersion.current++; setPreview(null); setPreviewError(null); }, [draftSnapshot]);
  useEffect(() => { if (aggregation !== 'count' || groupBy.trim()) setNoDataPolicy('no_data'); }, [aggregation, groupBy]);

  const toggleTarget = (t: NotificationTarget) => {
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <>
      <fieldset
        disabled={pending}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 [&_input]:h-8 [&_input]:text-xs [&_button[role=combobox]]:h-8 [&_button[role=combobox]]:text-xs"
      >
        {/* Type + name */}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <section className="grid gap-3 rounded-md border bg-background p-4 sm:grid-cols-3">
          <div className="space-y-1 text-xs">
            <label htmlFor="monitor-team" className="text-muted-foreground">Team</label>
            <Select value={teamId || '__all__'} onValueChange={(value) => setTeamId(value === '__all__' ? '' : value)}>
              <SelectTrigger id="monitor-team" className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All / no team</SelectItem>
                {session?.teams.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="space-y-1 text-xs"><span className="text-muted-foreground">Service (optional)</span><Input value={service} onChange={event => setService(event.target.value)} maxLength={255} placeholder="Alle Services" className="h-8 text-xs" /></label>
          <label className="space-y-1 text-xs"><span className="text-muted-foreground">Environment (optional)</span><Input value={env} onChange={event => setEnv(event.target.value)} maxLength={64} placeholder="Alle Umgebungen" className="h-8 text-xs" /></label>
        </section>
        <section className="space-y-3 rounded-md border bg-background p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr]">
              <div>
                <label htmlFor="monitor-type" className="mb-1.5 block text-xs font-medium">Type</label>
                <Select
                  value={type}
                  onValueChange={(v) => { setType(v as MonitorType); setAggregation(v === 'log' ? 'max' : 'avg');
                    setSignalStatus(''); setLogAttribute(''); setNoDataPolicy('no_data'); setQuery(v === 'metric' ? '' : '*'); }}
                >
                  <SelectTrigger id="monitor-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="log">Log</SelectItem>
                    <SelectItem value="trace">Trace / APM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="monitor-name" className="mb-1.5 block text-xs font-medium">Name</label>
                <Input
                  id="monitor-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    type === 'metric'
                      ? 'High checkout latency'
                      : 'Elevated error rate'
                  }
                />
              </div>
            </div>
        </section>

        {/* Query */}
        <section className="space-y-3 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Query</h3>
          <Input id="monitor-query" aria-label="Monitor query" value={query} onChange={event => setQuery(event.target.value)}
            placeholder={type === 'log' ? 'ForecastCount > 5' : type === 'metric' ? 'http.server.request.duration' : '* or span name'} maxLength={4000} />
          {logBuilderError && <p role="alert" className="text-xs text-destructive">{logBuilderError}</p>}
          <details open={type === 'metric'} className="space-y-2"><summary className="cursor-pointer text-xs text-muted-foreground">Optional settings</summary>
            {type === 'metric' ? <label className="block space-y-1 text-xs">Metric stream type
              <Select value={metricType} onValueChange={value => setMetricType(value as typeof metricType)}>
                <SelectTrigger aria-label="Metric stream type"><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="gauge">Gauge</SelectItem><SelectItem value="sum">Sum / counter snapshot</SelectItem><SelectItem value="histogram">Histogram snapshot</SelectItem>
                </SelectContent></Select></label> : <label className="block space-y-1 text-xs">Signal status
              <Select value={signalStatus || '__all__'} onValueChange={value => setSignalStatus(value === '__all__' ? '' : value)}>
                <SelectTrigger aria-label="Signal status"><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>{(type === 'trace' ? ['ERROR', 'OK', 'UNSET'] : ['ERROR', 'WARN', 'INFO', 'DEBUG']).map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent></Select></label>}

            <label className="block space-y-1 text-xs">Group by (optional)<Input value={groupBy} onChange={event => setGroupBy(event.target.value)} placeholder="service.name, host.name" /></label>
          </details>
        </section>

        {/* Condition */}
        <section className="space-y-3 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Alert condition</h3>
            <label className="block space-y-1 text-xs">Aggregation
              <Select value={aggregation} onValueChange={value => setAggregation(value as Aggregation)}>
                <SelectTrigger id="monitor-log-calculation" aria-label="Aggregation"><SelectValue /></SelectTrigger><SelectContent>
                  {(type === 'log' ? ['count', 'sum', 'avg', 'max', 'min', 'p95'] : type === 'trace' ? ['count', 'avg', 'min', 'max', 'p95'] : ['count', 'avg', 'sum', 'min', 'max']).map(value => <SelectItem key={value} value={value}>{calculationLabels[value]}</SelectItem>)}
                </SelectContent></Select>
            </label>
             <div className="flex flex-wrap items-end gap-2">
              <span className="pb-2 text-xs text-muted-foreground">
                Trigger when the value is
              </span>
              <div className="w-40">
                <label htmlFor="monitor-comparator" className="sr-only">Comparator</label>
                <Select
                  value={comparator}
                  onValueChange={(v) => setComparator(v as Comparator)}
                >
                  <SelectTrigger id="monitor-comparator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Above</SelectItem>
                    <SelectItem value="above_or_equal">
                      Above or equal to
                    </SelectItem>
                    <SelectItem value="below">Below</SelectItem>
                    <SelectItem value="below_or_equal">
                      Below or equal to
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Input
                  id="monitor-threshold"
                  aria-label="Alert threshold"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="500"
                />
              </div>
              <span className="pb-2 text-xs text-muted-foreground">over</span>
              <div className="w-28">
                <Select value={evaluationWindow} onValueChange={setEvaluationWindow}>
                  <SelectTrigger id="monitor-window" aria-label="Evaluation window"><SelectValue /></SelectTrigger><SelectContent>
                    {['1m', '5m', '15m', '30m', '1h'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent></Select>
              </div>
            </div>


            <div className="flex flex-wrap items-end gap-3 border-t pt-3">
              <div className="w-40">
                <label htmlFor="monitor-warn-threshold" className="mb-1.5 block text-xs font-medium">
                  Warn threshold{' '}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <Input
                  id="monitor-warn-threshold"
                  type="number"
                  value={warnThreshold}
                  onChange={(e) => setWarnThreshold(e.target.value)}
                  placeholder="300"
                />
              </div>
            </div>
        </section>

        <section className="space-y-3 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Missing data and preview</h3>
          <Select value={noDataPolicy} onValueChange={value => setNoDataPolicy(value as typeof noDataPolicy)}>
            <SelectTrigger aria-label="Missing data policy"><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="no_data">Show No Data when telemetry is missing</SelectItem>
              {aggregation === 'count' && <SelectItem value="zero">Treat an empty ungrouped count as zero</SelectItem>}
            </SelectContent></Select>
          <Button variant="outline" disabled={!canSave || previewing} onClick={previewRule}>{previewing ? 'Evaluating…' : 'Preview against real data'}</Button>
          {preview && <p role="status" className="text-xs">{preview.status} · Value {preview.value == null ? '—' : preview.value} {preview.unit} · {preview.groups.length} groups</p>}
          {previewError && <p role="alert" className="text-xs text-destructive">{previewError}</p>}
        </section>
        {/* Notify */}
        <details className="space-y-3 rounded-md border bg-background p-4">
          <summary className="cursor-pointer text-xs text-muted-foreground">Message (optional)</summary>
            <div>
              <label htmlFor="monitor-message" className="mb-1.5 block text-xs font-medium">
                Message
              </label>
              <Textarea
                id="monitor-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Describe the incident and the steps to investigate."
                className="text-xs"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Message is stored with the rule. Evaluation and alert history run in-app; template rendering and external delivery are not configured.
              </p>
            </div>


        </details>
      </fieldset>
      <div className="flex shrink-0 justify-end gap-2 border-t bg-background px-5 py-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          disabled={!canSave || pending}
          onClick={() => onSave(draft())}
        >
          {pending ? 'Saving…' : initial ? 'Save' : 'Create monitor'}
        </Button>
      </div>
    </>
  );
};
