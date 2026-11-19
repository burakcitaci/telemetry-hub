import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const Icon = paused ? Pause : connected ? Wifi : WifiOff;
  const toggleLabel = t(paused ? 'explorer.resumeLive' : 'explorer.pauseLive');
  return (
    <>
      <span
        role="status"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Icon className={cn('size-4', connected && !paused && 'text-success')} />
        {t(paused ? 'explorer.livePaused' : connected ? 'explorer.liveConnected' : 'explorer.liveDisconnected')}
      </span>
      {onPausedChange && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onPausedChange(!paused)}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </Button>
      )}
      <FeatureRefreshButton {...refresh} />
      {children}
    </>
  );
}
