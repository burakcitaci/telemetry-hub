import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/shared/components/language-toggle';

export function GlobalHeader() {
  const { session, logout } = useAuth();
  const [logoutError, setLogoutError] = useState(false);
  const { t } = useTranslation();
  if (!session) return null;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4 text-card-foreground">
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Building2 className="size-3.5" aria-hidden="true" />
        <span className="truncate font-semibold text-foreground">{session.tenantSlug}</span>
        <span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
          {session.role}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            void logout().catch(() => setLogoutError(true));
          }}
        >
          {t('header.logout')}
        </Button>
        {logoutError && (
          <span role="alert" className="text-destructive">
            {t('header.logoutFailed')}
          </span>
        )}
      </div>
    </header>
  );
}
