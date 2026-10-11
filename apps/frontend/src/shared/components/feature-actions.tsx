import type { ReactNode } from 'react';
import { Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react';
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
  generating: boolean;
  onGenerate: () => void;
  children?: ReactNode;
};

export function TelemetryActions({
  connected,
  generating,
  onGenerate,
  children,
  ...refresh
}: TelemetryActionsProps) {
  const Icon = connected ? Wifi : WifiOff;
  return (
    <>
      <span
        role="status"
        className="hidden flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Icon className={cn('size-4', connected && 'text-success')} />
        {connected ? 'Stream connected' : 'Stream disconnected'}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onGenerate}
        disabled={generating}
      >
        <Activity className="size-4" />
        {generating ? 'Generating…' : 'Generate telemetry'}
      </Button>
      <FeatureRefreshButton {...refresh} />
      {children}
    </>
  );
}
