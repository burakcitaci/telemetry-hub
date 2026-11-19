import { useTranslation } from 'react-i18next';
import { FeatureHeader } from '@/shared/components/feature-header';
import { PageLayout } from '@/shared/components/page-layout';
import { AlertHistory } from './components/alert-history';

export default function AlertsPage() {
  const { t } = useTranslation();
  return (
    <PageLayout>
      <FeatureHeader title={t('nav.alerts')} />
      <div className="mt-4 rounded-md border px-4 pt-2"><AlertHistory /></div>
    </PageLayout>
  );
}
