import type { MonitorSeries, MonitorStatus } from '../model';
import { MonitorHistoryChart } from './monitor-history-chart';

type Point = MonitorSeries['points'][number];
type Projection = (value: number) => number;

function projections(series: MonitorSeries) {
  const { points, threshold, warnThreshold } = series;
  const finite = points.filter(point => Number.isFinite(point.v));
  const low = Math.min(...finite.map(point => point.v), threshold, warnThreshold ?? threshold);
  const high = Math.max(...finite.map(point => point.v), threshold, warnThreshold ?? threshold);
  const pad = (high - low) * 0.1 || 1;
  const yMin = low - pad, yMax = high + pad;
  const tMin = points[0].t, tMax = points[points.length - 1].t;
  return { x: (t: number) => ((t - tMin) / (tMax - tMin || 1)) * 100,
    y: (v: number) => 2 + (1 - (v - yMin) / (yMax - yMin || 1)) * 24 };
}

function segments(points: Point[], x: Projection, y: Projection) {
  const paths: string[] = [];
  let current = '';
  for (const point of points) {
    if (!Number.isFinite(point.v)) {
      if (current) paths.push(current);
      current = '';
      continue;
    }
    const command = current ? 'L' : 'M';
    current += command + x(point.t).toFixed(1) + ',' + y(point.v).toFixed(1) + ' ';
  }
  if (current) paths.push(current);
  return paths;
}

function strokeFor(status: MonitorStatus) {
  const token = status === 'Alert' ? 'destructive' : status === 'Warn' ? 'warning'
    : status === 'No Data' ? 'primary' : status === 'OK' ? 'success' : 'muted-foreground';
  return 'hsl(var(--' + token + '))';
}

function Threshold({ y, warning = false }: { y: number; warning?: boolean }) {
  return <line x1={0} x2={100} y1={y} y2={y}
    stroke={warning ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
    strokeWidth={0.75} strokeDasharray="2 2" opacity={0.5} />;
}

function NoData({ compact }: { compact: boolean }) {
  if (!compact) return <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
    No data in range
  </div>;
  return <svg viewBox="0 0 100 28" className="w-full" style={{ height: 28 }}>
    <line x1={0} x2={100} y1={14} y2={14} stroke="hsl(var(--border))"
      strokeWidth={1} strokeDasharray="3 3" />
  </svg>;
}

function CompactGraph({ series, status }: { series: MonitorSeries; status: MonitorStatus }) {
  const { x, y } = projections(series);
  return <svg viewBox="0 0 100 28" className="w-full" style={{ height: 28 }}>
    {series.warnThreshold !== undefined && <Threshold y={y(series.warnThreshold)} warning />}
    <Threshold y={y(series.threshold)} />
    {segments(series.points, x, y).map((d, index) => <path key={index} d={d}
      fill="none" stroke={strokeFor(status)} strokeWidth={1.25} />)}
    {series.hasGap && series.gapStart && series.gapEnd && <rect x={x(series.gapStart)} y={0}
      width={x(series.gapEnd) - x(series.gapStart)} height={28}
      fill="hsl(var(--primary))" opacity={0.1} />}
  </svg>;
}

export function MonitorGraph({ series, status, compact = false }: {
  series: MonitorSeries; status: MonitorStatus; height?: number; compact?: boolean;
}) {
  if (!series.points.some(point => Number.isFinite(point.v))) return <NoData compact={compact} />;
  return compact ? <CompactGraph series={series} status={status} /> : <MonitorHistoryChart series={series} />;
}
