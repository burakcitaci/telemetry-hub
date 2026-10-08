import { ServicesView } from './components/services-view';
import { useServices } from './hooks/use-services';

export default function ServicesPage() {
  const view = useServices();
  return <ServicesView {...view} />;
}
