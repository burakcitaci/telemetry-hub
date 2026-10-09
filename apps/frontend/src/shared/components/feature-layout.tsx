import type { ComponentProps, ReactNode } from 'react';
import { PanelLeft, Search, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type LayoutProps = ComponentProps<'div'>;

export function FeaturePage({ className, ...props }: LayoutProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground',
        className,
      )}
      {...props}
    />
  );
}

type HeaderProps = {
  title: string;
  icon: LucideIcon;
  description?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
};

export function FeatureHeader({
  title,
  icon: Icon,
  description,
  leading,
  actions,
}: HeaderProps) {
  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-border bg-background px-4 py-3 lg:px-6 xl:flex-row xl:items-center">
      <div className="flex min-h-10 min-w-0 flex-1 items-center gap-3">
        {leading && (
          <div className="flex shrink-0 items-center gap-1">{leading}</div>
        )}
        <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
          {description && (
            <div className="truncate text-xs text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex min-h-9 max-w-full flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

export function FeatureBody({ className, ...props }: LayoutProps) {
  return (
    <div
      className={cn('flex min-h-0 min-w-0 flex-1 overflow-hidden', className)}
      {...props}
    />
  );
}

export function FeatureContent({
  className,
  ...props
}: ComponentProps<'section'>) {
  return (
    <section
      data-slot="feature-content"
      className={cn(
        'min-h-0 min-w-0 flex-1 overflow-auto p-4 lg:p-6',
        className,
      )}
      {...props}
    />
  );
}

export function FeaturePanel({
  className,
  ...props
}: ComponentProps<typeof Card>) {
  return (
    <Card className={cn('@container overflow-hidden shadow-none', className)} {...props} />
  );
}

type SidebarProps = {
  title: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function FeaturePanelHeader({
  className,
  ...props
}: ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader
      className={cn(
        'flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3',
        className,
      )}
      {...props}
    />
  );
}

export function FeatureSidebar({
  title,
  children,
  open = true,
  onOpenChange,
}: SidebarProps) {
  return (
    <aside
      aria-label={title}
      className={cn(
        'hidden min-h-0 shrink-0 flex-col border-r border-border bg-muted/30 md:flex',
        open ? 'w-64' : 'w-12',
      )}
    >
      <div
        className={cn(
          'flex h-11 shrink-0 items-center border-b border-border px-3',
          open ? 'justify-between' : 'justify-center px-0',
        )}
      >
        {open && (
          <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
        )}
        {onOpenChange && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`${open ? 'Hide' : 'Show'} ${title}`}
            aria-expanded={open}
            onClick={() => onOpenChange(!open)}
          >
            <PanelLeft className="size-4" />
          </Button>
        )}
      </div>
      {open && (
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      )}
    </aside>
  );
}

export function FeatureLoading() {
  return (
    <div role="status" aria-label="Loading data" className="space-y-3 p-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function FeatureEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function FeatureSearch({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        aria-label={props['aria-label'] ?? props.placeholder ?? 'Search'}
        className={cn('pl-9', className)}
        {...props}
      />
    </div>
  );
}
