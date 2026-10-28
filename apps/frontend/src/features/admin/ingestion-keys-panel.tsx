import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { api, unwrap } from '@/shared/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Team { id: string; name: string }
interface IngestionKey {
  id: string; name: string; teamId: string; env?: string;
  createdAt: number; expiresAt: number; revokedAt?: number;
}
interface CreatedIngestionKey extends IngestionKey { key: string }

const FIELD = 'h-8 rounded-sm border-border bg-background text-xs';
const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-muted-foreground';
const PANEL = 'rounded-sm border border-border bg-card p-5 text-card-foreground';

export function IngestionKeysPanel({ teams }: { teams: Team[] }) {
  const [keys, setKeys] = useState<IngestionKey[]>([]);
  const [created, setCreated] = useState<CreatedIngestionKey>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const response = await api.get('/admin/ingestion-keys');
    setKeys(unwrap<IngestionKey[]>(response.data));
  }, []);
  useEffect(() => { void load().catch(error => setError(errorMessage(error))); }, [load]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setCreated(undefined);
    const form = event.currentTarget; const data = new FormData(form);
    try {
      const response = await api.post('/admin/ingestion-keys', {
        name: data.get('name'), teamId: data.get('teamId'), env: data.get('env') || undefined,
        expiresInDays: Number(data.get('expiresInDays')),
      });
      setCreated(unwrap<CreatedIngestionKey>(response.data)); form.reset(); await load();
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const revoke = async (key: IngestionKey) => {
    if (!confirm(`Ingestion-Key „${key.name}“ widerrufen? Dieser Schritt ist dauerhaft.`)) return;
    setBusy(true); setError('');
    try { await api.delete(`/admin/ingestion-keys/${encodeURIComponent(key.id)}`); await load(); }
    catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  };

  return <section className={`${PANEL} xl:col-span-2`}>
    <div className="mb-4"><h2 className="text-sm font-semibold">Ingestion-Keys</h2>
      <p className="mt-1 text-xs text-muted-foreground">Client-Key für ein externes Backend erzeugen. Der Klartext wird nur einmal angezeigt; gespeichert wird ausschließlich sein SHA-256-Hash.</p></div>
    {error && <p role="alert" className="mb-3 text-xs text-destructive">{error}</p>}
    {created && <div className="mb-4 rounded-sm border border-primary/40 bg-primary/5 p-3">
      <p className="text-xs font-semibold">Jetzt kopieren — dieser Key kann später nicht erneut angezeigt werden.</p>
      <div className="mt-2 flex gap-2"><Input readOnly value={created.key} aria-label="Generated ingestion key" className={`${FIELD} font-mono`} />
        <Button type="button" size="sm" className="h-8 text-xs" onClick={() => void navigator.clipboard.writeText(created.key)}>Kopieren</Button></div>
    </div>}
    <form onSubmit={create} className="grid gap-3 md:grid-cols-4">
      <label className="space-y-1"><span className={LABEL}>Bezeichnung</span><Input name="name" required maxLength={100} placeholder="orders-production" className={FIELD} /></label>
      <label className="space-y-1"><span className={LABEL}>Team</span><select name="teamId" required className={`${FIELD} w-full border px-2`}><option value="">Team wählen</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label className="space-y-1"><span className={LABEL}>Umgebung (optional)</span><Input name="env" pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,63}" maxLength={64} placeholder="production" className={FIELD} /></label>
      <label className="space-y-1"><span className={LABEL}>Gültigkeit (Tage)</span><Input name="expiresInDays" type="number" min={1} max={3650} defaultValue={30} required className={FIELD} /></label>
      <div className="md:col-span-4"><Button disabled={busy || teams.length === 0} size="sm" className="h-8 rounded-sm text-xs">Key erzeugen</Button></div>
    </form>
    <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-border text-muted-foreground"><tr><th className="py-2">Bezeichnung</th><th>Team</th><th>Umgebung</th><th>Läuft ab</th><th>Status</th><th><span className="sr-only">Aktionen</span></th></tr></thead>
      <tbody>{keys.map(key => <tr key={key.id} className="border-b border-border/60"><td className="py-3 pr-2">{key.name}</td><td>{key.teamId}</td><td>{key.env || 'Alle'}</td><td>{new Date(key.expiresAt).toLocaleString()}</td><td>{key.revokedAt ? 'Widerrufen' : key.expiresAt <= Date.now() ? 'Abgelaufen' : 'Aktiv'}</td><td className="text-right">{!key.revokedAt && <Button type="button" size="sm" variant="ghost" disabled={busy} className="h-7 text-xs text-destructive" onClick={() => void revoke(key)}>Widerrufen</Button>}</td></tr>)}</tbody></table>
      {keys.length === 0 && <p className="py-4 text-xs text-muted-foreground">Noch keine UI-generierten Ingestion-Keys.</p>}
    </div>
  </section>;
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.errors ?? error.response?.data?.message;
    return Array.isArray(message) ? message.join(' · ') : message || error.message;
  }
  return error instanceof Error ? error.message : 'Ingestion-Key-Aktion fehlgeschlagen.';
}
