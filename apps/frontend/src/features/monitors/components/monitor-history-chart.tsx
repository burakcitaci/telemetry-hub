import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonitorSeries } from '../model';
import { historyInRange } from '../history-range';

const number = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
const time = (value: number) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function MonitorHistoryChart({ series, range, bucketMs }: { series: MonitorSeries; range?: { from: number; to: number }; bucketMs?: number }) {
  const data = range ? historyInRange(series, range.from, range.to, bucketMs ? bucketMs * 1.5 : undefined) : series.points.filter(point => Number.isFinite(point.t))
    .map(point => ({ t: point.t, value: Number.isFinite(point.v) ? point.v : null })).sort((a, b) => a.t - b.t);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <figure className="min-w-0 space-y-3" aria-label="Monitor evaluation history">
    <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>Evaluated value{series.unit ? ` (${series.unit})` : ''}</span>
      <span>{bucketMs ? 'Bucket end time' : 'Evaluation time'} · {zone}</span>
    </figcaption>
    <div className="relative h-56 w-full text-xs" role="img" aria-label={`Evaluated value${series.unit ? ` in ${series.unit}` : ''} over evaluation time. Gaps indicate missing data.`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 8, left: 4 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="t" type="number" domain={range ? [range.from, range.to] : ['dataMin', 'dataMax']} allowDataOverflow tickFormatter={time} minTickGap={48}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'inherit' }} tickLine={false} axisLine={false} />
          <YAxis width={64} tickFormatter={number} domain={['auto', 'auto']}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'inherit' }} tickLine={false} axisLine={false} />
          <Tooltip labelFormatter={value => new Date(Number(value)).toLocaleString()}
            formatter={value => [value == null ? 'No data' : `${number(Number(value))}${series.unit ? ` ${series.unit}` : ''}`, 'Evaluated value']}
            contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12, boxShadow: 'none' }} />
          <ReferenceLine y={series.threshold} ifOverflow="extendDomain" stroke="hsl(var(--destructive))" strokeDasharray="5 4" />
          {series.warnThreshold !== undefined && <ReferenceLine y={series.warnThreshold} ifOverflow="extendDomain" stroke="hsl(var(--warning))" strokeDasharray="5 4" />}
          <Line dataKey="value" type="linear" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls={false}
            dot={{ r: 2, fill: 'hsl(var(--primary))', strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      {!data.some(point => point.value !== null) && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No evaluated data in this range</p>}
    </div>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <span className="flex items-center gap-2"><span className="w-5 border-t-2 border-primary" />Evaluated value</span>
      <span className="flex items-center gap-2"><span className="w-5 border-t border-dashed border-destructive" />Critical: {number(series.threshold)} {series.unit}</span>
      {series.warnThreshold !== undefined && <span className="flex items-center gap-2"><span className="w-5 border-t border-dashed border-warning" />Warning: {number(series.warnThreshold)} {series.unit}</span>}
    </div>
    <p className="text-xs text-muted-foreground">{bucketMs ? `Historical telemetry, aggregated into ${Math.round(bucketMs / 60_000)}-minute buckets using the current rule. The final bucket may be partial. This view does not fire alerts.` : 'Each point is one saved rule evaluation. Gaps indicate missing data or failed evaluations.'}</p>
  </figure>;
}
