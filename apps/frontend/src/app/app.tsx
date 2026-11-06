import { RouteErrorBoundary } from '@/shared/components/route-error-boundary';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppSidebar, MobileAppSidebar } from '@/app/components/app-sidebar';
import { GlobalHeader } from '@/app/components/global-header';
import { ThemeProvider } from '@/app/components/theme-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { PageLayout } from '@/shared/components/page-layout';
import { ViewSkeleton } from '@/shared/components/view-skeleton';
import { ActiveTraceProvider } from '@/shared/hooks/use-active-trace';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { useTranslation } from 'react-i18next';

const TracesPage = lazy(() => import('@/features/traces'));
const LogsPage = lazy(() => import('@/features/logs'));
const ServicesPage = lazy(() => import('@/features/services'));
const ServiceDetailPage = lazy(() => import('@/features/services/service-detail-page'));
const MetricsPage = lazy(() => import('@/features/metrics'));
const MonitorsPage = lazy(() => import('@/features/monitors'));
const LoginPage = lazy(() => import('@/features/auth/login-page'));
const AdminPage = lazy(() => import('@/features/admin/admin-page'));
const InfrastructurePage = lazy(() => import('@/features/infrastructure/infrastructure-page'));

function AuthenticatedRoutes() {
  const { session, isLoading } = useAuth();
  const { tenant } = useParams();

  if (isLoading) return <ViewSkeleton showHeader />;
  if (!session) return <Navigate to="/login" replace />;
  if (tenant && tenant !== session.tenantSlug) {
    return <Navigate to={`/org/${session.tenantSlug}/metrics`} replace />;
  }

  return (
    <ActiveTraceProvider key={session.tenantSlug}>
      <SidebarProvider>
        <AppSidebar />
        <MobileAppSidebar />
        <SidebarInset className="h-dvh w-0 min-w-0 flex-1 overflow-hidden">
          <GlobalHeader />
          <div className="min-h-0 flex-1 overflow-auto">
            <RouteErrorBoundary>
              <Suspense
                fallback={
                  <PageLayout>
                    <ViewSkeleton showHeader />
                  </PageLayout>
                }
              >
                <Routes>
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="services/:serviceName" element={<ServiceDetailPage />} />
                  <Route path="metrics" element={<MetricsPage />} />
                  <Route path="logs" element={<LogsPage />} />
                  <Route path="traces" element={<TracesPage />} />
                  <Route path="monitors" element={<MonitorsPage />} />
                  <Route path="admin" element={<AdminPage />} />
                  <Route path="infrastructure" element={<InfrastructurePage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </RouteErrorBoundary>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ActiveTraceProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RouteErrorBoundary>
            <Suspense fallback={<ViewSkeleton />}>
              <LoginPage />
            </Suspense>
          </RouteErrorBoundary>
        }
      />
      <Route path="/org/:tenant/*" element={<AuthenticatedRoutes />} />
      <Route path="/" element={<EntryRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function EntryRedirect() {
  const { session, isLoading } = useAuth();
  if (isLoading) return <ViewSkeleton />;
  return <Navigate to={session ? `/org/${session.tenantSlug}/metrics` : '/login'} replace />;
}

function NotFound() {
  const { session, isLoading } = useAuth();
  const { t } = useTranslation();
  if (isLoading) return <ViewSkeleton />;
  return (
    <PageLayout>
      <h1 className="text-lg font-semibold">{t('error.routeNotFound')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('error.investigationLink')}</p>
      <Link
        className="mt-4 inline-block text-sm text-primary underline"
        to={session ? `/org/${session.tenantSlug}/metrics` : '/login'}
      >
        {session ? t('error.backMetrics') : t('error.backSignIn')}
      </Link>
    </PageLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="telemetry-hub-theme">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
