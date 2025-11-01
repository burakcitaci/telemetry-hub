import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import { ThemeProvider } from './components/theme-provider';
import { ModeToggle } from './components/mode-toggle';
import TracesView from './pages/TracesView';
import TraceDetailView from './pages/TraceDetailView';
import LogsView from './pages/LogsView';
import MetricsView from './pages/MetricsView';
import ServicesView from './pages/ServicesView';
import TasksView from './pages/TasksView';
import { Activity, FileText, Server, Menu, X, CheckSquare, BarChart3 } from 'lucide-react';

function Navigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Traces', icon: Activity },
    { path: '/logs', label: 'Logs', icon: FileText },
    { path: '/metrics', label: 'Metrics', icon: BarChart3 },
    { path: '/services', label: 'Services', icon: Server },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  ];

  return (
    <nav className="bg-background dark:bg-slate-950 border-b border-border dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-foreground dark:text-white">Telemetry Hub</span>
              </div>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.path === '/' && location.pathname.startsWith('/trace'));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors ${
                      isActive
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-gray-300 hover:border-border dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side: Theme toggle and Mobile menu button */}
          <div className="flex items-center gap-4">
            <ModeToggle />
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground dark:text-gray-500 hover:text-foreground dark:hover:text-gray-400 hover:bg-accent dark:hover:bg-slate-800"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.path === '/' && location.pathname.startsWith('/trace'));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`block pl-3 pr-4 py-2 text-base font-medium border-l-4 transition-colors ${
                      isActive
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-slate-900'
                        : 'border-transparent text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-gray-300 hover:bg-accent dark:hover:bg-slate-900'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-background dark:bg-slate-950">
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 bg-background dark:bg-slate-950">
        <Routes>
          <Route path="/" element={<TracesView />} />
          <Route path="/trace/:traceId" element={<TraceDetailView />} />
          <Route path="/logs" element={<LogsView />} />
          <Route path="/services" element={<ServicesView />} />
          <Route path="/metrics" element={<MetricsView />} />
          <Route path="/tasks" element={<TasksView />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
