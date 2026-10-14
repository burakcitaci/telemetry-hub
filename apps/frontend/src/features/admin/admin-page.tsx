import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, type UserRole } from '@/features/auth/auth-context';
import { api, unwrap } from '@/shared/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QueryError, ViewSkeleton } from '@/components/shared/view-skeleton';

interface Team { id: string; name: string }
interface User { id: string; email: string; role: UserRole; teamId?: string }
const FIELD = 'h-8 rounded-sm border-border bg-background text-xs';
const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-muted-foreground';
const PANEL = 'rounded-sm border border-border bg-card p-5 text-card-foreground';

export default function AdminPage() {
  const { session, refreshSession } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userResponse, teamResponse] = await Promise.all([api.get('/admin/users'), api.get('/admin/teams')]);
      setUsers(unwrap<User[]>(userResponse.data)); setTeams(unwrap<Team[]>(teamResponse.data));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
      throw err;
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);
  useEffect(() => {
    if (session?.role === 'admin') void load().catch(() => undefined);
  }, [session?.role, load]);
  const execute = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); await load(); await refreshSession(); setNotice('Änderungen gespeichert.'); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  if (session?.role !== 'admin') return <Navigate to={`/org/${session?.tenantSlug}/metrics`} replace />;
  if (initialLoading) return <main className="space-y-4 bg-background p-5 md:p-6">
    <p role="status" className="text-xs text-muted-foreground">Loading administration…</p>
    <ViewSkeleton showHeader={false} variant="list" />
  </main>;
  const addTeam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    void execute(async () => { await api.post('/admin/teams', { id: data.get('id'), name: data.get('name') }); form.reset(); });
  };
  const saveUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const values = { email: String(data.get('email')), role: String(data.get('role')),
      teamId: String(data.get('teamId') || ''), password: String(data.get('password') || '') };
    void execute(async () => {
      if (editing) {
        await api.patch(`/admin/users/${editing.id}`, { role: values.role, teamId: values.teamId,
          password: values.password || undefined });
      } else await api.post('/admin/users', { ...values, teamId: values.teamId || undefined });
      setEditing(null); form.reset();
    });
  };
  return <main className="space-y-5 bg-background p-5 md:p-6">
    <div><h1 className="text-lg font-semibold">Organization Administration</h1>
      <p className="mt-1 text-xs text-muted-foreground">{session.tenantSlug} · Benutzer, Teams und Zugangsdaten. Plattformfilter beeinflussen diese Verwaltung nicht.</p></div>
    {error && <QueryError title="Administration could not be loaded" message={error}
      onRetry={() => load().catch(() => undefined)} isRetrying={loading} />}
    {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.6fr]">
      <section className={PANEL}><h2 className="mb-4 text-sm font-semibold">Teams ({teams.length})</h2>
        <form onSubmit={addTeam} className="mb-4 space-y-3">
          <label className="block space-y-1"><span className={LABEL}>Team-Slug</span><Input name="id" required pattern="[a-z0-9][a-z0-9._-]{0,63}" maxLength={64} placeholder="platform" className={FIELD} /></label>
          <label className="block space-y-1"><span className={LABEL}>Team-Name</span><Input name="name" required maxLength={100} placeholder="Platform Engineering" className={FIELD} /></label>
          <Button disabled={busy} size="sm" className="h-8 rounded-sm text-xs">Team erstellen</Button>
        </form>
        <ul className="divide-y divide-border">{teams.map(team => <li key={team.id} className="flex items-center justify-between gap-2 py-2 text-xs">
          <span>{team.name}<span className="ml-2 text-muted-foreground">{team.id}</span></span>
          <Button size="sm" variant="ghost" disabled={busy} className="h-7 text-xs text-destructive" onClick={() => {
            if (confirm(`Team ${team.name} löschen? Bestehende Telemetrie bleibt erhalten.`)) void execute(() => api.delete(`/admin/teams/${encodeURIComponent(team.id)}`));
          }}>Löschen</Button>
        </li>)}</ul>
      </section>
      <section className={PANEL}><h2 className="mb-4 text-sm font-semibold">{editing ? 'Benutzer bearbeiten' : 'Benutzer anlegen'}</h2>
        <form key={editing?.id ?? 'new'} onSubmit={saveUser} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1"><span className={LABEL}>E-Mail</span><Input name="email" type="email" required readOnly={!!editing} defaultValue={editing?.email} maxLength={254} autoComplete="off" className={FIELD} /></label>
          <label className="space-y-1"><span className={LABEL}>{editing ? 'Neues Passwort (optional)' : 'Passwort'}</span><Input name="password" type="password" required={!editing} minLength={12} maxLength={128} autoComplete="new-password" className={FIELD} /></label>
          <label className="space-y-1"><span className={LABEL}>Rolle</span><select name="role" defaultValue={editing?.role ?? 'user'} className={`${FIELD} w-full border px-2`}><option value="user">Member</option><option value="admin">Org-Admin</option></select></label>
          <label className="space-y-1"><span className={LABEL}>Team-Zugehörigkeit</span><select name="teamId" defaultValue={editing?.teamId ?? ''} className={`${FIELD} w-full border px-2`}><option value="">Ohne Team</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          <p className="text-[11px] text-muted-foreground sm:col-span-2">Mindestens 12 Zeichen. Neue Passwörter und Rollenänderungen beenden bestehende Sitzungen. Mitglieder sehen standardmäßig die gesamte Organisation.</p>
          <div className="flex gap-2 sm:col-span-2"><Button size="sm" disabled={busy} className="h-8 rounded-sm text-xs">{editing ? 'Speichern' : 'Benutzer erstellen'}</Button>{editing && <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)} className="h-8 text-xs">Abbrechen</Button>}</div>
        </form>
        <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-border text-muted-foreground"><tr><th className="py-2">Benutzer</th><th>Rolle</th><th>Team</th><th><span className="sr-only">Aktionen</span></th></tr></thead>
          <tbody>{users.map(user => <tr key={user.id} className="border-b border-border/60"><td className="py-3 pr-2">{user.email}</td><td>{user.role === 'admin' ? 'Org-Admin' : 'Member'}</td><td>{user.teamId || '—'}</td><td className="text-right whitespace-nowrap">
            <Button size="sm" variant="ghost" disabled={busy} className="h-7 text-xs" onClick={() => setEditing(user)}>Bearbeiten</Button>
            <Button size="sm" variant="ghost" disabled={busy} className="h-7 text-xs text-destructive" onClick={() => { if (confirm(`${user.email} löschen?`)) void execute(() => api.delete(`/admin/users/${user.id}`)); }}>Löschen</Button>
          </td></tr>)}</tbody></table></div>
      </section>
    </div>
  </main>;
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.errors ?? error.response?.data?.message;
    return Array.isArray(message) ? message.join(' · ') : message || error.message;
  }
  return error instanceof Error ? error.message : 'Änderung fehlgeschlagen.';
}
