import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculationLabels, type LogBuilderState, type LogFilter } from '../log-builder';
import type { Aggregation } from '../model';

interface Props {
  state: LogBuilderState; onChange: (state: LogBuilderState) => void;
  measure: 'records' | 'number'; onMeasureChange: (value: 'records' | 'number') => void;
  attribute: string; onAttributeChange: (value: string) => void;
  aggregation: Aggregation; onAggregationChange: (value: Aggregation) => void;
  rawQuery: string; onRawQueryChange: (value: string) => void; error?: string;
}
const operators = { equals: 'Equals (text)', exists: 'Has a value', '>': 'Greater than', '>=': 'At least', '<': 'Less than', '<=': 'At most', '=': 'Equals (number)', '!=': 'Not equal (number)' };

export function LogRuleBuilder(props: Props) {
  const { state, onChange, measure, attribute, aggregation } = props;
  const update = (index: number, patch: Partial<LogFilter>) => onChange({ ...state,
    filters: state.filters.map((filter, position) => position === index ? { ...filter, ...patch } : filter) });
  return <div className="space-y-4">
    <div className="space-y-1.5">
      <label htmlFor="monitor-log-measure" className="block text-xs font-medium">What do you want to monitor?</label>
      <Select value={measure} onValueChange={value => props.onMeasureChange(value as Props['measure'])}>
        <SelectTrigger id="monitor-log-measure"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="records">Number of log records</SelectItem>
          <SelectItem value="number">A numeric parameter in my logs</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{measure === 'records' ? 'Counts how many logs match your filters—not the number stored inside a log.' : 'Uses a number recorded in your logs, such as ForecastCount, duration_ms or order.total.'}</p>
    </div>
    {measure === 'number' && <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1.5 text-xs font-medium" htmlFor="monitor-log-attribute">Parameter name
        <Input id="monitor-log-attribute" value={attribute} onChange={event => props.onAttributeChange(event.target.value)} placeholder="e.g. ForecastCount" maxLength={128} />
      </label>
      <div className="space-y-1.5"><label htmlFor="monitor-log-calculation" className="block text-xs font-medium">How should we calculate it?</label>
        <Select value={aggregation} onValueChange={value => props.onAggregationChange(value as Aggregation)}>
          <SelectTrigger id="monitor-log-calculation"><SelectValue /></SelectTrigger><SelectContent>
            {['max', 'avg', 'sum', 'min', 'p95'].map(value => <SelectItem key={value} value={value}>{calculationLabels[value]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">Choose Maximum to detect any high value, or Total to add values together. Example: a ForecastCount of 8 contributes 8, not one log. Missing or invalid numbers are not counted as zero.</p>
    </div>}
    {!state.advanced && <div className="space-y-2 border-t pt-3">
      <h4 className="text-xs font-medium">Which logs should be included? <span className="font-normal text-muted-foreground">Optional</span></h4>
      {!state.filters.length && <><p className="text-xs text-muted-foreground">All logs in the selected service/environment are included. Add a filter to narrow them down.</p>
        <label className="block space-y-1 text-xs" htmlFor="monitor-log-message">Message contains (optional)<Input id="monitor-log-message" value={state.message} onChange={event => onChange({ ...state, message: event.target.value })} placeholder="e.g. Generated" /></label></>}
      {state.filters.map((filter, index) => <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)_auto]">
        <Input aria-label={`Filter ${index + 1} parameter`} value={filter.parameter} placeholder="Parameter, e.g. RequestPath" onChange={event => update(index, { parameter: event.target.value })} />
        <Select value={filter.operator} onValueChange={value => update(index, { operator: value as LogFilter['operator'] })}><SelectTrigger aria-label={`Filter ${index + 1} operator`}><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(operators).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
        <Input aria-label={`Filter ${index + 1} value`} value={filter.value} placeholder="Value, e.g. /WeatherForecast" disabled={filter.operator === 'exists'} onChange={event => update(index, { value: event.target.value })} />
        <Button variant="ghost" size="sm" aria-label={`Remove filter ${index + 1}`} onClick={() => onChange({ ...state, filters: state.filters.filter((_, position) => position !== index) })}>Remove</Button>
      </div>)}
      <Button variant="outline" size="sm" disabled={state.filters.length >= 10 || !!state.message.trim()} onClick={() => onChange({ ...state, filters: [...state.filters, { parameter: '', operator: 'equals', value: '' }] })}>Add parameter filter</Button>
      {!!state.message.trim() && <p className="text-xs text-muted-foreground">Clear message text to use parameter filters instead.</p>}
      {state.filters.length > 1 && <p className="text-xs text-muted-foreground">A log must match all filters.</p>}
    </div>}
    <details open={state.advanced} onToggle={event => { const advanced = event.currentTarget.open; if (advanced !== state.advanced) onChange({ ...state, advanced }); }}>
      <summary className="cursor-pointer text-xs text-muted-foreground">Advanced query</summary>
      <label className="mt-2 block space-y-1 text-xs" htmlFor="monitor-query">Raw log query<Input id="monitor-query" value={props.rawQuery} onChange={event => props.onRawQueryChange(event.target.value)} /></label>
      <p className="mt-1 text-xs text-muted-foreground">Use * or message text, or @parameter:value comparisons joined with AND. Close this section to use the filter builder.</p>
    </details>
    {props.error && <p role="alert" className="text-xs text-destructive">{props.error}</p>}
  </div>;
}
