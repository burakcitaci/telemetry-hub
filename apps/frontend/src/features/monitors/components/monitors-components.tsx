import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  BellOff,
  Filter,
  Info,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  synthesizeSeries,
  MonitorEvent,
  statusTone,
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
}) => {
  const tone = statusTone(status);
  const cls =
    tone === 'success'
      ? 'bg-success/15 text-success dark:text-success border-success/30'
      : tone === 'warning'
        ? 'bg-warning/15 text-warning dark:text-warning border-warning/30'
        : tone === 'error'
          ? 'bg-destructive/15 text-destructive dark:text-destructive border-destructive/30'
          : tone === 'info'
            ? 'bg-primary/15 text-primary dark:text-primary border-primary/30'
            : 'bg-muted/15 text-muted-foreground dark:text-muted-foreground border-border/30';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusBg(status)}`} />
      {statusLabel(status)}
    </span>
  );
};

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

  // ── Full: axes, labels, bands ───────────────────────────────────────────
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      {warnThreshold !== undefined && (
        <rect
          x={padL}
          y={Math.min(y(warnThreshold), y(threshold))}
          width={W - padL - padR}
          height={Math.abs(y(warnThreshold) - y(threshold))}
          fill="hsl(var(--warning))"
          opacity={0.08}
        />
      )}

      <line
        x1={padL}
        x2={W - padR}
        y1={y(threshold)}
        y2={y(threshold)}
        stroke="hsl(var(--destructive))"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.8}
      />

      {warnThreshold !== undefined && (
        <line
          x1={padL}
          x2={W - padR}
          y1={y(warnThreshold)}
          y2={y(warnThreshold)}
          stroke="hsl(var(--warning))"
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.7}
        />
      )}

      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
        />
      ))}

      {series.hasGap && series.gapStart && series.gapEnd && (
        <>
          <rect
            x={x(series.gapStart)}
            y={padT}
            width={x(series.gapEnd) - x(series.gapStart)}
            height={H - padT - padB}
            fill="hsl(var(--primary))"
            opacity={0.08}
          />
          <text
            x={(x(series.gapStart) + x(series.gapEnd)) / 2}
            y={padT + 14}
            textAnchor="middle"
            fontSize={10}
            fill="hsl(var(--primary))"
          >
            No data
          </text>
        </>
      )}

      <text
        x={padL - 6}
        y={y(yMax) + 4}
        textAnchor="end"
        fontSize={10}
        fill="hsl(var(--muted-foreground))"
      >
        {fmt(yMax)}
        {unit ? ` ${unit}` : ''}
      </text>
      <text
        x={padL - 6}
        y={y(yMin) + 4}
        textAnchor="end"
        fontSize={10}
        fill="hsl(var(--muted-foreground))"
      >
        {fmt(yMin)}
      </text>

      {[0, 0.5, 1].map((f) => {
        const t = tMin + f * (tMax - tMin);
        const label = f === 0 ? '24h ago' : f === 0.5 ? '12h ago' : 'now';
        return (
          <text
            key={f}
            x={x(t)}
            y={H - 6}
            textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}
            fontSize={10}
            fill="hsl(var(--muted-foreground))"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
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
      className="group grid cursor-pointer grid-cols-[16px_minmax(0,1fr)_112px_120px_auto_auto] items-center gap-4 border-b px-4 py-3 transition-colors hover:bg-accent/40"
      onClick={() => onOpen(monitor.id)}
    >
      {/* 1. Status dot */}
      <StatusDot status={monitor.status} pulse={monitor.status === 'Alert'} />

      {/* 2. Name + badges + query (truncates) */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{monitor.name}</span>
          <TypeBadge type={monitor.type} />
          {monitor.isMuted && <MutedBadge />}
        </div>
        <div className="mt-0.5">
          <span
            className="block truncate font-mono text-xs text-muted-foreground"
            title={monitor.query}
          >
            {monitor.query}
          </span>
        </div>
      </div>

      {/* 3. Sparkline — own fixed column */}
      <div className="hidden lg:block h-7">
        <MonitorGraph series={series} status={monitor.status} compact />
      </div>

      {/* 4. Condition (comparator + threshold + window) */}
      <div className="hidden lg:flex flex-col items-end text-xs text-muted-foreground">
        <span className="text-foreground font-medium whitespace-nowrap">
          {monitor.comparator.replace(/_/g, ' ')}{' '}
          {formatNumber(monitor.threshold)}
        </span>
        <span className="whitespace-nowrap">
          over {monitor.evaluationWindow}
        </span>
      </div>

      {/* 5. Last trigger */}
      <div className="hidden sm:block text-right">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Last trigger
        </div>
        <div className="text-xs font-medium whitespace-nowrap">
          {formatRelative(monitor.lastTriggeredAt)}
        </div>
      </div>

      {/* 6. Status badge + actions */}
      <div className="flex items-center gap-1">
        <StatusBadge status={monitor.status} />
        <div
          className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
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
  datadogMonitor: DatadogMonitor;
  events: MonitorEvent[];
  onClose: () => void;
  onToggleMute: (id: string) => void;
}> = ({ monitor, datadogMonitor, events, onToggleMute }) => {
  const series = useMemo(
    () => synthesizeSeries(datadogMonitor),
    [datadogMonitor],
  );
  const lastPoint = series.points
    .filter((p) => Number.isFinite(p.v))
    .slice(-1)[0];
  const lastValue = lastPoint?.v;
  const fmtValue = (v?: number) =>
    v === undefined
      ? '—'
      : Math.abs(v) >= 1_000_000
        ? `${(v / 1_000_000).toFixed(2)}M`
        : Math.abs(v) >= 1_000
          ? `${(v / 1_000).toFixed(2)}k`
          : v.toFixed(v < 10 ? 3 : 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b p-4 pr-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold">{monitor.name}</h2>
            <TypeBadge type={monitor.type} />
            <StatusBadge status={monitor.status} />
            {monitor.isMuted && <MutedBadge />}
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
            {monitor.query}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Condition summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Condition</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Trigger</div>
              <div className="font-mono">
                {monitor.aggregation}: {monitor.metric ?? monitor.logSource}{' '}
                {monitor.comparator.replace(/_/g, ' ')}{' '}
                {formatNumber(monitor.threshold)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Evaluation window</div>
              <div className="font-mono">{monitor.evaluationWindow}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Group by</div>
              <div className="font-mono">
                {monitor.groupBy?.join(', ') || '—'}
              </div>
            </div>
            {monitor.warnThreshold !== undefined && (
              <div>
                <div className="text-muted-foreground">Warn threshold</div>
                <div className="font-mono">
                  {formatNumber(monitor.warnThreshold)}
                </div>
              </div>
            )}
            <div>
              <div className="text-muted-foreground">Notify</div>
              <div className="flex gap-1.5">
                {monitor.targets.length
                  ? monitor.targets.map((t) => (
                      <TargetIcon key={t} target={t} />
                    ))
                  : '—'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graph */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Evaluated data</CardTitle>
              <span className="font-mono text-xs text-muted-foreground">
                now {fmtValue(lastValue)}
                {series.unit ? ` ${series.unit}` : ''} · critical{' '}
                {fmtValue(series.threshold)}
                {series.warnThreshold !== undefined
                  ? ` · warn ${fmtValue(series.warnThreshold)}`
                  : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <MonitorGraph series={series} status={monitor.status} />
            <p className="mt-2 text-[10px] text-muted-foreground">
              Dummy series · 24h @ 5m resolution ·{' '}
              {/* TODO: replace with GET /api/v1/query or the Snapshot API */}
              replace with <code>GET /api/v1/query</code> once wired up.
            </p>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              State history
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {events.length} event{events.length === 1 ? '' : 's'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                No state changes yet
              </p>
            ) : (
              <ul className="divide-y">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 px-4 py-2 text-xs"
                  >
                    <StatusDot status={e.status} />
                    <span className="w-40 shrink-0 text-muted-foreground">
                      {new Date(e.at).toLocaleString()}
                    </span>
                    <StatusBadge status={e.status} />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {e.message ??
                        (e.value !== undefined ? `value=${e.value}` : '')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="text-[11px] text-muted-foreground">
          Created {new Date(monitor.createdAt).toLocaleString()} · Updated{' '}
          {new Date(monitor.updatedAt).toLocaleString()} · Last triggered{' '}
          {formatRelative(monitor.lastTriggeredAt)}
        </div>
      </div>
    </div>
  );
};

export const MonitorForm: React.FC<{
  initial?: MonitorView | null;
  onCancel: () => void;
  onSave: (draft: Partial<MonitorView>) => void;
}> = ({ initial, onCancel, onSave }) => {
  const [type, setType] = useState<MonitorType>(initial?.type ?? 'metric');
  const [name, setName] = useState(initial?.name ?? '');
  const [query, setQuery] = useState(initial?.query ?? '');
  const [aggregation, setAggregation] = useState<Aggregation>(
    initial?.aggregation ?? 'avg',
  );
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
    new Set(initial?.targets ?? ['slack']),
  );

  const canSave = name.trim() && query.trim() && threshold.trim();

  const toggleTarget = (t: NotificationTarget) => {
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b p-4 pr-12">
        <div>
          <h2 className="text-base font-semibold">
            {initial ? 'Edit monitor' : 'New monitor'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {initial
              ? `Editing ${initial.name}`
              : 'Define a query, a threshold, and who to notify.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!canSave}
            onClick={() =>
              onSave({
                type,
                name: name.trim(),
                query: query.trim(),
                aggregation,
                groupBy: groupBy
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
                comparator,
                threshold: Number(threshold),
                warnThreshold: warnThreshold
                  ? Number(warnThreshold)
                  : undefined,
                evaluationWindow,
                message,
                targets: Array.from(targets),
              })
            }
          >
            {initial ? 'Save' : 'Create monitor'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Type + name */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr]">
              <div>
                <label className="mb-1.5 block text-xs font-medium">Type</label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as MonitorType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="log">Log</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Name</label>
                <Input
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
          </CardContent>
        </Card>

        {/* Query */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Query</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                {type === 'metric'
                  ? 'Metric query'
                  : type === 'log'
                    ? 'Log query'
                    : 'Query'}
              </label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  type === 'metric'
                    ? 'avg(last_5m):avg:http.response_time{service:backend-service} by {host} > 0.5'
                    : type === 'log'
                      ? 'logs("status:error service:backend-service").rollup("count").last("5m") > 50'
                      : '12345678 && 12345679'
                }
                className="font-mono text-xs"
              />
            </div>

            {type === 'metric' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium">
                    Aggregation
                  </label>
                  <Select
                    value={aggregation}
                    onValueChange={(v) => setAggregation(v as Aggregation)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        ['avg', 'sum', 'min', 'max', 'count'] as Aggregation[]
                      ).map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium">
                    Group by{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional, comma-separated)
                    </span>
                  </label>
                  <Input
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    placeholder="host.name, service.version"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Condition */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alert condition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <span className="pb-2 text-xs text-muted-foreground">
                Trigger when the value is
              </span>
              <div className="w-40">
                <Select
                  value={comparator}
                  onValueChange={(v) => setComparator(v as Comparator)}
                >
                  <SelectTrigger>
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
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="500"
                />
              </div>
              <span className="pb-2 text-xs text-muted-foreground">over</span>
              <div className="w-28">
                <Input
                  value={evaluationWindow}
                  onChange={(e) => setEvaluationWindow(e.target.value)}
                  placeholder="5m"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t pt-3">
              <div className="w-40">
                <label className="mb-1.5 block text-xs font-medium">
                  Warn threshold{' '}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <Input
                  type="number"
                  value={warnThreshold}
                  onChange={(e) => setWarnThreshold(e.target.value)}
                  placeholder="300"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notify */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Message
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="{{#is_alert}}Checkout latency is {{value}}s (threshold {{threshold}}s).{{/is_alert}} @slack-backend-alerts"
                className="font-mono text-xs"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Supports Datadog template syntax:{' '}
                <code>{'{{#is_alert}}…{{/is_alert}}'}</code>,{' '}
                <code>{'{{value}}'}</code>, <code>{'{{threshold}}'}</code>,{' '}
                <code>{'{{host.name}}'}</code>, plus <code>@slack-…</code>,{' '}
                <code>@pagerduty-…</code>, and email handles.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Targets
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'slack',
                    'email',
                    'pagerduty',
                    'webhook',
                  ] as NotificationTarget[]
                ).map((t) => {
                  const on = targets.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTarget(t)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        on
                          ? 'border-transparent bg-accent text-accent-foreground'
                          : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60'
                      }`}
                    >
                      <TargetIcon target={t} />
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
