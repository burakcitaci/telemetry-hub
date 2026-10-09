import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TelemetryWidget } from './telemetry-widget';

interface ViewSkeletonProps {
  variant?: 'cards' | 'list';
  showHeader?: boolean;
  label?: string;
  className?: string;
}

export function ViewSkeleton({
  variant = 'cards',
  showHeader = true,
  label = 'Ansicht wird geladen…',
  className,
}: ViewSkeletonProps) {
  return (
    <section
      role="status"
      aria-busy="true"
      className={cn(
        'space-y-4 text-foreground',
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-4">
        {showHeader && (
          <Skeleton className="h-16 w-full rounded-xl motion-reduce:animate-none" />
        )}
        <div
          className={cn(
            'grid grid-cols-1 gap-3',
            variant === 'cards' && 'sm:grid-cols-2 lg:grid-cols-4',
          )}
        >
          {[0, 1, 2, 3].map((index) => (
            <TelemetryWidget
              key={index}
            >
              <Skeleton
                className={cn(
                  'w-full motion-reduce:animate-none',
                  variant === 'cards' ? 'h-32' : 'h-6',
                )}
              />
            </TelemetryWidget>
          ))}
        </div>
      </div>
    </section>
  );
}

interface QueryErrorProps {
  onRetry: () => void | Promise<unknown>;
  isRetrying?: boolean;
  title?: string;
  message?: string;
  className?: string;
}

/** Retry progress and API errors stay owned by the query/controller. */
export function QueryError({
  onRetry,
  isRetrying = false,
  title = 'Daten konnten nicht geladen werden',
  message = 'Bitte versuche es erneut.',
  className,
}: QueryErrorProps) {
  return (
    <Alert
      variant="destructive"
      aria-busy={isRetrying}
      className={cn('rounded-xl bg-background', className)}
    >
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRetrying}
          onClick={() => void onRetry()}
          className="mt-3 text-foreground"
        >
          <RefreshCw
            aria-hidden="true"
            className={cn(
              'h-4 w-4',
              isRetrying && 'animate-spin motion-reduce:animate-none',
            )}
          />
          {isRetrying ? 'Wird erneut geladen…' : 'Wiederholen'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
