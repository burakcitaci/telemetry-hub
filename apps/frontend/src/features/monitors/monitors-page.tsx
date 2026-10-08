import { MonitorsView } from './components/monitors-view';
import { useMonitors } from './hooks/use-monitors';

export default function MonitorsPage() {
  const view = useMonitors();
  return <MonitorsView {...view} />;
}
