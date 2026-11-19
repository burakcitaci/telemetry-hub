import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { investigationUrl } from '../lib/investigation-link';

export function CopyInvestigationLink({ traceId, scope }: { traceId?: string; scope?: string }) {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const [status, setStatus] = useState('');
  const path = traceId ? pathname.split('/').slice(0, 3).join('/') + '/traces' : pathname;
  async function copy() {
    try {
      const url = new URL(investigationUrl(path, scope ?? search, traceId), window.location.origin);
      await navigator.clipboard.writeText(url.href);
      setStatus(t('explorer.linkCopied'));
    } catch {
      setStatus(t('explorer.linkFailed'));
    }
  }
  return (
    <div className="flex items-center gap-1">
      <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => void copy()}
        title={t('explorer.copyLink')} aria-label={t('explorer.copyLink')}>
        <Link2 className="size-4" aria-hidden="true" />
      </Button>
      {status && <span role="status" className="max-w-36 text-xs text-muted-foreground">{status}</span>}
    </div>
  );
}
