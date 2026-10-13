import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { AppSidebar, MobileAppSidebar } from "@/app/components/app-sidebar";
import { GlobalHeader } from "@/app/components/global-header";
import { ThemeProvider } from "@/app/components/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PageLayout } from "@/components/shared/page-layout";
import { ViewSkeleton } from "@/components/shared/view-skeleton";
import { ActiveTraceProvider } from "@/shared/hooks/use-active-trace";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { platformFilterKey } from "@/shared/lib/platform-filters";

const TracesPage = lazy(() => import("@/features/traces"));
const LogsPage = lazy(() => import("@/features/logs"));
const ServicesPage = lazy(() => import("@/features/services"));
const ServiceDetailPage = lazy(
  () => import("@/features/services/service-detail-page"),
);
const MetricsPage = lazy(() => import("@/features/metrics"));
const MonitorsPage = lazy(() => import("@/features/monitors"));
const LoginPage = lazy(() => import("@/features/auth/login-page"));
const AdminPage = lazy(() => import("@/features/admin/admin-page"));
const InfrastructurePage = lazy(
  () => import("@/features/infrastructure/infrastructure-page"),
);

function AuthenticatedRoutes() {
  const { session, isLoading } = useAuth();
  const { tenant } = useParams();
  const [filters] = useSearchParams();
  const filterKey = platformFilterKey(filters.toString());

  if (isLoading) return <ViewSkeleton showHeader />;
  if (!session) return <Navigate to="/login" replace />;
  if (tenant && tenant !== session.tenantSlug) {
    return <Navigate to={`/org/${session.tenantSlug}/metrics`} replace />;
  }

  return (
    <ActiveTraceProvider key={`${session.tenantSlug}:${filterKey}`}>
      <SidebarProvider>
        <AppSidebar />
        <MobileAppSidebar />
        <SidebarInset className="h-dvh w-0 min-w-0 flex-1 overflow-hidden">
          <GlobalHeader />
          <div key={filterKey} className="min-h-0 flex-1 overflow-auto">
            <Suspense
              fallback={
                <PageLayout>
                  <ViewSkeleton showHeader />
                </PageLayout>
              }
            >
              <Routes>
                <Route path="services" element={<ServicesPage />} />
                <Route
                  path="services/:serviceName"
                  element={<ServiceDetailPage />}
                />
                <Route path="metrics" element={<MetricsPage />} />
                <Route path="logs" element={<LogsPage />} />
                <Route path="traces" element={<TracesPage />} />
                <Route path="monitors" element={<MonitorsPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="infrastructure" element={<InfrastructurePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
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
          <Suspense fallback={<ViewSkeleton />}>
            <LoginPage />
          </Suspense>
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
  return (
    <Navigate
      to={session ? `/org/${session.tenantSlug}/metrics` : "/login"}
      replace
    />
  );
}

function NotFound() {
  const { session, isLoading } = useAuth();
  if (isLoading) return <ViewSkeleton />;
  return (
    <PageLayout>
      <h1 className="text-lg font-semibold">Route not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This investigation link does not match an available page.
      </p>
      <Link className="mt-4 inline-block text-sm text-primary underline"
        to={session ? `/org/${session.tenantSlug}/metrics` : "/login"}>
        {session ? "Back to Metrics" : "Back to sign in"}
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
