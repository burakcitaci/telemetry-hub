import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Aggregation } from '../model';
import { calculationLabels } from '../log-builder';

export function SimpleLogEditor({ expression, onChange, aggregation, onAggregationChange }: {
  expression: string; onChange: (value: string) => void; aggregation: Aggregation;
  onAggregationChange: (value: Aggregation) => void;
}) {
  return <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
    <label htmlFor="monitor-log-condition" className="space-y-1.5 text-xs font-medium">Query
      <Input id="monitor-log-condition" value={expression} onChange={event => onChange(event.target.value)} placeholder="ForecastCount > 5" maxLength={256} />
    </label>
    <div className="space-y-1.5"><label htmlFor="monitor-log-calculation" className="block text-xs font-medium">Aggregation</label>
      <Select value={aggregation === 'count' ? 'max' : aggregation} onValueChange={value => onAggregationChange(value as Aggregation)}>
        <SelectTrigger id="monitor-log-calculation"><SelectValue /></SelectTrigger><SelectContent>
          {['max', 'avg', 'sum', 'min', 'p95'].map(value => <SelectItem key={value} value={value}>{calculationLabels[value]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <p className="text-xs text-muted-foreground sm:col-span-2">Enter a numeric log parameter and its alert condition. Example: ForecastCount &gt; 5 with Maximum alerts when the highest value exceeds 5.</p>
  </div>;
}
