import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function TelemetryWidget({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      data-slot="telemetry-widget"
      className={cn(
        'min-w-0 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-none [&>[data-slot=card-header]]:p-0 [&>[data-slot=card-header]]:pb-3 [&>[data-slot=card-content]]:p-0',
        className,
      )}
    />
  );
}

export function TelemetryGrid({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3', className)} />;
}
