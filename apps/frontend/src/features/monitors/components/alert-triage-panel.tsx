import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api, unwrap } from '@/shared/api/client';
import { getErrorMessage } from '@/shared/lib/errors';

export interface AlertTriage {
  version: number;
  acknowledgment?: { by: string; at: string };
  assignee?: { id: string; email: string };
  notes: { by: string; at: string; text: string }[];
}

interface Details {
  triage: AlertTriage;
  self?: string;
  assignees: { id: string; email: string }[];
}

type TriageChange = { action: 'acknowledge' } | { action: 'assign'; assignee_id: string | null } | { action: 'note'; note: string };

export function AlertTriagePanel({ id, admin, onChange }: { id: string; admin: boolean; onChange: (triage: AlertTriage) => void }) {
  const [details, setDetails] = useState<Details>();
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const endpoint = '/alerts/' + encodeURIComponent(id) + '/triage';

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    api.get(endpoint, { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setDetails(unwrap(response.data));
    }).catch(cause => {
      if (!controller.signal.aborted) setError(getErrorMessage(cause, 'Could not load alert triage.'));
    });
    return () => controller.abort();
  }, [endpoint, revision]);

  async function update(change: TriageChange) {
    if (pending.current || !details) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await api.patch(endpoint, { ...change, version: details.triage.version });
      const triage = unwrap<AlertTriage>(response.data);
      setDetails({ ...details, triage });
      onChange(triage);
      if (change.action === 'note') setDraft('');
    } catch (cause) { setError(getErrorMessage(cause, 'Could not update alert triage.')); }
    finally { pending.current = false; setBusy(false); }
  }

  const current = details?.triage;
  const self = details?.self;
  return <section className="w-full space-y-3 rounded-md border p-3" aria-label="Alert triage">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!details && !error && <p role="status">Loading alert triage…</p>}
    {current && details && <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={busy || !!current.acknowledgment} onClick={() => void update({ action: 'acknowledge' })}>
          {current.acknowledgment ? 'Acknowledged' : 'Acknowledge'}
        </Button>
        {!admin && self && (!current.assignee || current.assignee.id === self) && <Button size="sm" variant="outline" disabled={busy}
          onClick={() => void update({ action: 'assign', assignee_id: current.assignee ? null : self })}>
          {current.assignee ? 'Release alert' : 'Assign to me'}
        </Button>}
        {admin && <form key={current.version} className="flex flex-wrap items-end gap-2" onSubmit={event => {
          event.preventDefault();
          const assignee = String(new FormData(event.currentTarget).get('assignee') ?? '');
          void update({ action: 'assign', assignee_id: assignee || null });
        }}>
          <label className="text-xs">Assignee
            <select className="block h-8 w-full rounded-md border bg-background px-2" name="assignee" defaultValue={current.assignee?.id ?? ''}>
              <option value="">Unassigned</option>
              {current.assignee && !details.assignees.some(user => user.id === current.assignee?.id)
                && <option value={current.assignee.id}>{current.assignee.email} (previous member)</option>}
              {details.assignees.map(user => <option key={user.id} value={user.id}>{user.email}</option>)}
            </select>
          </label>
          <Button size="sm" variant="outline" disabled={busy} type="submit">Save assignee</Button>
        </form>}
      </div>
      <form className="space-y-2" onSubmit={event => { event.preventDefault(); void update({ action: 'note', note: draft }); }}>
        <label className="block text-xs">Investigation note
          <Textarea maxLength={1000} value={draft} onChange={event => setDraft(event.target.value)} />
        </label>
        <Button size="sm" variant="outline" type="submit" disabled={busy || !draft.trim()}>Add note</Button>
      </form>
      {!!current.notes.length && <ul aria-label="Investigation notes" className="divide-y">{current.notes.map((note, index) =>
        <li key={index} className="space-y-1 py-2"><p className="text-xs text-muted-foreground">{note.by} · {new Date(note.at).toLocaleString()}</p>
          <p className="whitespace-pre-wrap break-words">{note.text}</p></li>)}</ul>}
    </>}
    {error && <Button size="sm" variant="outline" disabled={busy} onClick={() => setRevision(value => value + 1)}>Reload triage</Button>}
  </section>;
}
