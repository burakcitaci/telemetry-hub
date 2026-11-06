import { Link, useLocation } from 'react-router-dom';
import { RouteErrorBoundary } from '../src/shared/components/route-error-boundary';

function BrokenView(): never { throw new Error('Fixture rendering failure'); }

export function RecoveryFixture() {
  const location = useLocation();
  return <><Link to="/org/demo/metrics">Recover through navigation</Link>
    <RouteErrorBoundary>{location.pathname.endsWith('/metrics')
      ? <p>Recovered view</p> : <BrokenView />}</RouteErrorBoundary></>;
}
