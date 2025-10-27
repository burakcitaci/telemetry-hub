import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import TracesView from './pages/TracesView';
import TraceDetailView from './pages/TraceDetailView';
import LogsView from './pages/LogsView';
import ServicesView from './pages/ServicesView';
import TasksView from './pages/TasksView';
import { Activity, FileText, Server, Menu, X, CheckSquare } from 'lucide-react';

function Navigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'APM', icon: Activity },
    { path: '/logs', label: 'Logs', icon: FileText },
    { path: '/services', label: 'Services', icon: Server },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Telemetry Hub</span>
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
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
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
                        ? 'border-purple-500 text-purple-600 bg-purple-50'
                        : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<TracesView />} />
            <Route path="/trace/:traceId" element={<TraceDetailView />} />
            <Route path="/logs" element={<LogsView />} />
            <Route path="/services" element={<ServicesView />} />
            <Route path="/tasks" element={<TasksView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
