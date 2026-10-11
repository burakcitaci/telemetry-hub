import { useId } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useEnvironments, type EnvironmentSource } from '@/shared/hooks/use-environments';

export function EnvironmentFilter({ source }: { source: EnvironmentSource }) {
  const id = useId();
  const [params, setParams] = useSearchParams();
  const env = params.get('env')?.trim() || 'production';
  const { values, loading, error, retry } = useEnvironments(source);
  const options = values.filter((value) => /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(value));
  const setEnv = (value: string) => setParams((current) => {
    const next = new URLSearchParams(current);
    next.set('env', value);
    return next;
  });
  return (
    <section className="space-y-2 px-0 py-2" aria-busy={loading}>
      <Select value={env} onValueChange={setEnv} disabled={loading || error}>
        <SelectTrigger id={id} className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {!options.includes(env) && <SelectItem value={env}>{env} (not found)</SelectItem>}
          {options.map((value) => <SelectItem key={value} value={value}>env:{value}</SelectItem>)}
        </SelectContent>
      </Select>
      {loading && <p role="status" className="text-xs text-muted-foreground">Loading environments…</p>}
      {error && <div role="alert" className="text-xs text-destructive">Environments unavailable. <Button variant="link" size="sm" onClick={retry}>Retry</Button></div>}
      {!loading && !error && options.length === 0 && <p className="text-xs text-muted-foreground">No environments found.</p>}
    </section>
  );
}
