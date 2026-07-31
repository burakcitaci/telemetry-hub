import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppSidebar, MobileAppSidebar } from '@/app/components/app-sidebar';
import { ThemeProvider } from '@/app/components/theme-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

const TracesPage = lazy(() => import('@/features/traces'));
const LogsPage = lazy(() => import('@/features/logs'));
const ServicesPage = lazy(() => import('@/features/services'));

function AppRoutes() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <MobileAppSidebar />
      <SidebarInset className="h-dvh w-0 min-w-0 flex-1 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
        <Suspense fallback={(
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading view…
          </div>
        )}>
          <Routes>
            <Route path="/" element={<TracesPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="telemetry-hub-theme">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
