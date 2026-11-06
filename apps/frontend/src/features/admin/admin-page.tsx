import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { FIELD, LABEL, PANEL, errorMessage as sharedErrorMessage, type Team } from './presentation';
import { useConfirmAction } from '@/shared/components/confirm-action';
import { useAuth, type UserRole } from '@/features/auth/auth-context';
import { api, unwrap } from '@/shared/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QueryError, ViewSkeleton } from '@/shared/components/view-skeleton';
import { IngestionKeysPanel } from './ingestion-keys-panel';

interface User { id: string; email: string; role: UserRole; teamId?: string }

export default function AdminPage() {
  const { confirmAction, confirmation } = useConfirmAction();
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
  return <main className="space-y-6 bg-background p-5 md:p-6">
    <header>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Organisation · {session.tenantSlug}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Administration</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Verwalte Benutzer, Teams und Ingestion-Keys an einem Ort. Plattformfilter beeinflussen diese Verwaltung nicht.</p>
    </header>
    {error && <QueryError title="Administration could not be loaded" message={error}
      onRetry={() => load().catch(() => undefined)} isRetrying={loading} />}
    {notice && <p role="status" className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">{notice}</p>}
    <Tabs defaultValue="users" className="space-y-5">
      <TabsList aria-label="Administrationsbereiche" className="grid h-auto w-full grid-cols-3 gap-2 rounded-none bg-transparent p-0">
        <TabsTrigger value="users" className="h-auto min-h-16 flex-col items-start gap-1 rounded-md border border-border bg-card px-3 py-3 text-left data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-foreground data-[state=active]:shadow-none sm:px-4">
          <span className="flex w-full items-center justify-between gap-2 text-sm">Benutzer <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{users.length}</span></span>
          <span className="text-xs font-normal text-muted-foreground">Konten und Berechtigungen</span>
        </TabsTrigger>
        <TabsTrigger value="teams" className="h-auto min-h-16 flex-col items-start gap-1 rounded-md border border-border bg-card px-3 py-3 text-left data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-foreground data-[state=active]:shadow-none sm:px-4">
          <span className="flex w-full items-center justify-between gap-2 text-sm">Teams <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{teams.length}</span></span>
          <span className="text-xs font-normal text-muted-foreground">Organisation strukturieren</span>
        </TabsTrigger>
        <TabsTrigger value="ingestion-keys" className="h-auto min-h-16 flex-col items-start gap-1 rounded-md border border-border bg-card px-3 py-3 text-left data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-foreground data-[state=active]:shadow-none sm:px-4">
          <span className="text-sm">Ingestion-Keys</span>
          <span className="text-xs font-normal text-muted-foreground">Zugriff für Telemetrie</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="users" forceMount className="mt-0">
        <section className={PANEL}>
          <div className="mb-5">
            <h2 className="text-base font-semibold">Benutzer verwalten</h2>
            <p className="mt-1 text-sm text-muted-foreground">Konten anlegen, Rollen anpassen und Benutzer Teams zuordnen.</p>
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
            <div className="min-w-0 overflow-x-auto">
              <h3 className="mb-2 text-sm font-medium">Benutzer ({users.length})</h3>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-muted-foreground"><tr><th className="py-2">Benutzer</th><th>Rolle</th><th>Team</th><th><span className="sr-only">Aktionen</span></th></tr></thead>
                <tbody>{users.map(user => <tr key={user.id} className="border-b border-border/60"><td className="py-3 pr-2">{user.email}</td><td>{user.role === 'admin' ? 'Org-Admin' : 'Member'}</td><td>{user.teamId || '—'}</td><td className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" disabled={busy} className="h-7 text-xs" onClick={() => setEditing(user)}>Bearbeiten</Button>
                  <Button size="sm" variant="ghost" disabled={busy} className="h-7 text-xs text-destructive" onClick={async () => { if (await confirmAction(`${user.email} löschen?`)) void execute(() => api.delete(`/admin/users/${user.id}`)); }}>Löschen</Button>
                </td></tr>)}</tbody>
              </table>
            </div>
            <div className="rounded-md border border-border bg-background p-4">
              <h3 className="mb-4 text-sm font-semibold">{editing ? 'Benutzer bearbeiten' : 'Benutzer anlegen'}</h3>
              <form key={editing?.id ?? 'new'} onSubmit={saveUser} className="grid gap-3">
                <label className="space-y-1"><span className={LABEL}>E-Mail</span><Input name="email" type="email" required readOnly={!!editing} defaultValue={editing?.email} maxLength={254} autoComplete="off" className={FIELD} /></label>
                <label className="space-y-1"><span className={LABEL}>{editing ? 'Neues Passwort (optional)' : 'Passwort'}</span><Input name="password" type="password" required={!editing} minLength={12} maxLength={128} autoComplete="new-password" className={FIELD} /></label>
                <label className="space-y-1"><span className={LABEL}>Rolle</span><select name="role" defaultValue={editing?.role ?? 'user'} className={`${FIELD} w-full border px-2`}><option value="user">Member</option><option value="admin">Org-Admin</option></select></label>
                <label className="space-y-1"><span className={LABEL}>Team-Zugehörigkeit</span><select name="teamId" defaultValue={editing?.teamId ?? ''} className={`${FIELD} w-full border px-2`}><option value="">Ohne Team</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                <p className="text-[11px] text-muted-foreground">Mindestens 12 Zeichen. Neue Passwörter und Rollenänderungen beenden bestehende Sitzungen. Mitglieder sehen standardmäßig die gesamte Organisation.</p>
                <div className="flex gap-2"><Button size="sm" disabled={busy} className="h-8 rounded-sm text-xs">{editing ? 'Speichern' : 'Benutzer erstellen'}</Button>{editing && <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)} className="h-8 text-xs">Abbrechen</Button>}</div>
              </form>
            </div>
          </div>
        </section>
      </TabsContent>
      <TabsContent value="teams" forceMount className="mt-0">
        <section className={PANEL}>
          <div className="mb-5">
            <h2 className="text-base font-semibold">Teams verwalten</h2>
            <p className="mt-1 text-sm text-muted-foreground">Teams helfen dabei, Benutzer und Telemetrie innerhalb der Organisation zu strukturieren.</p>
          </div>
          <form onSubmit={addTeam} className="mb-6 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
            <label className="space-y-1"><span className={LABEL}>Team-Slug</span><Input name="id" required pattern="[a-z0-9][a-z0-9._-]{0,63}" maxLength={64} placeholder="platform" className={FIELD} /></label>
            <label className="space-y-1"><span className={LABEL}>Team-Name</span><Input name="name" required maxLength={100} placeholder="Platform Engineering" className={FIELD} /></label>
            <Button disabled={busy} size="sm" className="h-8 rounded-sm text-xs">Team erstellen</Button>
          </form>
          <h3 className="mb-2 text-sm font-medium">Teams ({teams.length})</h3>
          <ul className="divide-y divide-border border-t border-border">{teams.map(team => <li key={team.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0"><p className="truncate font-medium">{team.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{team.id}</p></div>
            <Button size="sm" variant="ghost" disabled={busy} className="h-8 shrink-0 text-xs text-destructive" onClick={async () => {
              if (await confirmAction(`Team ${team.name} löschen? Bestehende Telemetrie bleibt erhalten.`)) void execute(() => api.delete(`/admin/teams/${encodeURIComponent(team.id)}`));
            }}>Löschen</Button>
          </li>)}</ul>
        </section>
      </TabsContent>
      <TabsContent value="ingestion-keys" forceMount className="mt-0">
        <IngestionKeysPanel teams={teams} />
      </TabsContent>
    </Tabs>
    {confirmation}
  </main>;
}

const errorMessage = (error: unknown) => sharedErrorMessage(error, 'Änderung fehlgeschlagen.');
