import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { api, unwrap } from '@/shared/api/client';
import { AlertTriagePanel, type AlertTriage } from './alert-triage-panel';
import { QueryError } from '@/shared/components/view-skeleton';

type AlertEvent = {
  id: string;
  monitor_id: string;
  monitor_name: string | null;
  signal_type: 'LOG' | 'METRIC' | 'TRACE' | null;
  state: string;
  value: number | null;
  threshold: number | null;
  window_seconds: number | null;
  fired_at: string;
  unit: string | null;
  estimated?: boolean;
  team_id?: string;
  service?: string;
  env?: string;
  notification?: { status: string; reason?: string; destination?: string };
  triage?: AlertTriage;
};
type AlertPage = { items: AlertEvent[]; next_offset: number | null };
const LIMIT = 20;
const routes = { LOG: 'logs', METRIC: 'metrics', TRACE: 'traces' } as const;

function investigationPath(base: string, event: AlertEvent): string | undefined {
  if (!event.signal_type || !event.window_seconds) return undefined;
  const end = Date.parse(event.fired_at);
  if (!Number.isFinite(end)) return undefined;
  const from = new Date(end - event.window_seconds * 1000);
  if (!Number.isFinite(from.getTime())) return undefined;
  const params = new URLSearchParams({ range: from.toISOString() + ' to ' + new Date(end).toISOString() });
  if (event.team_id) params.set('team', event.team_id);
  if (event.service) params.set('globalService', event.service);
  if (event.env) params.set('env', event.env);
  return base + '/' + routes[event.signal_type] + '?' + params;
}

function AlertRow({ event, base }: { event: AlertEvent; base: string }) {
  const { session } = useAuth();
  const [managing, setManaging] = useState(false);
  const [updated, setUpdated] = useState<AlertTriage>();
  const triage = updated ?? event.triage;
  const canTriage = event.state === 'FIRING' && !!event.signal_type
    && (session?.role === 'admin' || !event.team_id || event.team_id === session?.teamId);
  const link = investigationPath(base, event);
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
      <div className="min-w-0 space-y-1">
        <p className="break-words font-medium">{event.monitor_name ?? 'Legacy monitor'} <span
          className={event.state === 'FIRING' ? 'text-destructive' : 'text-muted-foreground'}>· {event.state}</span></p>
        <p className="text-xs text-muted-foreground">
          {[new Date(event.fired_at).toLocaleString(), event.service, event.team_id, event.env].filter(Boolean).join(' · ')}
        </p>
        {event.value != null && <p>{event.estimated ? '≈ ' : ''}{event.value} {event.unit}
          {event.threshold != null && ' · Threshold ' + event.threshold}</p>}
        {event.notification && <p className="text-xs text-muted-foreground">Delivery {event.notification.status}
          {event.notification.destination && ' · ' + event.notification.destination}
          {event.notification.reason && ' · ' + event.notification.reason}</p>}
        {triage?.acknowledgment && <p className="text-xs text-muted-foreground">Acknowledged by {triage.acknowledgment.by}</p>}
        {triage?.assignee && <p className="text-xs text-muted-foreground">Assigned to {triage.assignee.email}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {link && <Button asChild size="sm" variant="outline"><Link to={link}>Investigate</Link></Button>}
        {canTriage && <Button size="sm" variant="outline" aria-expanded={managing} onClick={() => setManaging(value => !value)}>
          {managing ? 'Close triage' : 'Manage alert'}
        </Button>}
      </div>
      {managing && <AlertTriagePanel id={event.id} admin={session?.role === "admin"} onChange={setUpdated} />}
    </li>
  );
}

export function AlertHistory({ monitorId, team }: { monitorId?: string; team?: string }) {
  const { session } = useAuth();
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState<AlertPage>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setPage(undefined);
    setFailed(false);
    api.get('/alerts', { params: { monitor_id: monitorId, team_id: team, limit: LIMIT, offset }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setPage(unwrap(data)); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [monitorId, team, offset, revision]);

  if (failed) return <QueryError title="Alert history could not be loaded"
    message="Try loading the alert history again." onRetry={() => setRevision(value => value + 1)} />;
  if (!page) return <p role="status" className="text-sm text-muted-foreground">Loading alert history…</p>;
  return (
    <section aria-label="Alert history">
      {page.items.length ? <ul className="divide-y">{page.items.map(event =>
        <AlertRow key={event.monitor_id + ':' + event.id} event={event} base={'/org/' + session?.tenantSlug} />)}</ul>
        : <p className="text-sm text-muted-foreground">No alert events on this page.</p>}
      <div className="flex flex-wrap gap-2 py-3">
        {offset > 0 && <Button size="sm" variant="outline" onClick={() => setOffset(Math.max(0, offset - LIMIT))}>Previous</Button>}
        {page.next_offset != null && <Button size="sm" variant="outline" onClick={() => setOffset(page.next_offset!)}>Next</Button>}
        <Button size="sm" variant="outline" onClick={() => setRevision(value => value + 1)}>Refresh alert history</Button>
      </div>
    </section>
  );
}
