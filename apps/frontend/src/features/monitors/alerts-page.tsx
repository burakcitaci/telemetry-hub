import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FeatureHeader } from '@/shared/components/feature-header';
import { PageLayout } from '@/shared/components/page-layout';
import { AlertHistory } from './components/alert-history';

export default function AlertsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const team = params.get('team') ?? undefined;
  const monitor = params.get('monitor') ?? undefined;
  return (
    <PageLayout>
      <FeatureHeader title={t('nav.alerts')} description={team ? <>Team {team} · <Link to={location.pathname} className="underline">Show all teams</Link></> : undefined} />
      <div className="mt-4 rounded-md border px-4 pt-2"><AlertHistory key={JSON.stringify([team, monitor])} team={team} monitorId={monitor} /></div>
    </PageLayout>
  );
}
