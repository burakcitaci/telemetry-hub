import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import TracesView from './pages/TracesView';
import TraceDetailView from './pages/TraceDetailView';
import LogsView from './pages/LogsView';
import ServicesView from './pages/ServicesView';
import './App.css';

function Navigation() {
  const location = useLocation();

  const getActiveTab = () => {
    switch (location.pathname) {
      case '/logs':
        return 'logs';
      case '/services':
        return 'services';
      default:
        return 'traces';
    }
  };

  return (
    <Card className="mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Observability Platform</h1>
            <p className="text-muted-foreground">Real-time monitoring and tracing</p>
          </div>
        </div>

        <Tabs value={getActiveTab()} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="traces" asChild>
              <Link to="/" className="flex items-center gap-2">
                Traces
              </Link>
            </TabsTrigger>
            <TabsTrigger value="logs" asChild>
              <Link to="/logs" className="flex items-center gap-2">
                Logs
              </Link>
            </TabsTrigger>
            <TabsTrigger value="services" asChild>
              <Link to="/services" className="flex items-center gap-2">
                Services
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </Card>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Navigation />

          <main>
            <Routes>
              <Route path="/" element={<TracesView />} />
              <Route path="/trace/:traceId" element={<TraceDetailView />} />
              <Route path="/logs" element={<LogsView />} />
              <Route path="/services" element={<ServicesView />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
