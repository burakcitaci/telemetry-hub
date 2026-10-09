import type { ComponentProps } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TelemetryWidget } from './telemetry-widget';

export type TelemetryStatus = 'neutral' | 'success' | 'warning' | 'critical';

const valueColors: Record<TelemetryStatus, string> = {
  neutral: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  critical: 'text-destructive',
};

const badgeColors: Record<TelemetryStatus, string> = {
  neutral: 'border-border/60 bg-muted/30 text-muted-foreground',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  critical: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const statusLabels: Record<TelemetryStatus, string> = {
  neutral: 'Unknown',
  success: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
};

type StatusSpanProps = ComponentProps<'span'> & { status?: TelemetryStatus };

export function DataValue({
  status = 'neutral',
  className,
  ...props
}: StatusSpanProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-block whitespace-nowrap font-mono tabular-nums tracking-tight',
        valueColors[status],
        className,
      )}
    />
  );
}

export function StatusBadge({
  status = 'neutral',
  children,
  className,
  ...props
}: StatusSpanProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide',
        badgeColors[status],
        className,
      )}
    >
      {children ?? statusLabels[status]}
    </span>
  );
}

/** Put content directly inside; CardContent/CardHeader add their own padding. */
export function MetricCard({
  className,
  ...props
}: ComponentProps<typeof Card>) {
  return (
    <TelemetryWidget
      {...props}
      className={cn(
        'min-w-0',
        className,
      )}
    />
  );
}
