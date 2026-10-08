import { TracesView } from './components/traces-view';
import { useTraces } from './hooks/use-traces';

export default function TracesPage() {
  const view = useTraces();
  return <TracesView {...view} />;
}
