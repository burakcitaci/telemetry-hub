import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirmAction } from '@/shared/components/confirm-action';
import { api } from '@/shared/api/client';
import { FeatureHeader } from '@/shared/components/feature-header';
import { QueryError } from '@/shared/components/view-skeleton';
import { ActionFeedback } from './admin-layout';
import { FIELD, type Team } from './presentation';
import { useAdminAction, useAdminList } from './use-admin-data';

interface WindowRecord {
  id: string; name: string; team_id?: string; service?: string;
  starts_at: string; ends_at: string; cancelled_at?: string;
}
const endpoint = '/admin/maintenance';

export function MaintenancePanel() {
  const [params] = useSearchParams();
  const windows = useAdminList<WindowRecord>(endpoint);
  const teams = useAdminList<Team>('/admin/teams');
  const action = useAdminAction('Maintenance could not be updated.');
  const { confirmAction, confirmation } = useConfirmAction();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function schedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    await action.execute(async () => {
      await api.post(endpoint, {
        name: fields.get('name'), team_id: fields.get('team_id') || undefined,
        service: fields.get('service') || undefined,
        starts_at: new Date(String(fields.get('starts_at'))).toISOString(),
        ends_at: new Date(String(fields.get('ends_at'))).toISOString(),
      });
      form.reset();
      await windows.reload();
    });
  }

  async function cancel(item: WindowRecord) {
    if (!(await confirmAction('Cancel maintenance window “' + item.name + '”?'))) return;
    await action.execute(async () => {
      await api.post(endpoint + '/' + encodeURIComponent(item.id) + '/cancel');
      await windows.reload();
    });
  }

  return <>
    <FeatureHeader title="Maintenance windows"
      description="Pause alert delivery for a team or service. Evaluations and history continue." />
    <ActionFeedback error={action.error} saved={action.saved} />
    {teams.error && <QueryError message={teams.error} onRetry={teams.reload} isRetrying={teams.loading} />}
    {teams.rows && <ScheduleForm teams={teams.rows} initialTeam={params.get('teamId') ?? ''} busy={action.busy}
      onSubmit={event => void schedule(event)} />}
    {windows.error && <QueryError message={windows.error} onRetry={windows.reload} isRetrying={windows.loading} />}
    {!windows.rows && windows.loading && <p role="status">Loading maintenance windows…</p>}
    {windows.rows && <MaintenanceList items={windows.rows} now={now} busy={action.busy} onCancel={item => void cancel(item)} />}
    {confirmation}
  </>;
}

function ScheduleForm({ teams, initialTeam, busy, onSubmit }: { teams: Team[]; initialTeam: string; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit} className="rounded-lg border p-4">
    <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-3 font-semibold">Schedule a window</legend>
      <label className="text-sm sm:col-span-2">Name<Input name="name" required maxLength={120} /></label>
      <label className="text-sm">Team<select name="team_id" defaultValue={initialTeam} className={FIELD + ' block h-9 px-2'}>
        <option value="">Any team</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select></label>
      <label className="text-sm">Service<Input name="service" maxLength={255} placeholder="Any service" /></label>
      <label className="text-sm">Start (local time)<Input name="starts_at" type="datetime-local" required /></label>
      <label className="text-sm">End (local time)<Input name="ends_at" type="datetime-local" required /></label>
      <Button type="submit" className="justify-self-start">Schedule maintenance</Button>
    </fieldset>
  </form>;
}

function MaintenanceList({ items, now, busy, onCancel }: { items: WindowRecord[]; now: number; busy: boolean; onCancel: (item: WindowRecord) => void }) {
  return <section className="space-y-1 rounded-lg border p-4">
    <h2 className="font-semibold">Windows</h2>
    {!items.length && <p className="text-sm text-muted-foreground">No maintenance windows yet.</p>}
    <ul className="divide-y">{items.map(item => {
      const ended = Date.parse(item.ends_at) <= now;
      const status = item.cancelled_at ? 'Cancelled' : ended ? 'Ended' : Date.parse(item.starts_at) <= now ? 'Active' : 'Scheduled';
      return <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
        <div><strong>{item.name}</strong> · {status}<p className="text-muted-foreground">
          {[item.team_id, item.service, new Date(item.starts_at).toLocaleString() + ' – ' + new Date(item.ends_at).toLocaleString()].filter(Boolean).join(' · ')}
        </p></div>
        {!item.cancelled_at && !ended && <Button size="sm" variant="outline" disabled={busy} onClick={() => onCancel(item)}>Cancel window</Button>}
      </li>;
    })}</ul>
  </section>;
}
