import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import TracesView from './pages/TracesView';
import TraceDetailView from './pages/TraceDetailView';
import LogsView from './pages/LogsView';
import ServicesView from './pages/ServicesView';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>Observability Platform</h1>
          </div>
          <div className="nav-links">
            <Link to="/">Traces</Link>
            <Link to="/logs">Logs</Link>
            <Link to="/services">Services</Link>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<TracesView />} />
            <Route path="/trace/:traceId" element={<TraceDetailView />} />
            <Route path="/logs" element={<LogsView />} />
            <Route path="/services" element={<ServicesView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
