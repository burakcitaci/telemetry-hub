import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-context';
import { api, BACKEND_URL, unwrap } from '@/shared/api/client';
import { FeatureHeader } from '@/shared/components/feature-header';
import { PageLayout } from '@/shared/components/page-layout';

type Signal = 'logs' | 'traces' | 'metrics';
type Connection = { service: string; team: string; env: string };
type SignalStatus = { signal: Signal; latest: string | null };

function useConnectionStatus(connection: Connection | null) {
  const [rows, setRows] = useState<SignalStatus[]>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!connection) return;
    const controller = new AbortController();
    let timer: number;
    const poll = async () => {
      try {
        const { data } = await api.get('/ingestion-status', { params: connection, signal: controller.signal });
        if (controller.signal.aborted) return;
        setRows(unwrap(data));
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(poll, 5_000);
      }
    };
    void poll();
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [connection]);
  return { rows, failed };
}

function ConnectionSignals({ connection, base }: { connection: Connection; base: string }) {
  const { t, i18n } = useTranslation();
  const { rows, failed } = useConnectionStatus(connection);
  const search = new URLSearchParams({ env: connection.env, globalService: connection.service, range: '15m' });
  return (
    <section className="space-y-2 rounded-md border p-4" aria-live="polite">
      <h2 className="font-semibold">{t('connect.status')}</h2>
      {failed && <p role="alert" className="text-sm text-destructive">{t('connect.statusFailed')}</p>}
      {(['logs', 'traces', 'metrics'] as const).map(signal => {
        const latest = rows?.find(row => row.signal === signal)?.latest;
        return <div key={signal} className="flex flex-wrap justify-between gap-2 text-sm">
          <Link className="underline" to={base + '/' + signal + '?' + search}>{t('nav.' + signal)}</Link>
          <span>{latest != null ? new Date(Number(latest)).toLocaleString(i18n.language)
            : t(rows ? 'connect.waiting' : 'connect.checking')}</span>
        </div>;
      })}
    </section>
  );
}

function ConnectionSnippet({ connection, secret }: { connection: Connection; secret: string }) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState('');
  const endpoint = new URL((BACKEND_URL || '') + '/api/ingest', window.location.origin);
  const snippet = [
    'OTEL_EXPORTER_OTLP_ENDPOINT=' + endpoint.href,
    'OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf',
    'OTEL_EXPORTER_OTLP_HEADERS=x-api-key=' + secret,
    'OTEL_SERVICE_NAME=' + connection.service,
    'OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=' + connection.env,
  ].join('\n');
  async function copy() {
    try { await navigator.clipboard.writeText(snippet); setNotice(t('connect.copied')); }
    catch { setNotice(t('connect.copyFailed')); }
  }
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="font-semibold">{t('connect.configure')}</h2>
      <p className="text-sm text-muted-foreground">{t('connect.configureHelp')}</p>
      <pre className="overflow-auto rounded bg-muted p-3 text-xs">{snippet}</pre>
      <Button type="button" size="sm" onClick={() => void copy()}>{t('connect.copy')}</Button>
      {notice && <p role="status" className="text-sm">{notice}</p>}
    </section>
  );
}

export default function ConnectApplicationPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const base = '/org/' + session?.tenantSlug;
  if (session?.role !== 'admin') return <Navigate replace to={base + '/metrics'} />;

  return (
    <PageLayout>
      <FeatureHeader title={t('connect.title')} description={t('connect.description')} />
      <div className="max-w-2xl space-y-4 pt-4">
        {!connection && <form className="space-y-3 rounded-md border p-4" onSubmit={async event => {
          event.preventDefault();
          if (busy) return;
          const form = new FormData(event.currentTarget);
          const next = { service: String(form.get('service')).trim(), env: String(form.get('env')), team: String(form.get('team')) };
          setBusy(true);
          setError(false);
          try {
            if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'verify') {
              setConnection(next);
              return;
            }
            const { data } = await api.post('/admin/ingestion-keys', { name: next.service,
              teamId: next.team, env: next.env, expiresInDays: 30 });
            setSecret(unwrap<{ key: string }>(data).key);
            setConnection(next);
          } catch { setError(true); }
          finally { setBusy(false); }
        }}>
          <label className="block space-y-1 text-sm">{t('connect.service')}
            <Input name="service" required maxLength={100} pattern="[A-Za-z0-9_.-]+" placeholder="checkout-api" /></label>
          <label className="block space-y-1 text-sm">{t('connect.environment')}
            <Input name="env" required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9_.-]*" defaultValue="local" /></label>
          <label className="block space-y-1 text-sm">{t('connect.team')}
            <select name="team" required defaultValue={session.teamId ?? session.teams[0] ?? ''}
              className="block h-9 w-full rounded-md border bg-background px-2">
              <option value="" disabled>{t('connect.team')}</option>
              {session.teams.map(team => <option key={team}>{team}</option>)}
            </select></label>
          {error && <p role="alert" className="text-sm text-destructive">{t('connect.keyFailed')}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>{t('admin.generateKey')}</Button>
            <Button type="submit" value="verify" variant="outline" disabled={busy}>{t('connect.verifyExisting')}</Button>
          </div>
        </form>}
        {connection && secret && <ConnectionSnippet connection={connection} secret={secret} />}
        {connection && <ConnectionSignals key={JSON.stringify(connection)} connection={connection} base={base} />}
        {connection && <Button variant="outline" onClick={() => { setConnection(null); setSecret(''); }}>{t('connect.startOver')}</Button>}
      </div>
    </PageLayout>
  );
}
