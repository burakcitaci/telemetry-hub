import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { FilterMultiselect } from './filter-multiselect';
import { readPlatformFilters } from '@/shared/lib/platform-filters';
import { useFilterOptions } from '@/shared/hooks/use-filter-options';
import { filterOptionsSource } from '@/shared/api/filter-options';

const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-muted-foreground';

export function UnifiedFilterSidebar() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const selected = readPlatformFilters(params.toString());
  const { pathname } = useLocation();
  const range = params.get('range') || params.get('time') || '5m';
  const source = filterOptionsSource(pathname);
  const scopeKey = JSON.stringify([selected.team, selected.service, selected.env]);

  const { options, loading, error, retry } = useFilterOptions(
    source,
    range,
    `${session?.tenantSlug ?? ''}:${scopeKey}`,
  );

  const choose = (key: string, values: string[]) =>
    setParams(current => {
      const next = new URLSearchParams(current);
      next.delete(key);
      values.forEach(value => next.append(key, value));
      next.delete('id');
      return next;
    });

  return (
    <section
      className="min-w-0 space-y-3 border-b border-border px-2 py-3"
      aria-label="Unified platform filters"
    >
      <h2 className={LABEL}>Platform Filters</h2>

      <FilterSelect
        label="Environment"
        values={selected.env}
        options={options.environments}
        onChange={values => choose('env', values)}
      />
      <FilterSelect
        label="Service"
        values={selected.service}
        options={options.services}
        onChange={values => choose('globalService', values)}
      />
      <FilterSelect
        label="Team"
        values={selected.team}
        options={session?.teams ?? []}
        onChange={values => choose('team', values)}
      />
      <FilterSelect
        label="Status"
        values={selected.status}
        options={options.statuses}
        onChange={values => choose('globalStatus', values)}
      />

      {loading && (
        <p role="status" className="text-[11px] text-muted-foreground">
          Refreshing options for the selected time range…
        </p>
      )}

      {!loading && !error && !options.statuses.length && !pathname.includes('/metrics') && (
        <p className="text-[11px] text-muted-foreground">
          No statuses found in the selected time range.
        </p>
      )}

      {pathname.includes('/metrics') && (
        <p className="text-[11px] text-muted-foreground">
          Status does not apply to raw OTel metrics. The selection is retained for Logs, Traces and Monitors.
        </p>
      )}

      {source === 'monitors' && (
        <p className="text-[11px] text-muted-foreground">
          Monitor options reflect configurations updated in this range. Historical evaluation states are not recorded yet.
        </p>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-full text-xs"
        onClick={() =>
          setParams(current => {
            const next = new URLSearchParams(current);
            ['env', 'team', 'globalService', 'globalStatus', 'id'].forEach(key => next.delete(key));
            return next;
          })
        }
      >
        Filter zurücksetzen
      </Button>

      {error && !loading && (
        <p role="alert" className="text-xs text-destructive">
          Filter-Optionen nicht verfügbar.{' '}
          <button className="underline" onClick={retry}>
            Erneut laden
          </button>
        </p>
      )}
    </section>
  );
}

function FilterSelect({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-1">
      <span className={LABEL}>{label}</span>
      <FilterMultiselect label={label} values={values} options={options} onChange={onChange} />
    </div>
  );
}
