import { lazy, Suspense, useState } from 'react';
import {
  BrowserRouter as Router,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Activity, FileText, Menu, Server, X } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { ThemeProvider } from '@/components/theme-provider';

const TracesView = lazy(() => import('@/pages/TracesView'));
const LogsView = lazy(() => import('@/pages/LogsView'));
const ServicesView = lazy(() => import('@/pages/ServicesView'));

const navItems = [
  { path: '/', label: 'Traces', icon: Activity },
  { path: '/logs', label: 'Logs', icon: FileText },
  { path: '/services', label: 'Services', icon: Server },
];

function Navigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="shrink-0 border-b border-border bg-background shadow-sm">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex h-full items-center">
            <Link to="/" className="flex items-center gap-3" aria-label="Telemetry Hub traces">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
                <Activity className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-bold">Telemetry Hub</span>
            </Link>

            <div className="ml-8 hidden h-full items-center gap-7 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex h-full items-center border-b-2 text-sm font-medium transition-colors ${
                      active
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div id="mobile-navigation" className="space-y-1 border-t border-border py-2 md:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                    active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <Navigation />
      <main className="min-h-0 flex-1 overflow-auto">
        <Suspense fallback={(
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading view…
          </div>
        )}>
          <Routes>
            <Route path="/" element={<TracesView />} />
            <Route path="/logs" element={<LogsView />} />
            <Route path="/services" element={<ServicesView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="telemetry-hub-theme">
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
