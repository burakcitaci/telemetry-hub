import { useState, type FormEvent, type ReactNode } from 'react';
import { Activity, ArrowRight, LoaderCircle } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/shared/telemetry-primitives';
import { getErrorMessage } from '@/shared/lib/errors';
import { useAuth } from './auth-context';

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, login } = useAuth();
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) return <Navigate to={`/org/${session.tenantSlug}/metrics`} replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const next = await login({ tenantSlug, email, password });
      navigate(`/org/${next.tenantSlug}/metrics`, { replace: true });
    } catch (cause) {
      setError(getErrorMessage(cause, 'Anmeldung fehlgeschlagen.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0c0e12] px-4 py-10 text-slate-100">
      <MetricCard className="w-full max-w-sm rounded-sm border border-[#242936] bg-[#161920] p-6 shadow-2xl shadow-black/30">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-sm bg-purple-600 text-white">
            <Activity className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Telemetry Hub</h1>
            <p className="text-xs text-slate-400">Sign in to your organization</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <LoginField label="Organisation (Tenant)" name="tenantSlug">
            <Input
              id="tenantSlug"
              autoComplete="organization"
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value.toLowerCase())}
              placeholder="acme-observability"
              required
              className="h-9 rounded-sm border-[#303747] bg-[#0f1218] text-sm text-slate-100"
            />
          </LoginField>
          <LoginField label="E-Mail-Adresse" name="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              className="h-9 rounded-sm border-[#303747] bg-[#0f1218] text-sm text-slate-100"
            />
          </LoginField>
          <LoginField label="Passwort" name="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="h-9 rounded-sm border-[#303747] bg-[#0f1218] text-sm text-slate-100"
            />
          </LoginField>

          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="h-9 w-full rounded-sm text-xs font-bold">
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
            {isSubmitting ? 'Anmeldung läuft…' : 'Anmelden'}
          </Button>
        </form>
      </MetricCard>
    </main>
  );
}

function LoginField({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
