import { Button } from '@/components/ui/button';
import type { CanonicalMonitor } from '../canonical';
import { AlertHistory } from './alert-history';

interface Props {
  monitor: CanonicalMonitor;
  muted: boolean;
  evaluating: boolean;
  onEdit: () => void;
  onClose: () => void;
  onMute: () => void;
  onEvaluate: () => void;
}

export function CanonicalMonitorDetail({ monitor, muted, evaluating, onEdit, onClose, onMute, onEvaluate }: Props) {
  const current = monitor.runtime;
  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-semibold">{monitor.name}</h2>
          <p className="text-sm text-muted-foreground">{monitor.signal_type} · {monitor.aggregation} · {monitor.window_seconds}s</p></div>
        <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </header>
      <section className="space-y-2 rounded-md border p-4 text-sm">
        <p className="font-medium">{!monitor.enabled ? 'Disabled' : !current ? 'Awaiting evaluation'
          : current.operational_status !== 'OK' ? current.operational_status.replace('_', ' ') : current.state}</p>
        {current?.value != null && <p>{current.estimated ? '≈ ' : ''}{current.value} {current.unit}</p>}
        {current?.error && <p>{current.error}</p>}
        {current?.checked_at && <p>Last evaluated {new Date(current.checked_at).toLocaleString()}</p>}
        <p>Threshold {monitor.comparator} {monitor.threshold}</p>
        <p className="break-all font-mono text-xs">{monitor.query || '*'}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>Edit monitor</Button>
          <Button size="sm" variant="outline" onClick={onMute}>{muted ? 'Unmute' : 'Mute for 1 hour'}</Button>
          <Button size="sm" variant="outline" disabled={evaluating || !monitor.enabled} onClick={onEvaluate}>Evaluate now</Button>
        </div>
      </section>
      <h3 className="font-medium">Alert history</h3>
      <AlertHistory key={monitor.id} monitorId={monitor.id} />
    </div>
  );
}
