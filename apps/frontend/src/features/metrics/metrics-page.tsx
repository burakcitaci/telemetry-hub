import { MetricsView } from './components/metrics-view';
import { useMetrics } from './hooks/use-metrics';

export default function MetricsPage() {
  const view = useMetrics();
  return <MetricsView {...view} />;
}
