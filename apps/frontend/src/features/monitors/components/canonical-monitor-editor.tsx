import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-context';
import { api, unwrap } from '@/shared/api/client';
import { getErrorMessage } from '@/shared/lib/errors';
import { aggregations, comparators, readRule, signals, type CanonicalMonitor, type CanonicalRule, type MonitorRuntime } from '../canonical';

const inputStyle = 'block h-9 w-full rounded-md border bg-background px-2';
const labels = { LOG: 'Logs', METRIC: 'Metrics', TRACE: 'Traces' } as const;
const measures = { COUNT: 'Count', AVG: 'Average', SUM: 'Sum', MAX: 'Maximum', MIN: 'Minimum', P95: '95th percentile', P99: '99th percentile' } as const;
const severityOptions = ['ERROR', 'WARN', 'INFO', 'FATAL'] as const;
const templates = {
  errors: { label: 'Error spike', signal: 'LOG', aggregation: 'COUNT', query: 'severity_text:ERROR', comparator: 'GTE', threshold: 10, window_seconds: 300 },
  latency: { label: 'High latency', signal: 'TRACE', aggregation: 'P95', query: '', comparator: 'GT', threshold: 500, window_seconds: 300 },
  missing: { label: 'Missing telemetry', signal: 'LOG', aggregation: 'COUNT', query: '', comparator: 'LT', threshold: 1, window_seconds: 900 },
} as const;
type Template = keyof typeof templates;
const standardWindows = [[60, '1 minute'], [300, '5 minutes'], [900, '15 minutes'], [1800, '30 minutes'], [3600, '1 hour']] as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium"><span>{label}</span>{children}</label>;
}

interface EditorProps {
  initial: CanonicalMonitor | null;
  team?: string;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onPendingChange: (pending: boolean) => void;
  onSaved: (monitor: CanonicalMonitor) => void;
}

export function CanonicalMonitorEditor({ initial, team, onCancel, onDirtyChange, onPendingChange, onSaved }: EditorProps) {
  const { session } = useAuth();
  const [signal, setSignal] = useState<CanonicalRule['signal_type']>(initial?.signal_type ?? 'LOG');
  const [aggregation, setAggregation] = useState<CanonicalRule['aggregation']>(initial?.aggregation ?? 'COUNT');
  const [query, setQuery] = useState(initial?.query ?? '');
  const [advanced, setAdvanced] = useState(Boolean(initial?.query && !/^severity_text:(ERROR|WARN|INFO|FATAL)$/.test(initial.query)));
  const [selectedTemplate, setSelectedTemplate] = useState<Template | ''>('');
  const template = selectedTemplate ? templates[selectedTemplate] : undefined;
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<MonitorRuntime>();

  async function submit(form: HTMLFormElement, previewOnly: boolean) {
    if (busy.current) return;
    const rule = readRule(new FormData(form), signal, aggregation);
    if (selectedTemplate === 'missing' && !rule.service) { setError('Choose the service to check for missing telemetry.'); return; }
    busy.current = true;
    setPending(true);
    onPendingChange(true);
    setError('');
    try {
      if (previewOnly) setPreview(unwrap((await api.post('/monitors/preview', rule)).data));
      else {
        const response = initial ? await api.patch('/monitors/' + initial.id, rule) : await api.post('/monitors', rule);
        onSaved(unwrap<CanonicalMonitor>(response.data));
      }
    } catch (cause) { setError(getErrorMessage(cause, 'Monitor request failed.')); }
    finally { busy.current = false; setPending(false); onPendingChange(false); }
  }

  function chooseTemplate(value: Template | '') {
    setSelectedTemplate(value);
    if (!value) return;
    const preset = templates[value];
    setSignal(preset.signal);
    setAggregation(preset.aggregation);
    setQuery(preset.query);
    setAdvanced(false);
  }

  function changeSignal(next: CanonicalRule['signal_type']) {
    setSignal(next);
    setAggregation(next === 'METRIC' ? 'AVG' : 'COUNT');
    if (/^severity_text:(ERROR|WARN|INFO|FATAL)$/.test(query)) setQuery('');
  }

  return (
    <form className="min-h-0 flex-1 overflow-y-auto p-5" aria-busy={pending}
      onChange={() => { onDirtyChange(true); setPreview(undefined); }}
      onSubmit={event => {
        event.preventDefault();
        void submit(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'preview');
      }}>
      <fieldset disabled={pending} className="space-y-5">
        {!initial && <Field label="Start from a template"><select name="template" className={inputStyle} value={selectedTemplate}
          onChange={event => chooseTemplate(event.target.value as Template | '')}>
          <option value="">Custom monitor</option>
          {Object.entries(templates).map(([id, preset]) => <option key={id} value={id}>{preset.label}</option>)}
        </select></Field>}
        {selectedTemplate === "latency" && <p className="text-sm text-muted-foreground">95th percentile of span duration, in milliseconds.</p>}
        {selectedTemplate === "missing" && <p className="text-sm text-muted-foreground">Fires when the selected service sends no logs in the window.</p>}
        <Field label="Monitor name"><Input name="name" maxLength={200} required defaultValue={initial?.name} placeholder="Checkout error volume" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Signal"><select className={inputStyle} value={signal} onChange={event => changeSignal(event.target.value as typeof signal)}>
            {signals.map(value => <option key={value} value={value}>{labels[value]}</option>)}
          </select></Field>
          {signal === 'LOG' && !advanced && <Field label="Log level"><select name="log_level" className={inputStyle}
            value={query.replace(/^severity_text:/, '')} onChange={event => setQuery(event.target.value ? 'severity_text:' + event.target.value : '')}>
            <option value="">Any level</option>
            {severityOptions.map(value => <option key={value}>{value}</option>)}
          </select></Field>}
          {signal === 'METRIC' && <Field label="Metric name"><Input name="metric_name" maxLength={255}
            required={!/(^|\s)metric_name:/.test(query)} defaultValue={initial?.metric_name ?? ''} placeholder="http.server.request.duration" /></Field>}
        </div>
        <ConditionFields key={selectedTemplate} initial={template ?? initial} aggregation={aggregation} />
        <ScopeFields initial={initial} team={team} teams={session?.teams ?? []} requireService={selectedTemplate === "missing"} />
        <details open={advanced} onToggle={event => setAdvanced(event.currentTarget.open)}
          className="space-y-3 rounded-md border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">Advanced options</summary>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Aggregation"><select className={inputStyle} value={aggregation}
              onChange={event => setAggregation(event.target.value as typeof aggregation)}>
              {aggregations.map(value => <option key={value} value={value}>{measures[value]}</option>)}
            </select></Field>
            {signal !== 'METRIC' && aggregation !== 'COUNT' && <Field label="Numeric field"><Input key={selectedTemplate + signal} name="field" maxLength={128}
              defaultValue={(initial?.signal_type === signal ? initial.field : undefined) ?? (signal === 'TRACE' ? 'duration_ms' : '')}
              placeholder={signal === 'TRACE' ? 'duration_ms' : 'responseTime'} /></Field>}
            <Field label="Notification cooldown (seconds)"><Input name="cooldown_seconds" type="number" min={0}
              defaultValue={initial?.cooldown_seconds ?? 0} /></Field>
          </div>
          <Field label="Query filters"><Input name="query" maxLength={4000} value={query} onChange={event => setQuery(event.target.value)} /></Field>
          <p className="text-xs text-muted-foreground">Use filters such as service.name:checkout. An empty query matches all records in the selected scope.</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={initial?.enabled ?? true} /> Evaluate automatically</label>
        </details>
        <EditorFeedback error={error} preview={preview} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit">{pending ? 'Working…' : 'Save monitor'}</Button>
          <Button type="submit" value="preview" variant="outline">Preview</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </fieldset>
    </form>
  );
}

function EditorFeedback({ error, preview }: { error: string; preview?: MonitorRuntime }) {
  return <>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {preview && <p role="status" className="text-sm">{preview.error ?? [
      preview.state === 'FIRING' ? 'Would fire' : 'Within threshold',
      (preview.estimated ? '≈ ' : '') + preview.value + ' ' + preview.unit,
    ].join(' · ')}</p>}
    {!!preview?.warnings?.length && <p role="status" className="text-sm text-destructive">
      Ignored query keys: {preview.warnings.map(warning => warning.key).join(', ')}
    </p>}
  </>;
}

function ScopeFields({ initial, team, teams, requireService }: { initial: CanonicalMonitor | null; team?: string; teams: string[]; requireService: boolean }) {
  return <fieldset className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
    <legend className="px-1 text-sm font-medium">Scope (optional)</legend>
    <Field label="Team"><select name="team_id" defaultValue={initial?.team_id ?? (teams.includes(team ?? '') ? team : '')} className={inputStyle}>
      <option value="">All teams</option>
      {teams.map(value => <option key={value}>{value}</option>)}
    </select></Field>
    <Field label="Service"><Input name="service" maxLength={255} required={requireService} defaultValue={initial?.service ?? ''} placeholder="Any service" /></Field>
    <Field label="Environment"><Input name="env" maxLength={64} defaultValue={initial?.env ?? ''} placeholder="Any environment" /></Field>
  </fieldset>;
}

function ConditionFields({ initial, aggregation }: { initial: Pick<CanonicalRule, 'comparator' | 'threshold' | 'window_seconds'> | null; aggregation: CanonicalRule['aggregation'] }) {
  return <fieldset className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
    <legend className="px-1 text-sm font-medium">Alert when {measures[aggregation].toLowerCase()} is</legend>
    <Field label="Comparison"><select name="comparator" className={inputStyle} defaultValue={initial?.comparator ?? 'GT'}>
      {comparators.map((value, index) => <option key={value} value={value}>{['Above', 'At least', 'Below', 'At most'][index]}</option>)}
    </select></Field>
    <Field label="Threshold"><Input name="threshold" required type="number" step="any" defaultValue={initial?.threshold} placeholder="10" /></Field>
    <WindowField seconds={initial?.window_seconds ?? 300} />
  </fieldset>;
}

function WindowField({ seconds }: { seconds: number }) {
  const [choice, setChoice] = useState(standardWindows.some(([value]) => value === seconds) ? String(seconds) : 'custom');
  return <div className="space-y-2">
    <Field label="Over the last"><select className={inputStyle} value={choice} onChange={event => setChoice(event.target.value)}>
      {standardWindows.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      <option value="custom">Custom window</option>
    </select></Field>
    {choice === 'custom'
      ? <Field label="Window (seconds)"><Input name="window_seconds" type="number" required min={1} defaultValue={seconds} /></Field>
      : <input type="hidden" name="window_seconds" value={choice} />}
  </div>;
}
