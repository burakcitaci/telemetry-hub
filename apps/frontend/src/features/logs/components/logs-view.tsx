import { SignalExplorer } from '@/shared/components/signal-explorer';
import type { useLogs } from '../hooks/use-logs';
import { LogDetailSheet } from './log-detail-sheet';
import { columns } from './logs-components';

export function LogsView({ selectedLog, setSelectedLog, ...results }: ReturnType<typeof useLogs>) {
  return (
    <SignalExplorer source="logs" columns={columns} results={results} onOpen={setSelectedLog}>
      <LogDetailSheet log={selectedLog} isOpen={selectedLog !== null} onClose={() => setSelectedLog(null)} />
    </SignalExplorer>
  );
}
