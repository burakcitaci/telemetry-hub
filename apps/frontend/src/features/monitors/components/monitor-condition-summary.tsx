import type { MonitorView } from '../model';
import { formatNumber } from '../model';
import { calculationLabels } from '../log-builder';
import { displayLogQuery } from '../log-query-input';

export function MonitorConditionSummary({ monitor }: { monitor: MonitorView }) {
  const measure = monitor.logAttribute || (monitor.metric ?? monitor.logSource ?? monitor.query);
  const trigger = `${calculationLabels[monitor.aggregation ?? 'count']} of ${measure} ${monitor.comparator.replace(/_/g, ' ')} ${formatNumber(monitor.threshold)}`;
  const fields = [['Trigger', trigger], ['Evaluation window', monitor.evaluationWindow],
    ...(monitor.warnThreshold !== undefined ? [['Warn threshold', formatNumber(monitor.warnThreshold)]] : []),
    ...(monitor.groupBy?.length ? [['Group by', monitor.groupBy.join(', ')]] : []),
    ...(monitor.targets.length ? [['Notify', monitor.targets.join(', ')]] : [])];
  return <section aria-label="Condition" className="border-b border-border px-5 py-3">
    <div className="flex min-w-0 items-baseline gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">Query</span>
      <span className="min-w-0 break-words">{monitor.type === 'log' ? displayLogQuery(monitor.query, monitor.logAttribute) : monitor.query}</span>
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
      {fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="mt-0.5 break-words font-medium">{value}</dd></div>)}
    </dl>
  </section>;
}
