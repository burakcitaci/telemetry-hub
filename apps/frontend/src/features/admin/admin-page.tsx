import { ArrowLeft, ChevronRight, KeyRound, Users, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/auth-context';
import { FeatureHeader } from '@/shared/components/feature-header';
import { FeaturePage } from '@/shared/components/feature-layout';
import { RouteErrorBoundary } from '@/shared/components/route-error-boundary';
import { platformFilterSearch } from '@/shared/lib/platform-filters';
import { IngestionKeysPanel } from './ingestion-keys-panel';
import { TeamsPanel } from './teams-panel';
import { UsersPanel } from './users-panel';

const sections = [
  { path: 'users', title: 'admin.users', description: 'admin.manageUsersHelp', icon: Users },
  { path: 'teams', title: 'admin.teams', description: 'admin.manageTeamsHelp', icon: UsersRound },
  {
    path: 'ingestion-keys',
    title: 'admin.keys',
    description: 'admin.manageKeysHelp',
    icon: KeyRound,
  },
] as const;

function AdminOverview({ basePath, search }: { basePath: string; search: string }) {
  const { t } = useTranslation();
  return (
    <>
      <FeatureHeader title={t('admin.title')} description={t('admin.subtitle')} />
      <nav aria-label={t('admin.title')} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ path, title, description, icon: Icon }) => (
          <Link
            key={path}
            to={{ pathname: `${basePath}/${path}`, search }}
            className="group flex min-w-0 items-start gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-col"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-semibold">
                {t(title)}{' '}
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                {t(description)}
              </span>
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function AdminPage() {
  const { session } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [createdKey, setCreatedKey] = useState('');
  if (session?.role !== 'admin')
    return <Navigate to={session ? `/org/${session.tenantSlug}/metrics` : '/login'} replace />;

  const basePath = `/org/${session.tenantSlug}/admin`;
  const search = platformFilterSearch(location.search);
  const overview = location.pathname.replace(/\/$/, '') === basePath;

  return (
    <main>
      <FeaturePage>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {!overview && (
            <Link
              to={{ pathname: basePath, search }}
              className="inline-flex items-center gap-2 rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t('admin.title')}
            </Link>
          )}
          <span className="text-xs font-medium uppercase tracking-wide">
            {t('admin.organization', { name: session.tenantSlug })}
          </span>
        </div>
        <RouteErrorBoundary>
          <Routes>
            <Route index element={<AdminOverview basePath={basePath} search={search} />} />
            <Route path="users" element={<UsersPanel />} />
            <Route path="teams" element={<TeamsPanel />} />
            <Route
              path="ingestion-keys"
              element={<IngestionKeysPanel createdKey={createdKey} setCreatedKey={setCreatedKey} />}
            />
            <Route path="*" element={<Navigate to={{ pathname: basePath, search }} replace />} />
          </Routes>
        </RouteErrorBoundary>
      </FeaturePage>
    </main>
  );
}
