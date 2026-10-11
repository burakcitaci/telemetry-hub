import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEnvironments, type EnvironmentSource } from '@/shared/hooks/use-environments';
import { FilterMultiselect } from './filter-multiselect';
import { readPlatformFilters } from '@/shared/lib/platform-filters';

export function EnvironmentFilter({ source }: { source: EnvironmentSource }) {
  const [params, setParams] = useSearchParams();
  const env = readPlatformFilters(params.toString()).env;
  const { values, loading, error, retry } = useEnvironments(source);
  const options = values.filter((value) => /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(value));
  const setEnv = (values: string[]) => setParams((current) => {
    const next = new URLSearchParams(current);
    next.delete('env'); values.forEach(value => next.append('env', value)); next.delete('id');
    return next;
  });
  return (
    <section className="space-y-2 px-0 py-2" aria-busy={loading}>
      <FilterMultiselect label="Environments" values={env} options={options} onChange={setEnv} disabled={loading || error} />
      {loading && <p role="status" className="text-xs text-muted-foreground">Loading environments…</p>}
      {error && <div role="alert" className="text-xs text-destructive">Environments unavailable. <Button variant="link" size="sm" onClick={retry}>Retry</Button></div>}
      {!loading && !error && options.length === 0 && <p className="text-xs text-muted-foreground">No environments found.</p>}
    </section>
  );
}
