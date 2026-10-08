import React from 'react';
import { Card } from '@/components/ui/card';
import { Series, formatValue } from '@/features/metrics/model';

export const MetricStatCard: React.FC<{
  label: string;
  value: string;
  change?: number;
  color?: string;
}> = ({ label, value, change, color = 'text-foreground' }) => (
  <Card className="p-4">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {label}
    </p>
    <div className="mt-1 flex items-baseline gap-2">
      <p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      {change !== undefined && Number.isFinite(change) && (
        <span
          className={`text-xs font-medium ${change >= 0 ? 'text-success' : 'text-destructive'}`}
        >
          {change >= 0 ? '+' : ''}
          {change.toFixed(2)}%
        </span>
      )}
    </div>
  </Card>
);

export const CustomTooltip: React.FC<any> = ({
  active,
  payload,
  label,
  unit,
}) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort(
    (a, b) => Number(b.value ?? -Infinity) - Number(a.value ?? -Infinity),
  );
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-lg max-h-80 overflow-y-auto">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {sorted.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 shrink-0 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground truncate max-w-[200px]">
            {entry.name}:
          </span>
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

export const SeriesLegend: React.FC<{
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
              style={{
                backgroundColor: off ? 'hsl(var(--muted-foreground))' : s.color,
              }}
            />
            <span className="font-mono truncate max-w-[180px]">{s.label}</span>
            <span className="text-[10px] text-muted-foreground">
              ({s.data.length})
            </span>
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
