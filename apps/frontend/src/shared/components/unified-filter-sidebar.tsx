import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { api, unwrap } from '@/shared/api/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-muted-foreground';
interface Options { services: string[]; environments: string[] }

export function UnifiedFilterSidebar() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const [options, setOptions] = useState<Options>({ services: [], environments: [] });
  const [error, setError] = useState(false);
  const [revision, retry] = useState(0);
  useEffect(() => {
    let active = true;
    api.get('/filters').then(({ data }) => { if (active) { setOptions(unwrap<Options>(data)); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [session?.tenantSlug, revision]);
  const choose = (key: string, value: string) => setParams(current => {
    const next = new URLSearchParams(current);
    if (value === 'all') next.delete(key); else next.set(key, value);
    next.delete('id');
    return next;
  });
  return <section className="min-w-0 space-y-3 border-b border-border px-2 py-3" aria-label="Unified platform filters">
    <h2 className={LABEL}>Platform Filters</h2>
    <FilterSelect label="Environment" value={params.get('env') || 'all'} options={options.environments} onChange={value => choose('env', value)} />
    <FilterSelect label="Service" value={params.get('globalService') || 'all'} options={options.services} onChange={value => choose('globalService', value)} />
    <FilterSelect label="Team" value={params.get('team') || 'all'} options={session?.teams ?? []} onChange={value => choose('team', value)} />
    <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => setParams(current => {
      const next = new URLSearchParams(current); ['env', 'team', 'globalService'].forEach(key => next.delete(key)); return next;
    })}>Filter zurücksetzen</Button>
    <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => retry(value => value + 1)}>Optionen aktualisieren</Button>
    {error && <p role="alert" className="text-xs text-destructive">Filter-Optionen nicht verfügbar. <button className="underline" onClick={() => retry(value => value + 1)}>Erneut laden</button></p>}
    <p className="text-[11px] text-muted-foreground">Gilt für Metrics, Logs, Traces und Monitors. Ohne Auswahl: gesamte Organisation.</p>
  </section>;
}

function FilterSelect({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void;
}) {
  const values = [...new Set([...options, ...(value !== 'all' ? [value] : [])])].filter(option => option !== 'all');
  return <div className="space-y-1">
    <span className={LABEL}>{label}</span>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-8 rounded-sm border-border bg-background text-xs"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">Alle {label === 'Team' ? 'Teams' : label === 'Service' ? 'Services' : 'Umgebungen'}</SelectItem>
        {values.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}
