import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function PageLayout({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'w-full min-w-0 space-y-6 bg-background p-4 text-foreground lg:p-6',
        className,
      )}
    />
  );
}
