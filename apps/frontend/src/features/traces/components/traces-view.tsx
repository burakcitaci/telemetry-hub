import { SignalExplorer } from '@/shared/components/signal-explorer';
import { useActiveTrace } from '@/shared/hooks/use-active-trace';
import type { useTraces } from '../hooks/use-traces';
import { columns } from './traces-components';

export function TracesView(results: ReturnType<typeof useTraces>) {
  const { openTrace } = useActiveTrace();
  return <SignalExplorer source="traces" columns={columns} results={results}
    onOpen={trace => openTrace(trace.TraceId)} />;
}
