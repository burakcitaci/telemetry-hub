import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-context';
import { api, unwrap } from '@/shared/api/client';
import { getErrorMessage } from '@/shared/lib/errors';
import { aggregations, comparators, readRule, signals, type CanonicalMonitor, type CanonicalRule, type MonitorRuntime } from '../canonical';

const inputStyle = 'block h-9 w-full rounded-md border bg-background px-2';
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium"><span>{label}</span>{children}</label>;
}

interface EditorProps {
  initial: CanonicalMonitor | null;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (id: string) => void;
}

export function CanonicalMonitorEditor({ initial, onCancel, onDirtyChange, onSaved }: EditorProps) {
  const { session } = useAuth();
  const [signal, setSignal] = useState<CanonicalRule['signal_type']>(initial?.signal_type ?? 'LOG');
  const [aggregation, setAggregation] = useState<CanonicalRule['aggregation']>(initial?.aggregation ?? 'COUNT');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<MonitorRuntime>();
  async function submit(form: HTMLFormElement, previewOnly: boolean) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    setPreview(undefined);
    const rule = readRule(new FormData(form), signal, aggregation);
    try {
      if (previewOnly) {
        const { data } = await api.post('/monitors/preview', rule);
        setPreview(unwrap(data));
        return;
      }
      const { data } = initial ? await api.patch('/monitors/' + initial.id, rule) : await api.post('/monitors', rule);
      onSaved(unwrap<CanonicalMonitor>(data).id);
    } catch (cause) { setError(getErrorMessage(cause, 'Monitor request failed.')); }
    finally { busy.current = false; setPending(false); }
  }
  return (
    <form className="min-h-0 flex-1 overflow-y-auto p-5" onChange={() => {
      onDirtyChange(true);
      setPreview(undefined);
    }} onSubmit={event => {
      event.preventDefault();
      void submit(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'preview');
    }}>
      <fieldset disabled={pending} className="space-y-4">
        <Field label="Name"><Input name="name" maxLength={200} required defaultValue={initial?.name} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Signal"><select className={inputStyle} value={signal}
            onChange={event => setSignal(event.target.value as typeof signal)}>
            {signals.map(value => <option key={value}>{value}</option>)}
          </select></Field>
          <Field label="Aggregation"><select className={inputStyle} value={aggregation}
            onChange={event => setAggregation(event.target.value as typeof aggregation)}>
            {aggregations.map(value => <option key={value}>{value}</option>)}
          </select></Field>
          {signal === 'METRIC' && <Field label="Metric name"><Input name="metric_name" maxLength={255} defaultValue={initial?.metric_name ?? ''} /></Field>}
          {signal !== 'METRIC' && aggregation !== 'COUNT' && <Field label="Numeric field"><Input name="field"
            maxLength={128} required defaultValue={initial?.signal_type === signal ? initial.field ?? '' : ''}
            placeholder={signal === 'TRACE' ? 'duration_ms' : 'responseTime'} /></Field>}
        </div>
        <Field label="Query"><Input name="query" maxLength={4000} defaultValue={initial?.query ?? ''} /></Field>
        <p className="text-xs text-muted-foreground">Leave blank for all scoped records, or add filters such as service.name:checkout.</p>
        <ConditionFields initial={initial} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Team"><select name="team_id" defaultValue={initial?.team_id ?? ''} className={inputStyle}>
            <option value="">All teams</option>
            {session?.teams.map(team => <option key={team}>{team}</option>)}
          </select></Field>
          <Field label="Service"><Input name="service" maxLength={255} defaultValue={initial?.service ?? ''} /></Field>
          <Field label="Environment"><Input name="env" maxLength={64} defaultValue={initial?.env ?? ''} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={initial?.enabled ?? true} /> Enabled</label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {preview && <p role="status" className="text-sm">{preview.error ?? [
          preview.state === 'FIRING' ? 'Would fire' : 'Within threshold',
          (preview.estimated ? '≈ ' : '') + preview.value + ' ' + preview.unit,
        ].join(' · ')}</p>}
        {!!preview?.warnings?.length && <p role="status" className="text-sm text-destructive">
          Ignored query keys: {preview.warnings.map(warning => warning.key).join(', ')}
        </p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Save monitor</Button>
          <Button type="submit" value="preview" variant="outline">Preview</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </fieldset>
    </form>
  );
}

function ConditionFields({ initial }: { initial: CanonicalMonitor | null }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Comparator"><select name="comparator" className={inputStyle} defaultValue={initial?.comparator ?? 'GT'}>
        {comparators.map((value, index) => <option key={value} value={value}>{['Above', 'At least', 'Below', 'At most'][index]}</option>)}
      </select></Field>
      <Field label="Threshold"><Input name="threshold" required type="number" step="any" defaultValue={initial?.threshold ?? 0} /></Field>
      <Field label="Window (seconds)"><Input name="window_seconds" required type="number" min={1} defaultValue={initial?.window_seconds ?? 300} /></Field>
      <Field label="Cooldown (seconds)"><Input name="cooldown_seconds" required type="number" min={0} defaultValue={initial?.cooldown_seconds ?? 0} /></Field>
    </div>
  );
}
