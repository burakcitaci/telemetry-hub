import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function PageLayout({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        className,
        'p-3 lg:p-4 w-full min-w-0 space-y-4 bg-background min-h-screen text-foreground',
      )}
    />
  );
}
