import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/shared/api/client';
import { FeatureHeader } from '@/shared/components/feature-header';
import { QueryError } from '@/shared/components/view-skeleton';
import { ActionFeedback } from './admin-layout';
import { useAdminAction, useAdminResource } from './use-admin-data';
import type { Team, User } from './presentation';

interface Overview {
  team: Team;
  members: User[];
  services: string[];
  monitors: { id: string; name: string; enabled: boolean; state?: string; firing: boolean }[];
  ingestion_keys: { id: string; name: string; env?: string; expiresAt: number; revokedAt?: number }[];
}
interface Routing {
  destination: string | null;
  options: string[];
  tests: { id: string; destination: string; at: string; status: string }[];
}
const blockStyle = 'min-w-0 space-y-3 rounded-lg border border-border bg-card p-4 text-card-foreground';
const linkStyle = 'break-words text-sm underline underline-offset-4';

export function TeamOverview() {
  const { teamId = '' } = useParams();
  return <TeamResource key={teamId} teamId={teamId} />;
}

function TeamResource({ teamId }: { teamId: string }) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const base = '/org/' + session?.tenantSlug;
  const path = '/admin/teams/' + encodeURIComponent(teamId);
  const overview = useAdminResource<Overview>(path + '/overview');
  if (overview.error) return <QueryError title="Team overview could not be loaded" message={overview.error}
    onRetry={overview.reload} isRetrying={overview.loading} />;
  if (!overview.data) return <p role="status">{t('admin.loading')}</p>;
  return <TeamSummary key={teamId} overview={overview.data} path={path} base={base} />;
}

function TeamSummary({ overview, path, base }: { overview: Overview; path: string; base: string }) {
  const { team, members, services, monitors, ingestion_keys } = overview;
  const teamQuery = new URLSearchParams({ team: team.id });
  const memberQuery = new URLSearchParams({ teamId: team.id });
  const createQuery = new URLSearchParams({ team: team.id, new: '1' });
  const active = monitors.filter(monitor => monitor.firing);
  const monitorLink = (monitor: { id: string; name: string }) => <Link className={linkStyle}
    to={base + '/monitors?' + new URLSearchParams({ team: team.id, id: monitor.id })}>{monitor.name}</Link>;
  return <>
    <FeatureHeader title={team.name} description={team.id} actions={<Button asChild>
      <Link to={base + '/monitors?' + createQuery}>New monitor</Link></Button>}>
      <Link className={linkStyle} to={base + '/admin/teams'}>All teams</Link>
      <Link className={linkStyle} to={base + '/admin/users?' + memberQuery}>Manage members</Link>
      <Link className={linkStyle} to={base + '/admin/maintenance?' + memberQuery}>Schedule maintenance</Link>
    </FeatureHeader>
    <div className="grid items-start gap-3 md:grid-cols-2">
      <Entries title="Members" entries={members.map(member => ({ id: member.id, content: member.email + ' · ' + member.role }))} />
      <Entries title="Owned services" entries={services.map(service => ({ id: service, content:
        <Link className={linkStyle} to={base + '/services/' + encodeURIComponent(service) + '?' + teamQuery}>{service}</Link> }))} />
      <Entries title="Monitors" entries={monitors.map(monitor => ({ id: monitor.id, content: <>
        {monitorLink(monitor)} <span className="text-muted-foreground">· {monitor.enabled ? monitor.state ?? 'Pending' : 'Disabled'}</span>
      </> }))} />
      <Entries title="Active alerts" entries={active.map(monitor => ({ id: monitor.id, content: <Link className={linkStyle}
          to={base + "/alerts?" + new URLSearchParams({ team: team.id, monitor: monitor.id })}>{monitor.name}</Link> }))}
        footer={<Link className={linkStyle} to={base + '/alerts?' + teamQuery}>Open team alert history</Link>} />
      <Entries title="Ingestion keys" entries={ingestion_keys.map(key => ({ id: key.id, content: <>
        {key.name} <span className="text-muted-foreground">· {key.revokedAt ? 'Revoked' : key.expiresAt <= Date.now() ? 'Expired' : 'Active'}
          {key.env && ' · ' + key.env}</span>
      </> }))} footer={<Link className={linkStyle} to={base + '/admin/ingestion-keys?' + memberQuery}>Manage ingestion keys</Link>} />
      <RoutingPanel endpoint={path + '/notifications'} />
    </div>
  </>;
}

function Entries({ title, entries, footer }: { title: string; entries: { id: string; content: React.ReactNode }[]; footer?: React.ReactNode }) {
  return <section className={blockStyle}>
    <h2 className="font-semibold">{title}</h2>
    {entries.length ? <ul className="space-y-2 text-sm">{entries.map(item => <li key={item.id} className="break-words">{item.content}</li>)}</ul>
      : <p className="text-sm text-muted-foreground">None</p>}
    {footer}
  </section>;
}

function RoutingPanel({ endpoint }: { endpoint: string }) {
  const routing = useAdminResource<Routing>(endpoint);
  const action = useAdminAction('Notification settings could not be updated.');
  return <section className={blockStyle}>
    <h2 className="font-semibold">Team notifications</h2>
    {routing.error ? <QueryError message={routing.error} onRetry={routing.reload} isRetrying={routing.loading} />
      : routing.data && <RoutingForm key={routing.data.destination ?? ''} routing={routing.data}
        busy={action.busy} onSave={destination => void action.execute(async () => {
          await api.patch(endpoint, { destination }); await routing.reload();
        })} onTest={() => void action.execute(async () => {
          await api.post(endpoint + '/test'); await routing.reload();
        })} />}
    <ActionFeedback error={action.error} />
  </section>;
}

function RoutingForm({ routing, busy, onSave, onTest }: { routing: Routing; busy: boolean; onSave: (value: string | null) => void; onTest: () => void }) {
  const [selected, setSelected] = useState(routing.destination ?? '');
  const available = !selected || routing.options.includes(selected);
  return <>
    <form onSubmit={event => {
      event.preventDefault();
      if (available) onSave(selected || null);
    }} className="space-y-2">
      <label className="block text-sm">Default destination
        <select name="destination" value={selected} disabled={busy} onChange={event => setSelected(event.target.value)}
          className="mt-1 block h-9 w-full rounded-md border bg-background px-2">
          <option value="">Deployment default</option>
          {routing.destination && !routing.options.includes(routing.destination) && <option value={routing.destination} disabled>{routing.destination} (unavailable)</option>}
          {routing.options.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      {!routing.options.length && <p className="text-xs text-muted-foreground">No named webhook destinations are configured for this organization.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy || !available}>Save routing</Button>
        <Button type="button" size="sm" variant="outline" disabled={busy || !routing.destination || !routing.options.includes(routing.destination)}
          onClick={onTest}>Send test to saved destination</Button>
      </div>
    </form>
    {!!routing.tests.length && <ul className="space-y-1 text-xs" aria-label="Test delivery history">
      {routing.tests.map(receipt => <li key={receipt.id}>{new Date(receipt.at).toLocaleString()} · {receipt.destination} · {receipt.status}</li>)}
    </ul>}
  </>;
}
