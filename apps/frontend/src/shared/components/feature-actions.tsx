import type { ReactNode } from 'react';
import { Pause, Play, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type RefreshProps = { onRefresh: () => void; loading: boolean; label: string };

export function FeatureRefreshButton({
  onRefresh,
  loading,
  label,
}: RefreshProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={onRefresh}
      disabled={loading}
      aria-label={label}
      title={label}
    >
      <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
    </Button>
  );
}

type TelemetryActionsProps = RefreshProps & {
  connected: boolean;
  paused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  children?: ReactNode;
};

export function TelemetryActions({
  connected,
  paused = false,
  onPausedChange,
  children,
  ...refresh
}: TelemetryActionsProps) {
  const Icon = paused ? Pause : connected ? Wifi : WifiOff;
  return (
    <>
      <span
        role="status"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Icon className={cn('size-4', connected && !paused && 'text-success')} />
        {paused
          ? 'Updates paused'
          : connected
            ? 'Stream connected'
            : 'Stream disconnected'}
      </span>
      {onPausedChange && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onPausedChange(!paused)}
          aria-label={paused ? 'Resume live updates' : 'Pause live updates'}
          title={paused ? 'Resume live updates' : 'Pause live updates'}
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </Button>
      )}
      <FeatureRefreshButton {...refresh} />
      {children}
    </>
  );
}
