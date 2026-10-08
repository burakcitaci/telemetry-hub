import { LogsView } from './components/logs-view';
import { useLogs } from './hooks/use-logs';

export default function LogsPage() {
  const view = useLogs();
  return <LogsView {...view} />;
}
