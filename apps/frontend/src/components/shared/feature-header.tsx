import type { ComponentProps, ReactNode } from 'react';
import { TimeRangePicker } from '@/app/components/timer-range.picker';
import { cn } from '@/lib/utils';

type TimeRangeProps = ComponentProps<typeof TimeRangePicker>;

export interface FeatureHeaderProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  timeRange: TimeRangeProps['value'];
  onTimeRangeChange: TimeRangeProps['onChange'];
  className?: string;
}

export function FeatureHeader({ title, description, children, actions, timeRange, onTimeRangeChange, className }: FeatureHeaderProps) {
  return (
    <header className={cn('relative z-20 grid shrink-0 grid-cols-1 items-center gap-4 border-b border-border bg-background px-4 py-3 text-foreground lg:px-6 xl:grid-cols-[minmax(12rem,auto)_minmax(0,1fr)_auto]', className)}>
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
        <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} />
        {actions}
      </div>
    </header>
  );
}
